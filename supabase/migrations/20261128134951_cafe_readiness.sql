BEGIN;

ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS role text;
UPDATE public.admin_users SET role = 'admin' WHERE role IS NULL;
ALTER TABLE public.admin_users ALTER COLUMN role SET DEFAULT 'admin';
ALTER TABLE public.admin_users ALTER COLUMN role SET NOT NULL;
ALTER TABLE public.admin_users DROP CONSTRAINT IF EXISTS cafe_staff_role_check;
ALTER TABLE public.admin_users ADD CONSTRAINT cafe_staff_role_check
  CHECK (role IN ('admin', 'super_admin'));

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Replace legacy policies on these two app-owned tables, including permissive variants.
DO $$
DECLARE policy_record record;
BEGIN
  FOR policy_record IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('admin_users', 'reservations')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', policy_record.policyname, policy_record.tablename);
  END LOOP;
END $$;

REVOKE ALL ON public.admin_users, public.reservations FROM PUBLIC, anon, authenticated;
-- Table-level REVOKE does not remove separately granted column privileges.
DO $$
DECLARE relation text;
DECLARE columns text;
BEGIN
  FOREACH relation IN ARRAY ARRAY['admin_users', 'reservations'] LOOP
    SELECT string_agg(quote_ident(attname), ', ') INTO columns
    FROM pg_attribute
    WHERE attrelid = ('public.' || relation)::regclass AND attnum > 0 AND NOT attisdropped;
    EXECUTE format(
      'REVOKE SELECT (%s), INSERT (%s), UPDATE (%s), REFERENCES (%s) ON public.%I FROM PUBLIC, anon, authenticated',
      columns, columns, columns, columns, relation
    );
  END LOOP;
END $$;
GRANT SELECT (user_id, role) ON public.admin_users TO authenticated;
GRANT SELECT ON public.reservations TO authenticated;
GRANT UPDATE (status) ON public.reservations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_users TO service_role;

CREATE OR REPLACE FUNCTION public.is_cafe_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'super_admin')
  );
$$;
REVOKE ALL ON FUNCTION public.is_cafe_admin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_cafe_admin() TO authenticated;
CREATE POLICY cafe_staff_read_self ON public.admin_users FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY cafe_staff_read_reservations ON public.reservations FOR SELECT TO authenticated
  USING ((SELECT public.is_cafe_admin()));
