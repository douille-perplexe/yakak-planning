-- ============================================================
-- Event Ratings — let attendees rate past events (1-5 stars + optional review)
-- ============================================================

CREATE TABLE public.event_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review text CHECK (char_length(review) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX event_ratings_event_id_idx ON public.event_ratings(event_id);
CREATE INDEX event_ratings_user_id_idx ON public.event_ratings(user_id);

-- Reuse existing update_updated_at() trigger from migration 001
CREATE TRIGGER set_event_ratings_updated_at
  BEFORE UPDATE ON public.event_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.event_ratings ENABLE ROW LEVEL SECURITY;

-- SELECT: approved members can read all ratings
CREATE POLICY "event_ratings_select"
  ON public.event_ratings FOR SELECT
  TO authenticated
  USING (is_approved_member());

-- INSERT: approved members can insert their own rating
CREATE POLICY "event_ratings_insert"
  ON public.event_ratings FOR INSERT
  TO authenticated
  WITH CHECK (
    is_approved_member()
    AND user_id = current_profile_id()
  );

-- UPDATE: approved members can update their own rating
CREATE POLICY "event_ratings_update"
  ON public.event_ratings FOR UPDATE
  TO authenticated
  USING (
    is_approved_member()
    AND user_id = current_profile_id()
  )
  WITH CHECK (
    is_approved_member()
    AND user_id = current_profile_id()
  );

-- DELETE: approved members can delete their own rating
CREATE POLICY "event_ratings_delete"
  ON public.event_ratings FOR DELETE
  TO authenticated
  USING (
    is_approved_member()
    AND user_id = current_profile_id()
  );
