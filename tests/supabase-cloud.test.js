import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { cafeDateTime } from "../src/lib/reservations.js";

const env = process.env;
const projectRef = env.TEST_SUPABASE_STAGING_REF;

test("Supabase Cloud staging auth, Edge roles and concurrent booking writes", { skip: !projectRef }, async () => {
  assert.match(projectRef, /^[a-z0-9]{20}$/, "Set the reference of a separate staging project.");
  const url = "https://" + projectRef + ".supabase.co";
  assert.equal(env.TEST_SUPABASE_URL, url, "Both staging project settings must identify the same project.");
  assert.ok(env.TEST_SUPABASE_ANON_KEY, "Set the staging project's public API key.");
  const client = () => createClient(url, env.TEST_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  async function login(account) {
    const app = client();
    const email = env[`TEST_${account}_EMAIL`];
    const password = env[`TEST_${account}_PASSWORD`];
    assert.ok(email && password, `Configure the ${account} test account.`);
    const { error } = await app.auth.signInWithPassword({ email, password });
    assert.ifError(error);
    return app;
  }

  const [owner, staff, outsider] = await Promise.all([
    login("OWNER"), login("STAFF"), login("OUTSIDER"),
  ]);
  for (const [app, expected] of [[owner, "super_admin"], [staff, "admin"], [outsider, undefined]]) {
    const { data, error } = await app.from("admin_users").select("role").maybeSingle();
    assert.ifError(error);
    assert.equal(data?.role, expected);
  }
  const dashboard = await outsider.rpc("cafe_reservation_page", { p_page: 1, p_size: 25 });
  assert.equal(dashboard.error?.code, "42501");
  const anonymous = await client().functions.invoke("manage-staff", { body: { action: "list" } });
  assert.equal(anonymous.error?.context?.status, 401);
  const forbidden = await staff.functions.invoke("manage-staff", { body: { action: "list" } });
  assert.equal(forbidden.error?.context?.status, 403);
  const allowed = await owner.functions.invoke("manage-staff", { body: { action: "list" } });
  assert.ifError(allowed.error);

  const details = {
    p_key: randomUUID(),
    p_name: "Cloud staging integration fixture",
    p_phone: "9123456789",
    p_date: cafeDateTime(Date.now() + 86_400_000).date,
    p_time: "12:00",
    p_guests: 2,
  };
  const [created, retried] = await Promise.all([
    client().rpc("submit_reservation", details),
    client().rpc("submit_reservation", details),
  ]);
  assert.ifError(created.error);
  assert.ifError(retried.error);
  assert.ok(created.data);
  assert.equal(created.data, retried.data);

  const lookup = { p_booking_id: created.data, p_phone: details.p_phone };
  const before = await client().rpc("track_reservation", lookup);
  assert.ifError(before.error);
  assert.deepEqual(before.data, [{
    booking_date: details.p_date, booking_time: "12:00:00", guests: 2, status: "pending",
  }]);
  const noMatch = await client().rpc("track_reservation", { ...lookup, p_phone: "9123456790" });
  assert.ifError(noMatch.error);
  assert.deepEqual(noMatch.data, []);

  const confirmations = await Promise.all([owner, staff].map((app) =>
    app.from("reservations").update({ status: "confirmed" })
      .eq("id", created.data).eq("status", "pending").select("id")
  ));
  confirmations.forEach(({ error }) => assert.ifError(error));
  assert.equal(confirmations.reduce((total, { data }) => total + data.length, 0), 1);
  const after = await client().rpc("track_reservation", lookup);
  assert.ifError(after.error);
  assert.equal(after.data[0]?.status, "confirmed");
});
