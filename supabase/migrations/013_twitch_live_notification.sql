-- ============================================================
-- Add 'twitch_live' notification type
-- ============================================================

-- Drop and recreate CHECK constraints to include 'twitch_live'
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'event_created',
    'event_updated',
    'event_cancelled',
    'new_comment',
    'new_rsvp',
    'poll_created',
    'poll_closed',
    'event_reminder',
    'availability_signal',
    'achievement_unlocked',
    'twitch_live'
  ));

ALTER TABLE public.notification_preferences
  DROP CONSTRAINT IF EXISTS notification_preferences_type_check;

ALTER TABLE public.notification_preferences
  ADD CONSTRAINT notification_preferences_type_check CHECK (type IN (
    'event_created',
    'event_updated',
    'event_cancelled',
    'new_comment',
    'new_rsvp',
    'poll_created',
    'poll_closed',
    'event_reminder',
    'availability_signal',
    'achievement_unlocked',
    'twitch_live'
  ));

-- Update seed_notification_preferences() to include the new type
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
    'availability_signal',
    'achievement_unlocked',
    'twitch_live'
  ];
BEGIN
  FOREACH notification_type IN ARRAY all_types
  LOOP
    INSERT INTO public.notification_preferences (user_id, type, email_enabled, in_app_enabled)
    VALUES (
      NEW.id,
      notification_type,
      CASE WHEN notification_type IN ('availability_signal', 'achievement_unlocked') THEN false ELSE true END,
      true
    )
    ON CONFLICT (user_id, type) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Seed twitch_live prefs for existing approved members
INSERT INTO public.notification_preferences (user_id, type, email_enabled, in_app_enabled)
SELECT p.id, 'twitch_live', true, true
FROM public.profiles p
WHERE p.status = 'approved'
ON CONFLICT (user_id, type) DO NOTHING;
