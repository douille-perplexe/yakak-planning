-- ============================================================
-- Yakak - Initial Database Schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ============================================================
-- 1. TABLES (must be created before functions that reference them)
-- ============================================================

-- Profiles (linked 1:1 to auth.users)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  avatar_url text NOT NULL DEFAULT '',
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'removed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX profiles_status_idx ON public.profiles(status);

-- Events (outings)
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(100) NOT NULL,
  date timestamptz NOT NULL,
  location varchar(200) NOT NULL,
  description varchar(2000),
  reminder_hours integer NOT NULL DEFAULT 24,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX events_date_idx ON public.events(date);
CREATE INDEX events_created_by_idx ON public.events(created_by);

-- RSVPs
CREATE TABLE public.rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('yes', 'no', 'maybe')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- ============================================================
-- 2. HELPER FUNCTIONS (tables exist now, safe to reference them)
-- ============================================================

-- Check if the authenticated user is an approved member
CREATE OR REPLACE FUNCTION public.is_approved_member()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND status = 'approved'
  );
$$;

-- Check if the authenticated user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND role = 'admin'
      AND status = 'approved'
  );
$$;

-- Get the profile id of the authenticated user
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- Auto-update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 3. TRIGGERS
-- ============================================================

-- Auto-create profile when a user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_count integer;
BEGIN
  SELECT COUNT(*) INTO existing_count FROM public.profiles;

  INSERT INTO public.profiles (user_id, display_name, avatar_url, email, role, status)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      'User'
    ),
    COALESCE(
      NEW.raw_user_meta_data ->> 'avatar_url',
      NEW.raw_user_meta_data ->> 'picture',
      ''
    ),
    COALESCE(NEW.email, ''),
    CASE WHEN existing_count = 0 THEN 'admin' ELSE 'member' END,
    CASE WHEN existing_count = 0 THEN 'approved' ELSE 'pending' END
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at on events
CREATE TRIGGER set_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Auto-update updated_at on rsvps
CREATE TRIGGER set_rsvps_updated_at
  BEFORE UPDATE ON public.rsvps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;

-- ---- PROFILES ----

-- SELECT: see own profile (any status) + all approved profiles
CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR status = 'approved'
  );

-- UPDATE: admin can update any profile (for approve/deny/remove)
CREATE POLICY "profiles_update_admin"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ---- EVENTS ----

-- SELECT: approved members can read non-deleted events
CREATE POLICY "events_select"
  ON public.events FOR SELECT
  TO authenticated
  USING (
    is_approved_member()
    AND deleted_at IS NULL
  );

-- INSERT: approved members can create events (must set created_by to own profile id)
CREATE POLICY "events_insert"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (
    is_approved_member()
    AND created_by = current_profile_id()
  );

-- UPDATE: creator can update their own event, admin can update any
CREATE POLICY "events_update"
  ON public.events FOR UPDATE
  TO authenticated
  USING (
    is_approved_member()
    AND (created_by = current_profile_id() OR is_admin())
  )
  WITH CHECK (
    is_approved_member()
    AND (created_by = current_profile_id() OR is_admin())
  );

-- ---- RSVPS ----

-- SELECT: approved members can read all rsvps
CREATE POLICY "rsvps_select"
  ON public.rsvps FOR SELECT
  TO authenticated
  USING (is_approved_member());

-- INSERT: approved members can create their own rsvp
CREATE POLICY "rsvps_insert"
  ON public.rsvps FOR INSERT
  TO authenticated
  WITH CHECK (
    is_approved_member()
    AND user_id = current_profile_id()
  );

-- UPDATE: approved members can update their own rsvp
CREATE POLICY "rsvps_update"
  ON public.rsvps FOR UPDATE
  TO authenticated
  USING (
    is_approved_member()
    AND user_id = current_profile_id()
  )
  WITH CHECK (
    is_approved_member()
    AND user_id = current_profile_id()
  );

-- DELETE: approved members can remove their own rsvp
CREATE POLICY "rsvps_delete"
  ON public.rsvps FOR DELETE
  TO authenticated
  USING (
    is_approved_member()
    AND user_id = current_profile_id()
  );
