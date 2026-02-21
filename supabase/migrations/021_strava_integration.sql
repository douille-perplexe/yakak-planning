-- Strava OAuth tokens (one per user)
CREATE TABLE strava_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  strava_athlete_id BIGINT NOT NULL,
  strava_username TEXT,
  strava_firstname TEXT,
  strava_lastname TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE strava_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own Strava token"
  ON strava_tokens
  FOR ALL
  USING (user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Strava activity links (one per user per event)
CREATE TABLE strava_activity_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  strava_activity_id BIGINT NOT NULL,
  activity_name TEXT NOT NULL,
  sport_type TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  elapsed_time INTEGER NOT NULL,          -- seconds
  distance FLOAT,                          -- meters (null for non-distance sports)
  total_elevation_gain FLOAT,             -- meters
  average_speed FLOAT,                    -- m/s
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, user_id)
);

ALTER TABLE strava_activity_links ENABLE ROW LEVEL SECURITY;

-- Anyone can read activity links for events they can see
CREATE POLICY "Activity links are readable by all authenticated users"
  ON strava_activity_links
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Users can insert/update/delete their own links
CREATE POLICY "Users can manage their own activity links"
  ON strava_activity_links
  FOR ALL
  USING (user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));
