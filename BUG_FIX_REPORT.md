# VriSaa Café bug fix report

The changes are local and ready for review. Production data, Supabase settings, the deployed Edge Function, Vercel, and GitHub were left untouched.

## Original issues

| # | Issue | Implementation |
| --- | --- | --- |
| 1 | Reservation submission | A restricted RPC inserts a pending reservation, generates the UUID in PostgreSQL, and returns the booking reference. Anonymous callers have no reservation table access. |
| 2 | Booking tracking | Requires the reference and the booking mobile number. Returns date, time, party size, and status. Older UUIDs and legacy ten-digit numbers are supported. |
| 3 | Staff access | Adds the role column, preserves existing roles, backfills roleless staff to admin, and scopes staff lookups to the signed-in user's own record. Staff management verifies the super-admin role on the server. |
| 4 | Past bookings | The form's date and time minimums and the server's insert validation use Asia/Kolkata. Existing bookings are kept and can be updated by staff after their dates have passed. |
| 5 | Duplicate submissions and confirmations | A random key is reused for identical details in the same browser tab, including after refresh. The database serializes requests for the same key and returns the original UUID. Status updates compare and change the prior status in one write, with database-enforced transitions. |
| 6 | Experience navigation | Removed the link and its unused animation rule from the shared navigation. |
| 7 | Mobile scroll lock | The breakpoint, Escape key, and effect cleanup all release the mobile scroll lock. |
| 8 | Keyboard accessibility | Added themed focus indicators, keyboard traversal within the open mobile menu, and Escape focus restoration. |
| 9 | Indian mobile numbers | Booking and WhatsApp use a shared validator. The server independently validates Indian mobile numbers and stores ten digits. Existing invalid numbers receive a readable error in the WhatsApp action. |
| 10 | Admin pagination | Uses a database query for pages of 25, 50, or 100. Search, date, status, and matching counts use the full dataset. Summary cards show global totals. |
| 11 | Staff invitations | Records each invite before calling Auth, leases the send attempt, and can finish a partially completed invite on retry. Existing Auth accounts are preserved. |
| 12 | Password recovery | Waits for Auth initialization and a recovery event, or verifies a recovery token hash directly. Cleans up its listener and refuses a password change if the active user no longer matches the recovery session. |
| 13 | 404 handling | Known admin paths are explicitly rewritten to the app. Vite builds a themed static 404, and the React route handler provides the same page for unknown paths on SPA fallback hosts. |

## Files

| Area | Files |
| --- | --- |
| Navigation and routes | `src/components/Navbar.jsx`, `src/components/Navbar.css`, `src/pages/Home.jsx`, `404.html`, `src/styles/not-found.css`, `vite.config.js`, `vercel.json` |
| Reservations and styles | `src/lib/reservations.js`, `src/sections/Booking.jsx`, `src/sections/TrackBooking.jsx`, `src/sections/Admin.jsx`, `src/sections/Admin.css`, `src/sections/Contact.css`, `src/styles/global.css` |
| Recovery and staff | `src/lib/recovery.js`, `src/lib/supabase.js`, `src/sections/ResetPassword.jsx`, `supabase/functions/manage-staff/index.ts` |
| Database | `supabase-schema.sql`, `supabase/migrations/20261128134951_cafe_readiness.sql` |
| Tests | `package.json`, `tests/readiness.test.js`, `tests/reservations.integration.sql`, `tests/supabase-cloud.test.js`, `tests/browser.test.js`, `tests/edge-staff.test.js`, `tests/postgres.test.js` |
| Report | `BUG_FIX_REPORT.md` |

## Supabase Cloud staging

Use a separate Supabase Cloud project containing only test data. Use a separate Vercel test project or an isolated preview with staging environment variables. Confirm the staging project reference and Vercel origin before running SQL, setting secrets, or deploying a preview.

1. **Rehearse the upgrade.** In the new Supabase project's SQL Editor, run the legacy schema from the pre-fix commit. Use the command below to print the legacy SQL. Add a few disposable reservations and staff records representative of your existing schema. If the live schema already has a role column, reproduce its column type and role values in the test project. Run the incremental migration in the same staging project's SQL Editor. Confirm that existing references, roles, and reservations are preserved. If you also want to validate the fresh-install workflow on Cloud, run [supabase-schema.sql](supabase-schema.sql) in a separate empty test project.

```powershell
git show 57bbed57d91ab9f2dc002062e67b35075947f9fa:supabase-schema.sql
```

2. **Create test users.** In staging Auth, create three confirmed test users for owner, staff, and outsider. Add the known Auth UUIDs of the owner and staff users to the staff table. The outsider needs only an Auth account.

