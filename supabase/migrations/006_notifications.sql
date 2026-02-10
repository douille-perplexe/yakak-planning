-- ============================================================
-- Phase 3.1: Notifications and notification preferences
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. TABLES
-- ============================================================

-- Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN (
    'event_created',
    'event_updated',
    'event_cancelled',
    'new_comment',
    'new_rsvp',
    'poll_created',
    'poll_closed',
    'event_reminder',
    'availability_signal'
  )),
  reference_id uuid,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_read_idx ON public.notifications(user_id, read);
CREATE INDEX notifications_user_created_idx ON public.notifications(user_id, created_at DESC);

-- Notification preferences
CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN (
    'event_created',
    'event_updated',
    'event_cancelled',
    'new_comment',
    'new_rsvp',
    'poll_created',
    'poll_closed',
    'event_reminder',
    'availability_signal'
  )),
  email_enabled boolean NOT NULL DEFAULT true,
  in_app_enabled boolean NOT NULL DEFAULT true,
  UNIQUE(user_id, type)
);

-- ============================================================
-- 2. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Notifications: users can only read their own
CREATE POLICY "notifications_select"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (
    is_approved_member()
    AND user_id = current_profile_id()
  );

-- Notifications: users can mark their own as read
CREATE POLICY "notifications_update"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (
    is_approved_member()
    AND user_id = current_profile_id()
  )
  WITH CHECK (
    is_approved_member()
    AND user_id = current_profile_id()
  );

-- No client INSERT on notifications (only service role inserts)

-- Preferences: users can read their own
CREATE POLICY "notification_preferences_select"
  ON public.notification_preferences FOR SELECT
  TO authenticated
  USING (
    is_approved_member()
    AND user_id = current_profile_id()
  );

-- Preferences: users can insert their own
CREATE POLICY "notification_preferences_insert"
  ON public.notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (
    is_approved_member()
    AND user_id = current_profile_id()
  );

-- Preferences: users can update their own
CREATE POLICY "notification_preferences_update"
  ON public.notification_preferences FOR UPDATE
  TO authenticated
  USING (
    is_approved_member()
    AND user_id = current_profile_id()
  )
  WITH CHECK (
    is_approved_member()
    AND user_id = current_profile_id()
  );

-- ============================================================
-- 3. TRIGGERS — Seed default preferences on profile approval
-- ============================================================

CREATE OR REPLACE FUNCTION public.seed_notification_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_type text;
  all_types text[] := ARRAY[
    'event_created',
    'event_updated',
    'event_cancelled',
    'new_comment',
    'new_rsvp',
    'poll_created',
    'poll_closed',
    'event_reminder',
    'availability_signal'
  ];
BEGIN
  FOREACH notification_type IN ARRAY all_types
  LOOP
    INSERT INTO public.notification_preferences (user_id, type, email_enabled, in_app_enabled)
    VALUES (
      NEW.id,
      notification_type,
      CASE WHEN notification_type = 'availability_signal' THEN false ELSE true END,
      true
    )
    ON CONFLICT (user_id, type) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

-- When a profile is updated to approved status
CREATE TRIGGER on_profile_approved
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.status <> 'approved' AND NEW.status = 'approved')
  EXECUTE FUNCTION public.seed_notification_preferences();

-- When a profile is inserted already approved (first user / admin)
CREATE TRIGGER on_profile_inserted_approved
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.status = 'approved')
  EXECUTE FUNCTION public.seed_notification_preferences();
