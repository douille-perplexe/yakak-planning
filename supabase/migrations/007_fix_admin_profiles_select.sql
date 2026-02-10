-- ============================================================
-- Fix: Allow admins to see all profiles (pending, denied, removed)
--
-- The original profiles_select policy only allowed viewing
-- own profile or approved profiles. This prevented admins
-- from seeing pending users in the admin panel.
-- ============================================================

-- Drop the existing restrictive policy
DROP POLICY "profiles_select" ON public.profiles;

-- Recreate with admin override: admins can see ALL profiles
CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    is_admin()
    OR user_id = auth.uid()
    OR status = 'approved'
  );
