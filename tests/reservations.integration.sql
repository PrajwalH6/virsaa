-- Run as postgres against a disposable Supabase database after applying the schema.
-- All fixtures are rolled back. This script uses the role policies directly.
BEGIN;

CREATE TEMP TABLE cafe_test_booking (id uuid NOT NULL);
GRANT SELECT, INSERT ON cafe_test_booking TO anon, authenticated;
SET LOCAL ROLE anon;
DO $$
DECLARE
  attempt uuid := gen_random_uuid();
  cafe_now timestamp := clock_timestamp() AT TIME ZONE 'Asia/Kolkata';
  tomorrow date := cafe_now::date + 1;
  first_id uuid;
  retry_id uuid;
  found_count integer;
BEGIN
  first_id := public.submit_reservation(attempt, 'Fixture Guest', '+919123456789', tomorrow, '12:00', 2);
  retry_id := public.submit_reservation(attempt, 'Fixture Guest', '9123456789', tomorrow, '12:00', 2);
  IF first_id IS NULL OR first_id IS DISTINCT FROM retry_id THEN
    RAISE EXCEPTION 'A retried booking did not return the original reference';
  END IF;
  INSERT INTO pg_temp.cafe_test_booking VALUES (first_id);

  SELECT count(*) INTO found_count FROM public.track_reservation(first_id, '9123456789')
    WHERE status = 'pending' AND booking_date = tomorrow AND guests = 2;
  IF found_count <> 1 THEN RAISE EXCEPTION 'Valid booking could not be tracked'; END IF;
  IF EXISTS (SELECT 1 FROM public.track_reservation(first_id, '9123456790')) THEN
    RAISE EXCEPTION 'Phone verification did not protect a matching reference';
  END IF;
  IF EXISTS (SELECT 1 FROM public.track_reservation(gen_random_uuid(), '9123456789')) THEN
    RAISE EXCEPTION 'Unknown reference returned data';
  END IF;

  BEGIN
    PERFORM public.submit_reservation(attempt, 'Fixture Guest', '9123456789', tomorrow, '12:00', 3);
    RAISE EXCEPTION 'Changed details reused the booking attempt';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  BEGIN
    PERFORM public.submit_reservation(gen_random_uuid(), 'Fixture Guest', '5123456789', tomorrow, '12:00', 2);
    RAISE EXCEPTION 'Invalid phone accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  BEGIN
    PERFORM public.submit_reservation(gen_random_uuid(), 'Fixture Guest', '9123456789', tomorrow - 2, '12:00', 2);
    RAISE EXCEPTION 'Past date accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  BEGIN
    PERFORM public.submit_reservation(gen_random_uuid(), 'Fixture Guest', '9123456789', cafe_now::date, cafe_now::time, 2);
    RAISE EXCEPTION 'Past time accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  BEGIN
    PERFORM id FROM public.reservations LIMIT 1;
    RAISE EXCEPTION 'Anonymous table access allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

RESET ROLE;

INSERT INTO auth.users (id, email) VALUES
  ('cf0d44d6-31d0-424d-aeb6-48fe0851947a', 'cafe-test-staff@example.invalid'),
  ('cf0d44d6-31d0-424d-aeb6-48fe0851947b', 'cafe-test-outsider@example.invalid'),
  ('cf0d44d6-31d0-424d-aeb6-48fe0851947c', 'cafe-test-owner@example.invalid');
INSERT INTO public.admin_users (user_id, role) VALUES
  ('cf0d44d6-31d0-424d-aeb6-48fe0851947a', 'admin'),
  ('cf0d44d6-31d0-424d-aeb6-48fe0851947c', 'super_admin');

INSERT INTO public.reservations (customer_name, phone, booking_date, booking_time, guests)
SELECT 'Café pagination fixture ' || i, '9123456789',
  (clock_timestamp() AT TIME ZONE 'Asia/Kolkata')::date + 1, '12:00', 2
FROM generate_series(1, 205) i;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'cf0d44d6-31d0-424d-aeb6-48fe0851947b', true);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.reservations) THEN RAISE EXCEPTION 'Outsider read reservations'; END IF;
  IF EXISTS (SELECT 1 FROM public.admin_users) THEN RAISE EXCEPTION 'Outsider read staff rows'; END IF;
  BEGIN
    PERFORM public.cafe_reservation_page(1, 25);
    RAISE EXCEPTION 'Outsider loaded dashboard';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

SELECT set_config('request.jwt.claim.sub', 'cf0d44d6-31d0-424d-aeb6-48fe0851947a', true);
DO $$
DECLARE
  target uuid := (SELECT id FROM pg_temp.cafe_test_booking);
  pagination jsonb;
BEGIN
  IF (SELECT count(*) FROM public.admin_users) <> 1 THEN RAISE EXCEPTION 'Staff RLS failed'; END IF;
  UPDATE public.reservations SET status = 'confirmed' WHERE id = target AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Confirmation failed'; END IF;
  UPDATE public.reservations SET status = 'confirmed' WHERE id = target AND status = 'pending';
  IF FOUND THEN RAISE EXCEPTION 'Stale confirmation succeeded'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.track_reservation(target, '9123456789') WHERE status = 'confirmed') THEN
    RAISE EXCEPTION 'Tracking did not show updated status';
  END IF;
  SELECT public.cafe_reservation_page(9, 25, 'Café pagination fixture', NULL, 'pending') INTO pagination;
  IF (pagination ->> 'filtered')::integer <> 205 OR jsonb_array_length(pagination -> 'rows') <> 5
      OR (pagination ->> 'total')::integer < 206 THEN
    RAISE EXCEPTION 'Pagination, filtered count, or global statistics failed';
  END IF;
  BEGIN
    PERFORM public.cafe_finish_staff_invite('cf0d44d6-31d0-424d-aeb6-48fe0851947a', 'missing@example.invalid');
    RAISE EXCEPTION 'Staff called a service-only RPC';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

