-- ============================================================
-- Achievement / Badge System
-- ============================================================

-- ============================================================
-- 1. TABLES
-- ============================================================

-- Achievement definitions — catalog of all badges
CREATE TABLE public.achievement_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  category text NOT NULL CHECK (category IN ('attendance', 'social', 'special')),
  tier text NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  tier_position int NOT NULL CHECK (tier_position BETWEEN 0 AND 3),
  achievement_group text NOT NULL,
  threshold int NOT NULL CHECK (threshold > 0),
  is_automatic boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX achievement_definitions_group_idx ON public.achievement_definitions(achievement_group);

-- User achievements — unlock records
CREATE TABLE public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES public.achievement_definitions(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX user_achievements_user_idx ON public.user_achievements(user_id);

-- Add featured badge to profiles
ALTER TABLE public.profiles
  ADD COLUMN featured_badge_id uuid REFERENCES public.achievement_definitions(id) ON DELETE SET NULL;

-- ============================================================
-- 2. NOTIFICATION CONSTRAINT UPDATES
-- ============================================================

-- Drop and recreate CHECK constraints to include 'achievement_unlocked'
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
    'achievement_unlocked'
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
    'achievement_unlocked'
  ));

-- Update seed_notification_preferences() trigger function to include the new type
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
    'achievement_unlocked'
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

-- Seed achievement_unlocked prefs for existing approved members
INSERT INTO public.notification_preferences (user_id, type, email_enabled, in_app_enabled)
SELECT p.id, 'achievement_unlocked', false, true
FROM public.profiles p
WHERE p.status = 'approved'
ON CONFLICT (user_id, type) DO NOTHING;

-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Achievement definitions: approved members can read
CREATE POLICY "achievement_definitions_select"
  ON public.achievement_definitions FOR SELECT
  TO authenticated
  USING (is_approved_member());

-- Achievement definitions: admins can manage
CREATE POLICY "achievement_definitions_insert"
  ON public.achievement_definitions FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "achievement_definitions_update"
  ON public.achievement_definitions FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "achievement_definitions_delete"
  ON public.achievement_definitions FOR DELETE
  TO authenticated
  USING (is_admin());

-- User achievements: approved members can read all
CREATE POLICY "user_achievements_select"
  ON public.user_achievements FOR SELECT
  TO authenticated
  USING (is_approved_member());

-- No client INSERT on user_achievements (service role only)

-- ============================================================
-- 4. SEED DATA — 8 groups x 4 tiers = 32 definitions
-- ============================================================

