-- ============================================================
-- Phase 2.3: Emoji reactions on comments
-- Run this in the Supabase SQL Editor
-- ============================================================

CREATE TABLE public.reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji varchar(32) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id, emoji)
);

CREATE INDEX reactions_comment_id_idx ON public.reactions(comment_id);

-- Enable RLS
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reactions_select" ON public.reactions FOR SELECT TO authenticated
  USING (is_approved_member());

CREATE POLICY "reactions_insert" ON public.reactions FOR INSERT TO authenticated
  WITH CHECK (
    is_approved_member()
    AND user_id = current_profile_id()
  );

CREATE POLICY "reactions_delete" ON public.reactions FOR DELETE TO authenticated
  USING (
    is_approved_member()
    AND user_id = current_profile_id()
  );
