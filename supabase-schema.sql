
-- VriSaa Café reservation database

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Authorized staff accounts
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY
    REFERENCES auth.users(id)
    ON DELETE CASCADE
);

-- Customer booking requests
CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  customer_name TEXT NOT NULL
    CHECK (
      char_length(trim(customer_name))
      BETWEEN 1 AND 100
    ),

  phone TEXT NOT NULL
    CHECK (phone ~ '^[0-9]{10}$'),

  booking_date DATE NOT NULL
    CHECK (booking_date >= CURRENT_DATE),

  booking_time TIME NOT NULL,

  guests INTEGER NOT NULL
    CHECK (guests BETWEEN 1 AND 12),

  notes TEXT NOT NULL DEFAULT ''
    CHECK (char_length(notes) <= 500),

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (
      status IN (
        'pending',
        'confirmed',
        'rejected',
        'cancelled'
      )
    ),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.admin_users
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.reservations
ENABLE ROW LEVEL SECURITY;

-- Verify admin membership
CREATE OR REPLACE FUNCTION public.is_cafe_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = (SELECT auth.uid())
  );
$$;

REVOKE ALL
ON FUNCTION public.is_cafe_admin()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.is_cafe_admin()
TO authenticated;

-- Limit public table permissions
REVOKE ALL
ON public.reservations
FROM anon, authenticated;

GRANT INSERT (
  customer_name,
  phone,
  booking_date,
  booking_time,
  guests,
  notes
)
ON public.reservations
TO anon, authenticated;

GRANT SELECT, UPDATE
ON public.reservations
TO authenticated;

-- Anyone can submit a pending request
CREATE POLICY "Public can submit pending requests"
ON public.reservations
FOR INSERT
TO anon, authenticated
WITH CHECK (status = 'pending');

-- Only staff can view reservations
CREATE POLICY "Admins can read requests"
ON public.reservations
FOR SELECT
TO authenticated
USING (public.is_cafe_admin());

-- Only staff can update reservations
CREATE POLICY "Admins can update requests"
ON public.reservations
FOR UPDATE
TO authenticated
USING (public.is_cafe_admin())
WITH CHECK (public.is_cafe_admin());

-- After creating a staff account in Supabase Auth,
-- run this with the actual staff UUID:
--
-- INSERT INTO public.admin_users (user_id)
-- VALUES ('YOUR_STAFF_AUTH_USER_UUID');
