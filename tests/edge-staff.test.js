import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { transformWithEsbuild } from "vite";

const path = "supabase/functions/manage-staff/index.ts";

async function edgeFunction(service) {
  const source = readFileSync(path, "utf8").replace(/^import .*;\r?\n/gm, "");
  const { code } = await transformWithEsbuild(source, path, { loader: "ts" });
  let handle;
  runInNewContext(code, {
    URL, Response, console,
    Deno: { env: { get: (name) => ({ SITE_URL: "https://cafe.example", SUPABASE_URL: "https://stage.example", SUPABASE_SECRET_KEYS: '{"default":"mock"}' })[name] } },
    createClient: () => service,
    serve: (callback) => { handle = callback; },
  });
  return (body, authorization) => handle(new Request("https://stage.example/manage-staff", {
    method: "POST",
    headers: authorization ? { Authorization: authorization } : {},
    body: JSON.stringify(body),
  }));
}

test("Edge Function verifies the caller and role before any invitation", async () => {
  const reads = [];
  const handle = await edgeFunction({
    auth: { getUser(token) {
      reads.push(token);
      return token === "staff-token" ? { data: { user: { id: "staff" } } } : { data: {}, error: {} };
    } },
    from(table) {
      assert.equal(table, "admin_users");
      return { select: () => ({ eq: () => ({ single: () => ({ data: { role: "admin" } }) }) }) };
    },
  });
  const body = { action: "invite", email: "test@example.invalid", role: "admin" };
  assert.equal((await handle(body)).status, 401);
  assert.equal((await handle(body, "Basic dummy")).status, 401);
  assert.equal((await handle(body, "Bearer invalid")).status, 401);
  assert.equal((await handle(body, "Bearer staff-token")).status, 403);
  assert.deepEqual(reads, ["invalid", "staff-token"]);
});

test("Edge retry recovers authorization without sending another invitation email", async () => {
  let invited = false;
  let claimed = false;
  let finishes = 0;
  let sends = 0;
  const handle = await edgeFunction({
    auth: {
      getUser: () => ({ data: { user: { id: "owner" } } }),
      admin: {
        inviteUserByEmail(email, options) {
          assert.equal(email, "test@example.invalid");
          assert.equal(options.redirectTo, "https://cafe.example/admin/setup");
          sends += 1;
          invited = true;
          // The Auth send committed, but the Edge invocation lost its response.
          throw { code: "connection_lost" };
        },
      },
    },
    from(table) {
      if (table === "admin_users") {
        return { select: () => ({ eq: () => ({ single: () => ({ data: { role: "super_admin" } }) }) }) };
      }
      assert.equal(table, "cafe_staff_invitations");
      return {
        upsert: () => ({ error: null }),
        select: () => ({ eq: () => ({ single: () => ({ data: { role: "admin", marker: "fixture-marker" } }) }) }),
      };
    },
    rpc(name) {
      if (name === "cafe_claim_staff_invite") {
        assert.equal(claimed, false);
        claimed = true;
        return { data: "claimed" };
      }
      assert.equal(name, "cafe_finish_staff_invite");
      finishes += 1;
      return { data: invited ? "complete" : "pending" };
    },
  });
  const body = { action: "invite", email: "Test@Example.Invalid", role: "admin" };
  assert.equal((await handle(body, "Bearer owner-token")).status, 500);
  assert.equal((await handle(body, "Bearer owner-token")).status, 200);
  assert.equal(sends, 1);
  assert.equal(finishes, 2);
});
