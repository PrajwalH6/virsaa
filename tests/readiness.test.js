import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { webcrypto } from "node:crypto";
import { test } from "node:test";
import { cafeDateTime, isFutureBooking, normalizeIndianMobile, reservationAttempt, trackingPhone } from "../src/lib/reservations.js";
import { cafeDirections } from "../src/lib/cafeLocation.js";
import { verifyRecovery } from "../src/lib/recovery.js";

globalThis.crypto ??= webcrypto;

test("booking and WhatsApp share Indian mobile validation", () => {
  for (const digit of [6, 7, 8, 9]) {
    const number = `${digit}123456789`;
    assert.equal(normalizeIndianMobile(number), number);
    assert.equal(normalizeIndianMobile(` +91${number} `), number);
  }
  for (const number of ["5123456789", "91234", "+229123456789", "9123456789x"]) {
    assert.equal(normalizeIndianMobile(number), null);
  }
  assert.equal(trackingPhone("+915123456789"), "5123456789");
  assert.equal(trackingPhone("bad"), null);
});

test("booking time is evaluated in Kolkata, including midnight", () => {
  const beforeMidnight = new Date("2026-01-01T18:29:59Z");
  const midnight = new Date("2026-01-01T18:30:00Z");
  assert.deepEqual(cafeDateTime(beforeMidnight), { date: "2026-01-01", time: "23:59" });
  assert.deepEqual(cafeDateTime(midnight), { date: "2026-01-02", time: "00:00" });
  assert.equal(isFutureBooking("2026-01-01", "23:59", beforeMidnight), false);
  assert.equal(isFutureBooking("2026-01-01", "23:59", midnight), false);
  assert.equal(isFutureBooking("2026-01-02", "00:01", midnight), true);
});

test("a lost response and reload reuse the booking key for the same request", async () => {
  const data = new Map();
  const storage = { getItem: (key) => data.get(key), setItem: (key, value) => data.set(key, value) };
  const request = { p_name: "Example Guest", p_guests: 2 };
  assert.equal((await reservationAttempt(request, storage, false)).key, null);
  const [initial, repeated] = await Promise.all([
    reservationAttempt(request, storage),
    reservationAttempt(request, storage),
  ]);
  assert.equal(initial.key, repeated.key);
  assert.deepEqual(await reservationAttempt({ ...request }, { ...storage }, false), { key: initial.key, retry: true });
  assert.notEqual((await reservationAttempt({ ...request, p_guests: 3 }, storage)).key, initial.key);
  assert.equal(JSON.stringify([...data]).includes("Example Guest"), false);
});

const reset = "https://test.example/admin/reset-password";

test("recovery waits for its event and unsubscribes", async () => {
  let callback;
  let subscribed = false;
  const auth = {
    onAuthStateChange(listener) {
      callback = listener;
      subscribed = true;
      return { data: { subscription: { unsubscribe() { subscribed = false; } } } };
    },
    async initialize() {
      setTimeout(() => callback("PASSWORD_RECOVERY", { user: { id: "staff" } }), 10);
      return { error: null };
    },
  };
  const session = await verifyRecovery(auth, reset + "#type=recovery&access_token=stub");
  assert.equal(session.user.id, "staff");
  assert.equal(subscribed, false);
});

test("recovery accepts verified email tokens and rejects ordinary sessions and expired links", async () => {
  const auth = {
    onAuthStateChange(callback) {
      callback("SIGNED_IN", { user: { id: "ordinary" } });
      return { data: { subscription: { unsubscribe() {} } } };
    },
    async initialize() { return {}; },
    async verifyOtp(input) {
      if (input.token_hash === "expired") return { error: true };
      return { data: { session: { user: { id: "staff" } } } };
    },
  };
  const verified = await verifyRecovery(auth, reset + "?type=recovery&token_hash=valid");
  assert.equal(verified.user.id, "staff");
  await assert.rejects(verifyRecovery(auth, reset + "?type=recovery&token_hash=expired"), /invalid or expired/);
  await assert.rejects(verifyRecovery(auth, reset + "?code=regular", { timeoutMs: 5 }), /invalid or expired/);
  await assert.rejects(verifyRecovery(auth, reset), /Open the password recovery link/);
});

test("leaving the reset page immediately releases the recovery listener", async () => {
  const controller = new AbortController();
  let unsubscribeCount = 0;
  const auth = {
    onAuthStateChange() {
      return { data: { subscription: { unsubscribe() { unsubscribeCount += 1; } } } };
    },
    async initialize() { return {}; },
  };
  const verification = verifyRecovery(auth, reset + "?code=stub", { signal: controller.signal });
  controller.abort();
  assert.equal(unsubscribeCount, 1);
  await assert.rejects(verification);
});

test("Vercel routes only known admin pages to the app and a themed 404 exists", () => {
  const config = JSON.parse(readFileSync("vercel.json", "utf8"));
  assert.deepEqual(config.rewrites.map(({ source }) => source), [
    "/admin", "/admin/setup", "/admin/reset-password",
  ]);
  assert.match(readFileSync("404.html", "utf8"), /href="\/"[^>]*>Return to Homepage/);
  for (const directory of ["src/components", "src/pages", "src/sections"]) {
    for (const file of readdirSync(directory)) {
      assert.doesNotMatch(readFileSync(`${directory}/${file}`, "utf8"), /#experience\b/i);
    }
  }
});

test("the fresh schema includes the reviewed migration verbatim", () => {
  const schema = readFileSync("supabase-schema.sql", "utf8");
  const files = readdirSync("supabase/migrations");
  const migration = readFileSync("supabase/migrations/" + files.find((file) => file.endsWith("_cafe_readiness.sql")), "utf8");
  assert.ok(schema.endsWith(migration));
});

test("directions and public URL use the existing café address and domain", () => {
  const link = new URL(cafeDirections);
  assert.equal(link.origin + link.pathname, "https://www.google.com/maps/dir/");
  assert.equal(link.searchParams.get("api"), "1");
  assert.equal(link.searchParams.get("destination"),
    "VriSaa Naturals Pvt Ltd, C-204, 2nd Floor, Soundarya Kamakshi, Magadi Main Road, Kamakshipalya, Bengaluru, Karnataka 560079");
  const config = JSON.parse(readFileSync("package.json", "utf8"));
  assert.equal(config.homepage, "https://vrisaa.vercel.app");
  assert.equal(config.engines.node, "24.x");
});

test("production headers allow required assets and connections without permitting external scripts", () => {
  const config = JSON.parse(readFileSync("vercel.json", "utf8"));
  const headers = Object.fromEntries(config.headers[0].headers.map(({ key, value }) => [key, value]));
  const csp = Object.fromEntries(headers["Content-Security-Policy"].split(";").map((rule) => {
    const [name, ...sources] = rule.trim().split(/\s+/);
    return [name, sources];
  }));
  assert.deepEqual(csp["script-src"], ["'self'"]);
  assert.deepEqual(csp["frame-ancestors"], ["'none'"]);
  assert.deepEqual(csp["object-src"], ["'none'"]);
  for (const [directive, host] of [
    ["connect-src", "https://*.supabase.co"],
    ["connect-src", "https://formspree.io"],
    ["img-src", "https://images.unsplash.com"],
    ["font-src", "https://fonts.gstatic.com"],
    ["style-src", "https://fonts.googleapis.com"],
  ]) {
    assert.ok(csp[directive].includes(host));
  }
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
});