```sql
INSERT INTO public.admin_users (user_id, role) VALUES
  ('<staging-owner-auth-uuid>', 'super_admin'),
  ('<staging-staff-auth-uuid>', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
```

3. **Configure the staging site.** Set the staging Auth Site URL to the exact staging HTTPS origin. Allow the same origin with `/admin/setup` and `/admin/reset-password` in Auth Redirect URLs. Use test inboxes and configure staging SMTP if needed. Supabase's default mail service has restrictions on external recipients. [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
4. **Deploy the staging Edge Function once approved.** Use the project ref explicitly. The function authenticates each POST through Supabase Auth's `getUser` and then checks the caller's database role. The deployment flag leaves token verification to this handler so it can accept current Supabase Auth signing keys. All staff service RPCs enforce the caller's role again before granting or removing access. [Securing Supabase Edge Functions](https://supabase.com/docs/guides/functions/auth)

```powershell
$stagingRef = 'your-staging-project-ref'
$stagingOrigin = 'https://your-staging-site.example'
npx supabase secrets set "--remote=$stagingRef" "SITE_URL=$stagingOrigin"
npx supabase functions deploy manage-staff "--remote=$stagingRef" --use-api --no-verify-jwt
```

5. **Configure the staging frontend.** Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the staging project URL and public key. Use the Vite preset, Node.js 24.x, build command `npm run build`, and output directory `dist`. If Vercel requires sign-in for previews, open the preview with an authorized browser session for manual checks. [Vercel project configuration](https://vercel.com/docs/project-configuration/vercel-json)
6. **Run staging tests.** Paste [the rollback-only SQL suite](tests/reservations.integration.sql) into the staging SQL Editor and run it as the project database owner. From the repo, set `TEST_SUPABASE_STAGING_REF`, `TEST_SUPABASE_URL`, and `TEST_SUPABASE_ANON_KEY` to staging values. Set `TEST_OWNER_EMAIL`, `TEST_OWNER_PASSWORD`, `TEST_STAFF_EMAIL`, `TEST_STAFF_PASSWORD`, `TEST_OUTSIDER_EMAIL`, and `TEST_OUTSIDER_PASSWORD` for the three test users. Keep passwords out of tracked files and terminal history, and run `node --test tests/supabase-cloud.test.js`. The test writes one disposable staging reservation. For browser automation, point `TEST_CAFE_URL` at the staging preview and run `node --test tests/browser.test.js` with Playwright and Chromium available.
7. **Verify email delivery and Vercel routing.** Invite a new test user and have them set their password. Retry the same invitation and confirm there is one staff record. Request password recovery, test a valid link, then verify that the reused or expired link is rejected. Sign in on the dashboard as owner, staff, and outsider. Refresh each valid admin URL directly and verify an unknown URL returns HTTP 404. [Supabase password-based authentication](https://supabase.com/docs/guides/auth/passwords) · [Vercel custom error pages](https://vercel.com/docs/custom-error-pages)

## GitHub review and production rollout

1. **Review locally.** Run `git status --short`, `git diff --check`, and `git diff`. Inspect the untracked files listed in this report as well. Stage the reviewed files and use `git diff --cached` to confirm the commit excludes `.env*`, database dumps, passwords, tokens, and CLI state.
2. **Create and push a review branch only after approval.** Confirm the GitHub remote and Vercel preview settings first. A branch push may trigger a preview if the repository is connected. Keep preview environment variables scoped to the staging project.

```powershell
git switch -c codex/cafe-readiness
git add -- 404.html BUG_FIX_REPORT.md package.json src supabase-schema.sql supabase/functions/manage-staff/index.ts supabase/migrations/20261128134951_cafe_readiness.sql tests vercel.json vite.config.js
git diff --cached --check
git diff --cached --stat
git commit -m "Fix cafe reservations and staff workflows"
git push -u origin codex/cafe-readiness
```

3. **Verify staging and obtain production approval before merging or promoting.** Identify the Vercel production branch. A merge into that branch can publish automatically. Confirm backups or point-in-time recovery are available, record the currently deployed frontend and Edge Function revisions, and agree on a rollout window. Older bundles use the old database endpoints, so schedule the database, function, and frontend updates close together.
4. **Check production schema and migration history.** In the production SQL Editor, compare table columns, defaults, constraints and policies against staging. In particular, review any custom policies on `public.admin_users` and `public.reservations`, any older tracking overloads, any extra date checks, and unexpected role values. The migration replaces policies on those two application tables and removes the named legacy date constraint. Record reservation counts and staff counts without exporting customer data. Review the remote migration plan first. Stop if it lists unexpected migrations or reports a history mismatch.

```powershell
$productionRef = 'your-approved-production-project-ref'
npx supabase db push "--remote=$productionRef" --skip-vault --dry-run
```

5. **Apply the reviewed migration on approval.** Use the same verified project reference for the actual push and follow the CLI confirmation. Compare post-migration counts, verify an existing booking reference in a permitted session, and confirm the known owner has a `super_admin` row. If the prior staff schema had no assigned roles, nominate the verified owner explicitly using the staging role SQL shown above with their real Auth UUID only.

```powershell
npx supabase db push "--remote=$productionRef" --skip-vault
```

6. **Deploy the approved production Edge Function.** Confirm the HTTPS origin and production Auth redirect URLs. Keep the function's Supabase Auth token verification and role checks in place.

```powershell
$productionOrigin = 'https://vrisaa.vercel.app'
npx supabase secrets set "--remote=$productionRef" "SITE_URL=$productionOrigin"
npx supabase functions deploy manage-staff "--remote=$productionRef" --use-api --no-verify-jwt
```

7. **Publish the approved frontend.** Check the Vercel Production environment variables reference production Supabase before merging the approved pull request or promoting the intended build. Do not promote a staging build with the staging URL baked in. Verify direct admin routes, HTTP 404, owner login and staff access. Check booking, tracking, and email end-to-end with a designated test record only if separately approved for production. If rollout fails, coordinate a compatible rollback of the database interface, frontend, and Edge Function. Restoring a database backup can lose writes made after that backup, so review any recovery plan before acting.

## Environment variables

| Where | Variable | Purpose |
| --- | --- | --- |
| Vite and Vercel | `VITE_SUPABASE_URL` | Project URL for the current environment |
| Vite and Vercel | `VITE_SUPABASE_ANON_KEY` | Public publishable key or legacy anon key for that project |
| Edge Function | `SITE_URL` | Exact browser origin and invitation redirect origin |
| Edge runtime | `SUPABASE_URL`, `SUPABASE_SECRET_KEYS` or `SUPABASE_SERVICE_ROLE_KEY` | Supabase-provided server configuration. The function prefers the default secret key and falls back to the legacy service-role key. Keep both server-side. |

## Verification

- With both test runtimes supplied, `npm test` passed 13 tests, failed zero, and skipped the one hosted Supabase suite. The Node tests verified booking utilities, recovery, routing, schema consistency, staff authorization, and retry behavior after a simulated invitation failure. Headless Chrome verified mobile resizing, Escape handling, visible keyboard focus, and the unknown-route page with Supabase and external requests disabled.
- PostgreSQL verification ran through PGlite 0.3.14 in memory. The fresh schema passed [the rollback-only SQL suite](tests/reservations.integration.sql). The actual incremental migration also passed that suite after being applied twice to a fixture derived from the pre-fix schema. The checks confirmed that historical reservations still track, existing roles remain assigned, roleless staff become admins, old tracking permissions are removed, anonymous data access is limited, and pagination covers more than 200 bookings. The PostgreSQL runtime used local shims for Supabase Auth tables and roles. [PGlite documentation](https://pglite.dev/docs/)
- The production build emitted the frontend and `dist/404.html`. The configured frontend Supabase key was verified to be public, and no server-key markers were found in the production JavaScript. The installed Node 20.18.0 is below Vite's supported minimum. The repository has no lint script.
- Hosted integration remains unverified. This includes actual Supabase Cloud migration history and API grants, concurrent requests through PostgREST, the deployed Edge Function's JWT and CORS behavior, live invitation and recovery delivery, and Vercel direct-route and HTTP 404 behavior. No cloud deployment or Git push was performed.

To repeat the non-hosted checks, run `npm test`. Set `TEST_PGLITE_MODULE` to the absolute path of PGlite 0.3.14's `dist/index.js` for PostgreSQL tests. Set `TEST_PLAYWRIGHT_MODULE` to Playwright Core 1.56.1's `index.mjs` and `TEST_CHROMIUM_EXECUTABLE` to an installed Chrome or Chromium binary for the local browser test. The browser needs loopback access. Both runtimes can live outside the repository.

## Security review

- Anonymous callers can create pending requests through the submission RPC and track only a matching UUID and phone number. Fixed SQL and restricted grants prevent arbitrary queries through these RPCs.
- Staff queries use RLS. Authenticated staff can change only the reservation status column, and the database enforces allowed status transitions. The staff management handler verifies the caller's token, checks the caller's database role, and keeps its server key out of browser code.
- Existing duplicates are retained. Deduplication covers an identical booking attempt in the same browser tab, and WhatsApp sends remain manual. Tracking depends on keeping booking references private. Monitor public RPC utilization and consider environment-level abuse controls if usage warrants it.
- Invitation retries use the same email and role. A previously existing account or a removed staff membership requires separate owner review. Measure migration index build times and exact-count query performance with representative staging data before production rollout.
