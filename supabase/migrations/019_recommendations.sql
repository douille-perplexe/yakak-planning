-- ============================================================
-- Recommendations feature: tables, RLS, notification type
-- ============================================================

-- 1. recommendations (user-submitted)
CREATE TABLE public.recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title varchar(200) NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN (
    'Movies','TV Series','Anime','Games','Music','Books',
    'Outings','Restaurants','Activities','Podcasts','Other'
  )),
  external_url text,
  image_url text,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN (
    'manual','tmdb','rawg','spotify','google_books'
  )),
  source_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX recommendations_user_id_idx ON public.recommendations(user_id);
CREATE INDEX recommendations_category_idx ON public.recommendations(category);
CREATE INDEX recommendations_created_at_idx ON public.recommendations(created_at DESC);

-- 2. recommendation_likes
CREATE TABLE public.recommendation_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id uuid NOT NULL REFERENCES public.recommendations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(recommendation_id, user_id)
);

CREATE INDEX recommendation_likes_rec_idx ON public.recommendation_likes(recommendation_id);

-- 3. saved_recommendations (denormalized — stores copies of both API picks and user recs)
CREATE TABLE public.saved_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title varchar(200) NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN (
    'Movies','TV Series','Anime','Games','Music','Books',
    'Outings','Restaurants','Activities','Podcasts','Other'
  )),
  image_url text,
  external_url text,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN (
    'manual','tmdb','rawg','spotify','google_books'
  )),
  source_id text,
  recommendation_id uuid REFERENCES public.recommendations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX saved_recommendations_user_id_idx ON public.saved_recommendations(user_id);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_recommendations ENABLE ROW LEVEL SECURITY;

-- recommendations: SELECT for all approved members
CREATE POLICY "Approved members can view recommendations"
  ON public.recommendations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid() AND profiles.status = 'approved'
    )
  );

-- recommendations: INSERT own
CREATE POLICY "Users can insert own recommendations"
  ON public.recommendations FOR INSERT
  WITH CHECK (
    user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- recommendations: UPDATE own
CREATE POLICY "Users can update own recommendations"
  ON public.recommendations FOR UPDATE
  USING (
    user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- recommendations: DELETE own
CREATE POLICY "Users can delete own recommendations"
  ON public.recommendations FOR DELETE
  USING (
    user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- recommendation_likes: SELECT all approved
CREATE POLICY "Approved members can view likes"
  ON public.recommendation_likes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid() AND profiles.status = 'approved'
    )
  );

-- recommendation_likes: INSERT own
CREATE POLICY "Users can insert own likes"
  ON public.recommendation_likes FOR INSERT
  WITH CHECK (
    user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- recommendation_likes: DELETE own
CREATE POLICY "Users can delete own likes"
  ON public.recommendation_likes FOR DELETE
  USING (
    user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- saved_recommendations: SELECT own only
CREATE POLICY "Users can view own saved recommendations"
  ON public.saved_recommendations FOR SELECT
  USING (
    user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- saved_recommendations: INSERT own only
CREATE POLICY "Users can insert own saved recommendations"
  ON public.saved_recommendations FOR INSERT
  WITH CHECK (
    user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- saved_recommendations: DELETE own only
CREATE POLICY "Users can delete own saved recommendations"
  ON public.saved_recommendations FOR DELETE
  USING (
    user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- ============================================================
-- Notification type: add 'new_recommendation'
-- ============================================================

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
    'twitch_live',
    'new_poop',
    'new_recommendation'
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
    'twitch_live',
    'new_poop',
    'new_recommendation'
  ));

-- Update seed function to include new type
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
    'twitch_live',
    'new_poop',
    'new_recommendation'
  ];
BEGIN
  FOREACH notification_type IN ARRAY all_types
  LOOP
    INSERT INTO public.notification_preferences (user_id, type, email_enabled, in_app_enabled)
    VALUES (
      NEW.id,
      notification_type,
      CASE WHEN notification_type IN ('availability_signal', 'achievement_unlocked', 'new_poop', 'new_recommendation') THEN false ELSE true END,
      true
    )
    ON CONFLICT (user_id, type) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Seed new_recommendation prefs for existing approved members
INSERT INTO public.notification_preferences (user_id, type, email_enabled, in_app_enabled)
SELECT p.id, 'new_recommendation', false, true
FROM public.profiles p
WHERE p.status = 'approved'
ON CONFLICT (user_id, type) DO NOTHING;
