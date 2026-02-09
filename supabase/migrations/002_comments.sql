-- ============================================================
-- Phase 2.1: Comments on events
-- Run this in the Supabase SQL Editor
-- ============================================================

CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content varchar(2000) NOT NULL,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX comments_event_id_idx ON public.comments(event_id);

-- Enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- SELECT: approved members can read comments on non-deleted events
CREATE POLICY "comments_select"
  ON public.comments FOR SELECT
  TO authenticated
  USING (
    is_approved_member()
    AND EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = comments.event_id
        AND events.deleted_at IS NULL
    )
  );

-- INSERT: approved members can create comments
CREATE POLICY "comments_insert"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (
    is_approved_member()
    AND user_id = current_profile_id()
  );

-- DELETE: author can delete their own comments
CREATE POLICY "comments_delete"
  ON public.comments FOR DELETE
  TO authenticated
  USING (
    is_approved_member()
    AND user_id = current_profile_id()
  );