INSERT INTO public.achievement_definitions (slug, name, description, icon, category, tier, tier_position, achievement_group, threshold, is_automatic) VALUES
  -- event_veteran
  ('event_veteran_bronze',   'First Timer',         'RSVP yes to your first event',           'calendar-check', 'attendance', 'bronze',   0, 'event_veteran', 1,  true),
  ('event_veteran_silver',   'Regular',             'RSVP yes to 5 events',                   'calendar-check', 'attendance', 'silver',   1, 'event_veteran', 5,  true),
  ('event_veteran_gold',     'Veteran',             'RSVP yes to 10 events',                  'calendar-check', 'attendance', 'gold',     2, 'event_veteran', 10, true),
  ('event_veteran_platinum', 'Legend',              'RSVP yes to 25 events',                  'calendar-check', 'attendance', 'platinum', 3, 'event_veteran', 25, true),

  -- streak_master
  ('streak_master_bronze',   'Double Down',         'Attend 2 events in a row',               'flame',          'attendance', 'bronze',   0, 'streak_master', 2,  true),
  ('streak_master_silver',   'On a Roll',           'Attend 4 events in a row',               'flame',          'attendance', 'silver',   1, 'streak_master', 4,  true),
  ('streak_master_gold',     'Unstoppable',         'Attend 6 events in a row',               'flame',          'attendance', 'gold',     2, 'streak_master', 6,  true),
  ('streak_master_platinum', 'Iron Will',           'Attend 10 events in a row',              'flame',          'attendance', 'platinum', 3, 'streak_master', 10, true),

  -- weekend_warrior
  ('weekend_warrior_bronze',   'Weekend Starter',   'Attend 3 weekend events',                'sun',            'attendance', 'bronze',   0, 'weekend_warrior', 3,  true),
  ('weekend_warrior_silver',   'Weekend Regular',   'Attend 5 weekend events',                'sun',            'attendance', 'silver',   1, 'weekend_warrior', 5,  true),
  ('weekend_warrior_gold',     'Weekend Warrior',   'Attend 10 weekend events',               'sun',            'attendance', 'gold',     2, 'weekend_warrior', 10, true),
  ('weekend_warrior_platinum', 'Weekend Legend',     'Attend 20 weekend events',               'sun',            'attendance', 'platinum', 3, 'weekend_warrior', 20, true),

  -- commentator
  ('commentator_bronze',   'First Words',           'Post 5 comments',                        'message-circle', 'social',     'bronze',   0, 'commentator', 5,  true),
  ('commentator_silver',   'Chatty',                'Post 15 comments',                       'message-circle', 'social',     'silver',   1, 'commentator', 15, true),
  ('commentator_gold',     'Conversationalist',     'Post 30 comments',                       'message-circle', 'social',     'gold',     2, 'commentator', 30, true),
  ('commentator_platinum', 'Voice of the Group',    'Post 50 comments',                       'message-circle', 'social',     'platinum', 3, 'commentator', 50, true),

  -- poll_enthusiast
  ('poll_enthusiast_bronze',   'Opinion Haver',     'Vote in 3 polls',                        'bar-chart-3',    'social',     'bronze',   0, 'poll_enthusiast', 3,  true),
  ('poll_enthusiast_silver',   'Poll Regular',      'Vote in 10 polls',                       'bar-chart-3',    'social',     'silver',   1, 'poll_enthusiast', 10, true),
  ('poll_enthusiast_gold',     'Democracy Fan',     'Vote in 20 polls',                       'bar-chart-3',    'social',     'gold',     2, 'poll_enthusiast', 20, true),
  ('poll_enthusiast_platinum', 'Chief Pollster',    'Vote in 40 polls',                       'bar-chart-3',    'social',     'platinum', 3, 'poll_enthusiast', 40, true),

  -- plus_one_pro
  ('plus_one_pro_bronze',   'Bring a Friend',       'Bring guests to 2 events',               'user-plus',      'social',     'bronze',   0, 'plus_one_pro', 2,  true),
  ('plus_one_pro_silver',   'Social Connector',     'Bring guests to 5 events',               'user-plus',      'social',     'silver',   1, 'plus_one_pro', 5,  true),
  ('plus_one_pro_gold',     'Party Starter',        'Bring guests to 10 events',              'user-plus',      'social',     'gold',     2, 'plus_one_pro', 10, true),
  ('plus_one_pro_platinum', 'VIP Host',             'Bring guests to 15 events',              'user-plus',      'social',     'platinum', 3, 'plus_one_pro', 15, true),

  -- organizer
  ('organizer_bronze',   'Initiative',              'Create your first event',                'clipboard-list', 'attendance', 'bronze',   0, 'organizer', 1,  true),
  ('organizer_silver',   'Planner',                 'Create 3 events',                        'clipboard-list', 'attendance', 'silver',   1, 'organizer', 3,  true),
  ('organizer_gold',     'Event Master',            'Create 7 events',                        'clipboard-list', 'attendance', 'gold',     2, 'organizer', 7,  true),
  ('organizer_platinum', 'Chief Organizer',         'Create 15 events',                       'clipboard-list', 'attendance', 'platinum', 3, 'organizer', 15, true),

  -- social_butterfly
  ('social_butterfly_bronze',   'Getting Started',  'RSVP yes to 3 events total',             'heart',          'social',     'bronze',   0, 'social_butterfly', 3,  true),
  ('social_butterfly_silver',   'Social',           'RSVP yes to 10 events total',            'heart',          'social',     'silver',   1, 'social_butterfly', 10, true),
  ('social_butterfly_gold',     'Butterfly',        'RSVP yes to 20 events total',            'heart',          'social',     'gold',     2, 'social_butterfly', 20, true),
  ('social_butterfly_platinum', 'Social Butterfly', 'RSVP yes to 50 events total',            'heart',          'social',     'platinum', 3, 'social_butterfly', 50, true);
