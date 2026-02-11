-- ============================================================
-- 009: Twitch Integration
-- Tables for monitoring Twitch channels and caching app tokens
-- ============================================================

-- ============================================================
-- 1. TABLES
-- ============================================================

-- Twitch channels to monitor
CREATE TABLE public.twitch_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_name text NOT NULL UNIQUE CHECK (char_length(channel_name) BETWEEN 1 AND 25),
  twitch_user_id text,
  display_name text,
  profile_image_url text,
  description text,
  broadcaster_type text,
  is_live boolean NOT NULL DEFAULT false,
  current_stream_id text,
  current_title text,
  current_category text,
  current_viewer_count integer NOT NULL DEFAULT 0,
  current_thumbnail_url text,
  stream_started_at timestamptz,
  last_checked_at timestamptz,
  auto_create_events boolean NOT NULL DEFAULT true,
  added_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Twitch app tokens (service-role only)
CREATE TABLE public.twitch_app_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add twitch_stream_id to events for dedup
ALTER TABLE public.events ADD COLUMN twitch_stream_id text DEFAULT NULL;
CREATE INDEX events_twitch_stream_id_idx ON public.events(twitch_stream_id) WHERE twitch_stream_id IS NOT NULL;

-- ============================================================
-- 2. TRIGGERS
-- ============================================================

CREATE TRIGGER set_twitch_channels_updated_at
  BEFORE UPDATE ON public.twitch_channels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.twitch_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.twitch_app_tokens ENABLE ROW LEVEL SECURITY;

-- twitch_channels: approved members can view
CREATE POLICY "Approved members can view twitch channels"
  ON public.twitch_channels FOR SELECT
  USING (public.is_approved_member());

-- twitch_channels: admins can insert
CREATE POLICY "Admins can add twitch channels"
  ON public.twitch_channels FOR INSERT
  WITH CHECK (public.is_admin());

-- twitch_channels: admins can update
CREATE POLICY "Admins can update twitch channels"
  ON public.twitch_channels FOR UPDATE
  USING (public.is_admin());

-- twitch_channels: admins can delete
CREATE POLICY "Admins can delete twitch channels"
  ON public.twitch_channels FOR DELETE
  USING (public.is_admin());

-- twitch_app_tokens: RLS enabled but NO policies
-- Only the service role can read/write tokens
