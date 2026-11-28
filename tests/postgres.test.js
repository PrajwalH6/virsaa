import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

const runtime = process.env.TEST_PGLITE_MODULE;
const baseline = "57bbed57d91ab9f2dc002062e67b35075947f9fa";
const path = "supabase/migrations/20261128134951_cafe_readiness.sql";
const integration = readFileSync("tests/reservations.integration.sql", "utf8");

async function database() {
  const { PGlite } = await import(pathToFileURL(runtime).href);
  const db = new PGlite();
  // Minimal Supabase platform objects. The app schema, migration and queries are run unchanged.
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (
      id uuid PRIMARY KEY, email text, created_at timestamptz,
      invited_at timestamptz, raw_user_meta_data jsonb
    );
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
  `);
  return db;
}

test("fresh schema passes rollback-only PostgreSQL integration assertions", { skip: !runtime }, async () => {
  const db = await database();
  try {
    await db.exec(readFileSync("supabase-schema.sql", "utf8"));
    await db.exec(integration);
    const result = await db.query("SELECT count(*)::integer AS total FROM public.reservations");
    assert.equal(result.rows[0].total, 0);
  } finally {
    await db.close();
  }
});

test("incremental migration preserves legacy reservations and staff roles", { skip: !runtime }, async () => {
  const db = await database();
  try {
    const legacy = execFileSync("git", ["show", baseline + ":supabase-schema.sql"], { encoding: "utf8" });
    // PGlite has gen_random_uuid() in core PostgreSQL. The legacy extension is only used for this UUID default.
    await db.exec(legacy.replace("CREATE EXTENSION IF NOT EXISTS pgcrypto;", ""));
    await db.exec(`
      INSERT INTO auth.users (id) VALUES
        ('6b3f734c-0000-4000-8000-000000000001'),
        ('6b3f734c-0000-4000-8000-000000000002');
      ALTER TABLE public.admin_users ADD COLUMN role text;
      INSERT INTO public.admin_users (user_id, role) VALUES
        ('6b3f734c-0000-4000-8000-000000000001', 'super_admin'),
        ('6b3f734c-0000-4000-8000-000000000002', NULL);
      ALTER TABLE public.reservations DROP CONSTRAINT reservations_booking_date_check;
      INSERT INTO public.reservations (id, customer_name, phone, booking_date, booking_time, guests)
      VALUES ('6b3f734c-0000-4000-8000-000000000003', 'Historical fixture', '5123456789', DATE '2020-01-01', TIME '12:00', 2);
      ALTER TABLE public.reservations ADD CONSTRAINT reservations_booking_date_check
        CHECK (booking_date >= CURRENT_DATE) NOT VALID;
      CREATE FUNCTION public.track_reservation(uuid) RETURNS boolean
        LANGUAGE sql AS $$ SELECT true $$;
      GRANT EXECUTE ON FUNCTION public.track_reservation(uuid) TO anon;
    `);
    const migration = readFileSync(path, "utf8");
    await db.exec(migration);
    await db.exec(migration);
    await db.exec(integration);
    const staff = await db.query("SELECT role FROM public.admin_users ORDER BY user_id");
    assert.deepEqual(staff.rows.map((row) => row.role), ["super_admin", "admin"]);

    const { rows } = await db.query(`
      SELECT has_function_privilege('anon', 'public.track_reservation(uuid)', 'EXECUTE') AS legacy_access,
             (SELECT status FROM public.track_reservation('6b3f734c-0000-4000-8000-000000000003', '5123456789')) AS status
    `);
    assert.deepEqual(rows, [{ legacy_access: false, status: "pending" }]);
    await db.exec("UPDATE public.reservations SET status = 'confirmed' WHERE booking_date = DATE '2020-01-01'");
  } finally {
    await db.close();
  }
});
