-- ============================================================
-- Phase 2.2: Polls on events
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Polls
CREATE TABLE public.polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question varchar(200) NOT NULL,
  is_closed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX polls_event_id_idx ON public.polls(event_id);

-- Poll options
CREATE TABLE public.poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  label varchar(100) NOT NULL,
  position integer NOT NULL
);

CREATE INDEX poll_options_poll_id_idx ON public.poll_options(poll_id);

-- Poll votes
CREATE TABLE public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

-- Enable RLS
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- POLLS policies
CREATE POLICY "polls_select" ON public.polls FOR SELECT TO authenticated
  USING (is_approved_member());

CREATE POLICY "polls_insert" ON public.polls FOR INSERT TO authenticated
  WITH CHECK (is_approved_member() AND user_id = current_profile_id());

CREATE POLICY "polls_update" ON public.polls FOR UPDATE TO authenticated
  USING (is_approved_member() AND user_id = current_profile_id())
  WITH CHECK (is_approved_member() AND user_id = current_profile_id());

-- POLL OPTIONS policies
CREATE POLICY "poll_options_select" ON public.poll_options FOR SELECT TO authenticated
  USING (is_approved_member());

CREATE POLICY "poll_options_insert" ON public.poll_options FOR INSERT TO authenticated
  WITH CHECK (
    is_approved_member()
    AND EXISTS (
      SELECT 1 FROM public.polls
      WHERE polls.id = poll_options.poll_id
        AND polls.user_id = current_profile_id()
    )
  );

-- POLL VOTES policies
CREATE POLICY "poll_votes_select" ON public.poll_votes FOR SELECT TO authenticated
  USING (is_approved_member());

CREATE POLICY "poll_votes_insert" ON public.poll_votes FOR INSERT TO authenticated
  WITH CHECK (
    is_approved_member()
    AND user_id = current_profile_id()
    AND EXISTS (
      SELECT 1 FROM public.polls
      WHERE polls.id = poll_votes.poll_id AND NOT polls.is_closed
    )
  );

CREATE POLICY "poll_votes_update" ON public.poll_votes FOR UPDATE TO authenticated
  USING (is_approved_member() AND user_id = current_profile_id())
  WITH CHECK (is_approved_member() AND user_id = current_profile_id());

CREATE POLICY "poll_votes_delete" ON public.poll_votes FOR DELETE TO authenticated
  USING (is_approved_member() AND user_id = current_profile_id());