RESET ROLE;
SET LOCAL ROLE service_role;
DO $$
DECLARE
  owner_id uuid := 'cf0d44d6-31d0-424d-aeb6-48fe0851947c';
  staff_id uuid := 'cf0d44d6-31d0-424d-aeb6-48fe0851947a';
  email_address text := 'invite-fixture@example.invalid';
BEGIN
  INSERT INTO public.cafe_staff_invitations (email, role) VALUES (email_address, 'admin');
  IF public.cafe_claim_staff_invite(staff_id, email_address) <> 'forbidden'
    OR public.cafe_finish_staff_invite(owner_id, email_address) <> 'pending' THEN
    RAISE EXCEPTION 'Invitation failed authorization or prematurely completed';
  END IF;
  IF public.cafe_claim_staff_invite(owner_id, email_address) <> 'claimed' THEN
    RAISE EXCEPTION 'First invitation attempt was not allowed';
  END IF;
  IF public.cafe_claim_staff_invite(owner_id, email_address) <> 'busy' THEN
    RAISE EXCEPTION 'Parallel invitation attempt was not blocked';
  END IF;
  IF public.cafe_remove_staff(owner_id, owner_id) <> 'self' THEN RAISE EXCEPTION 'Owner could remove self'; END IF;
END $$;
RESET ROLE;

-- Simulate Auth completing while the first Edge invocation loses its response.
INSERT INTO auth.users (id, email, invited_at, created_at, raw_user_meta_data)
SELECT 'cf0d44d6-31d0-424d-aeb6-48fe0851947d', email, clock_timestamp(), clock_timestamp(),
  jsonb_build_object('cafe_invitation_marker', marker)
FROM public.cafe_staff_invitations WHERE email = 'invite-fixture@example.invalid';

SET LOCAL ROLE service_role;
DO $$
DECLARE
  owner_id uuid := 'cf0d44d6-31d0-424d-aeb6-48fe0851947c';
  email_address text := 'invite-fixture@example.invalid';
BEGIN
  IF public.cafe_finish_staff_invite(owner_id, email_address) <> 'complete' THEN
    RAISE EXCEPTION 'Retry did not recover a partially completed invitation';
  END IF;
  IF public.cafe_finish_staff_invite(owner_id, email_address) <> 'complete' THEN
    RAISE EXCEPTION 'Repeating a completed invitation was not idempotent';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = 'cf0d44d6-31d0-424d-aeb6-48fe0851947d' AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Invitation was completed without establishing staff access';
  END IF;
END $$;
RESET ROLE;

-- Abuse checks must run as anon, with no direct privileges on quota counters.
SET LOCAL ROLE anon;
DO $$
DECLARE
  attempt uuid := gen_random_uuid();
  reference uuid;
  unknown_reference uuid := gen_random_uuid();
  lock_dummy uuid;
  tomorrow date := (clock_timestamp() AT TIME ZONE 'Asia/Kolkata')::date + 1;
BEGIN
  reference := public.submit_reservation(attempt, 'Rate fixture', '+918123456789', tomorrow, '12:00', 2);
  FOR i IN 2..6 LOOP
    PERFORM public.submit_reservation(gen_random_uuid(), 'Rate fixture', '8123456789', tomorrow, '12:00', 2);
  END LOOP;

  BEGIN
    PERFORM public.submit_reservation(gen_random_uuid(), 'Rate fixture', '+918123456789', tomorrow, '12:00', 2);
    RAISE EXCEPTION 'New submissions exceeded the phone quota';
  EXCEPTION WHEN SQLSTATE 'PT429' THEN NULL;
  END;

  IF public.submit_reservation(attempt, 'Rate fixture', '8123456789', tomorrow, '12:00', 2)
    IS DISTINCT FROM reference THEN
    RAISE EXCEPTION 'Quota blocked an earlier successful booking retry';
  END IF;

  lock_dummy := public.submit_reservation(gen_random_uuid(), 'Other guest', '8123456790', tomorrow, '12:00', 2);
  IF lock_dummy IS NULL THEN RAISE EXCEPTION 'Separate phones incorrectly share the phone quota'; END IF;

  FOR i IN 1..10 LOOP
    IF EXISTS (SELECT 1 FROM public.track_reservation(unknown_reference, '8123456789')) THEN
      RAISE EXCEPTION 'Unknown booking unexpectedly matched';
    END IF;
  END LOOP;
  BEGIN
    PERFORM public.track_reservation(unknown_reference, '8123456790');
    RAISE EXCEPTION 'Lookups exceeded the per-reference quota';
  EXCEPTION WHEN SQLSTATE 'PT429' THEN NULL;
  END;

  IF NOT EXISTS (SELECT 1 FROM public.track_reservation(reference, '8123456789')) THEN
    RAISE EXCEPTION 'A different reference was incorrectly limited';
  END IF;

  BEGIN
    PERFORM count(*) FROM cafe_private.reservation_rate_limits;
    RAISE EXCEPTION 'Anonymous callers can access private rate counters';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;

ROLLBACK;