CREATE POLICY cafe_staff_update_reservations ON public.reservations FOR UPDATE TO authenticated
  USING ((SELECT public.is_cafe_admin())) WITH CHECK ((SELECT public.is_cafe_admin()));

ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_booking_date_check;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS submission_key uuid;
ALTER TABLE public.reservations ALTER COLUMN id SET DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS cafe_reservation_submission_key
  ON public.reservations (submission_key) WHERE submission_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS cafe_reservation_order
  ON public.reservations (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS cafe_reservation_status_order
  ON public.reservations (status, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS cafe_reservation_date ON public.reservations (booking_date);

CREATE OR REPLACE FUNCTION public.cafe_normalize_mobile(p_phone text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$
  SELECT CASE WHEN trimmed ~ '^(\+91)?[6-9][0-9]{9}$' THEN right(trimmed, 10) END
  FROM (SELECT btrim(p_phone) AS trimmed) AS input;
$$;
REVOKE ALL ON FUNCTION public.cafe_normalize_mobile(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.cafe_validate_reservation()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.phone := public.cafe_normalize_mobile(NEW.phone);
    IF NEW.phone IS NULL THEN
      RAISE EXCEPTION 'Enter a valid Indian mobile number.' USING ERRCODE = '22023';
    END IF;
    IF NOT isfinite(NEW.booking_date) OR NEW.booking_time >= time '24:00'
      OR NEW.booking_date + NEW.booking_time <= (clock_timestamp() AT TIME ZONE 'Asia/Kolkata') THEN
      RAISE EXCEPTION 'Choose a future date and time in India Standard Time.' USING ERRCODE = '22023';
    END IF;
  ELSIF NOT (
    (OLD.status = 'pending' AND NEW.status IN ('confirmed', 'rejected'))
    OR (OLD.status = 'confirmed' AND NEW.status = 'cancelled')
  ) THEN
    RAISE EXCEPTION 'Invalid reservation status change.' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;
-- The insert path runs under the submit RPC owner. Status changes need no elevated privileges.
REVOKE ALL ON FUNCTION public.cafe_validate_reservation() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS cafe_validate_reservation ON public.reservations;
CREATE TRIGGER cafe_validate_reservation BEFORE INSERT OR UPDATE OF status ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.cafe_validate_reservation();

-- Counters are private, short-lived, and updated atomically by the public RPC owners.
CREATE SCHEMA IF NOT EXISTS cafe_private;
REVOKE ALL ON SCHEMA cafe_private FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS cafe_private.reservation_rate_limits (
  action text NOT NULL,
  scope text NOT NULL,
  bucket timestamptz NOT NULL,
  attempts integer NOT NULL CHECK (attempts > 0),
  PRIMARY KEY (action, scope, bucket)
);
CREATE INDEX IF NOT EXISTS cafe_reservation_rates_expiry
  ON cafe_private.reservation_rate_limits (bucket);
REVOKE ALL ON cafe_private.reservation_rate_limits FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION cafe_private.consume_reservation_quota(
  p_action text, p_scope text, p_global_limit integer, p_scope_limit integer, p_scope_window interval
)
RETURNS void LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  now_at timestamptz := clock_timestamp();
  minute_bucket timestamptz := date_trunc('minute', now_at);
  scope_bucket timestamptz := date_bin(p_scope_window, now_at, timestamptz '2000-01-01 00:00:00+00');
  count_now integer;
BEGIN
  INSERT INTO cafe_private.reservation_rate_limits AS counters (action, scope, bucket, attempts)
  VALUES (p_action, 'global', minute_bucket, 1)
  ON CONFLICT (action, scope, bucket) DO UPDATE SET attempts = counters.attempts + 1
    WHERE counters.attempts < p_global_limit
  RETURNING counters.attempts INTO count_now;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Too many requests. Please wait and try again.' USING ERRCODE = 'PT429';
  END IF;

  INSERT INTO cafe_private.reservation_rate_limits AS counters (action, scope, bucket, attempts)
  VALUES (p_action, encode(sha256(convert_to(p_scope, 'UTF8')), 'hex'), scope_bucket, 1)
  ON CONFLICT (action, scope, bucket) DO UPDATE SET attempts = counters.attempts + 1
    WHERE counters.attempts < p_scope_limit;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Too many requests. Please wait and try again.' USING ERRCODE = 'PT429';
  END IF;

  IF count_now = 1 THEN
    DELETE FROM cafe_private.reservation_rate_limits WHERE bucket < now_at - interval '1 day';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION cafe_private.consume_reservation_quota(text, text, integer, integer, interval)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_reservation(
  p_key uuid, p_name text, p_phone text, p_date date, p_time time,
  p_guests integer, p_notes text DEFAULT ''
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  booking public.reservations%ROWTYPE;
  name_value text := btrim(p_name);
  phone_value text := public.cafe_normalize_mobile(p_phone);
  notes_value text := btrim(coalesce(p_notes, ''));
BEGIN
  IF p_key IS NULL OR name_value IS NULL OR char_length(name_value) NOT BETWEEN 1 AND 100
    OR phone_value IS NULL OR p_date IS NULL OR p_time IS NULL
    OR p_guests IS NULL OR p_guests NOT BETWEEN 1 AND 12 OR char_length(notes_value) > 500 THEN
    RAISE EXCEPTION 'Check the reservation details.' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('cafe-booking:' || p_key::text, 0));
  SELECT * INTO booking FROM public.reservations WHERE submission_key = p_key;
  IF FOUND THEN
    IF ROW(booking.customer_name, booking.phone, booking.booking_date, booking.booking_time, booking.guests, booking.notes)
      IS DISTINCT FROM ROW(name_value, phone_value, p_date, p_time, p_guests, notes_value) THEN
      RAISE EXCEPTION 'This booking attempt has different details.' USING ERRCODE = '22023';
    END IF;
    RETURN booking.id;
  END IF;

  PERFORM cafe_private.consume_reservation_quota('submit', phone_value, 60, 6, interval '10 minutes');

  INSERT INTO public.reservations (submission_key, customer_name, phone, booking_date, booking_time, guests, notes, status)
  VALUES (p_key, name_value, phone_value, p_date, p_time, p_guests, notes_value, 'pending')
  RETURNING id INTO booking.id;
  RETURN booking.id;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_reservation(uuid, text, text, date, time, integer, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_reservation(uuid, text, text, date, time, integer, text)
  TO anon, authenticated;

-- Retire access to legacy lookup overloads without deleting them or their dependencies.
DO $$
DECLARE fn regprocedure;
BEGIN
  FOR fn IN SELECT p.oid::regprocedure FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'track_reservation'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.track_reservation(p_booking_id uuid, p_phone text)
RETURNS TABLE (booking_date date, booking_time time, guests integer, status text)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF p_booking_id IS NULL OR p_phone IS NULL OR btrim(p_phone) !~ '^(\+91)?[0-9]{10}$' THEN
    RETURN;
  END IF;

  PERFORM cafe_private.consume_reservation_quota('track', p_booking_id::text, 120, 10, interval '5 minutes');

  RETURN QUERY
  SELECT r.booking_date, r.booking_time, r.guests, r.status::text
  FROM public.reservations r
  WHERE r.id = p_booking_id
    AND (r.phone = right(btrim(p_phone), 10) OR r.phone = '+91' || right(btrim(p_phone), 10));
END;
$$;
REVOKE ALL ON FUNCTION public.track_reservation(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_reservation(uuid, text) TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.cafe_staff_invitations (
  email text PRIMARY KEY,
  role text NOT NULL CHECK (role IN ('admin', 'super_admin')),
  marker uuid NOT NULL DEFAULT gen_random_uuid(),
  requested_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.cafe_staff_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cafe_staff_invitations FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.cafe_staff_invitations TO service_role;

CREATE OR REPLACE FUNCTION public.cafe_finish_staff_invite(p_caller uuid, p_email text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  invitation public.cafe_staff_invitations%ROWTYPE;
  account uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('cafe-staff-management', 0));
  IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = p_caller AND role = 'super_admin') THEN
    RETURN 'forbidden';
  END IF;
  SELECT * INTO invitation FROM public.cafe_staff_invitations WHERE email = p_email FOR UPDATE;
  IF NOT FOUND THEN RETURN 'missing'; END IF;
  IF invitation.user_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = invitation.user_id) THEN
      RETURN 'complete';
    END IF;
    RETURN 'removed';
  END IF;

  SELECT u.id INTO account FROM auth.users u
  WHERE lower(u.email) = p_email AND u.invited_at >= invitation.requested_at
    AND u.created_at >= invitation.requested_at
    AND u.raw_user_meta_data ->> 'cafe_invitation_marker' = invitation.marker::text;
  IF NOT FOUND THEN
    IF EXISTS (SELECT 1 FROM auth.users u WHERE lower(u.email) = p_email) THEN
      RETURN 'existing_account';
    END IF;
    RETURN 'pending';
  END IF;

  INSERT INTO public.admin_users (user_id, role) VALUES (account, invitation.role)
    ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.cafe_staff_invitations SET user_id = account WHERE email = p_email;
  RETURN 'complete';
END;
$$;

CREATE OR REPLACE FUNCTION public.cafe_remove_staff(p_caller uuid, p_target uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('cafe-staff-management', 0));
  IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = p_caller AND role = 'super_admin') THEN
    RETURN 'forbidden';
  END IF;
  IF p_target = p_caller THEN RETURN 'self'; END IF;
  DELETE FROM public.admin_users WHERE user_id = p_target;
  IF FOUND THEN RETURN 'removed'; END IF;
  RETURN 'missing';
END;
$$;

REVOKE ALL ON FUNCTION public.cafe_finish_staff_invite(uuid, text), public.cafe_remove_staff(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cafe_finish_staff_invite(uuid, text), public.cafe_remove_staff(uuid, uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.cafe_reservation_page(
  p_page integer, p_size integer, p_search text DEFAULT '',
  p_date date DEFAULT NULL, p_status text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = ''
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.is_cafe_admin() THEN
    RAISE EXCEPTION 'Staff access required.' USING ERRCODE = '42501';
  END IF;
  IF p_page IS NULL OR p_page < 1 OR p_size IS NULL OR p_size NOT IN (25, 50, 100)
    OR char_length(p_search) > 100
    OR (p_status IS NOT NULL AND p_status NOT IN ('pending', 'confirmed', 'rejected', 'cancelled')) THEN
    RAISE EXCEPTION 'Invalid reservation filters.' USING ERRCODE = '22023';
  END IF;
  WITH filtered AS NOT MATERIALIZED (
    SELECT r.* FROM public.reservations r
    WHERE (p_date IS NULL OR r.booking_date = p_date)
      AND (p_status IS NULL OR r.status = p_status)
      AND (
        coalesce(p_search, '') = ''
        OR strpos(lower(r.customer_name), lower(p_search)) > 0
        OR strpos(r.phone, coalesce(nullif(regexp_replace(p_search, '^\+91', ''), ''), p_search)) > 0
        OR r.id::text = lower(p_search)
      )
  ),
  page_rows AS (
    SELECT id, customer_name, phone, booking_date, booking_time, guests, notes, status, created_at
    FROM filtered ORDER BY created_at DESC, id DESC
    LIMIT p_size OFFSET ((p_page::bigint - 1) * p_size)
  ),
  stats AS (
    SELECT count(*) AS total, count(*) FILTER (WHERE status = 'pending') AS pending,
      count(*) FILTER (WHERE status = 'confirmed') AS confirmed
    FROM public.reservations
  )
  SELECT jsonb_build_object(
    'rows', coalesce((SELECT jsonb_agg(page_rows ORDER BY created_at DESC, id DESC) FROM page_rows), '[]'::jsonb),
    'filtered', (SELECT count(*) FROM filtered),
    'total', stats.total, 'pending', stats.pending, 'confirmed', stats.confirmed
  ) INTO result FROM stats;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.cafe_reservation_page(integer, integer, text, date, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cafe_reservation_page(integer, integer, text, date, text) TO authenticated;

ALTER TABLE public.cafe_staff_invitations ADD COLUMN IF NOT EXISTS claimed_at timestamptz;
CREATE OR REPLACE FUNCTION public.cafe_claim_staff_invite(p_caller uuid, p_email text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('cafe-staff-management', 0));
  IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = p_caller AND role = 'super_admin') THEN
    RETURN 'forbidden';
  END IF;
  UPDATE public.cafe_staff_invitations SET claimed_at = clock_timestamp()
  WHERE email = p_email AND user_id IS NULL
    AND (claimed_at IS NULL OR claimed_at < clock_timestamp() - interval '1 minute');
  IF FOUND THEN RETURN 'claimed'; END IF;
  RETURN 'busy';
END;
$$;
REVOKE ALL ON FUNCTION public.cafe_claim_staff_invite(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cafe_claim_staff_invite(uuid, text) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
