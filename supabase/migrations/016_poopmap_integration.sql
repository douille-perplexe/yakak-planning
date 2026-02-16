-- ============================================================
-- Poop Map Integration — per-user device tokens for poopmap.net API
-- ============================================================

CREATE TABLE public.poopmap_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_token text NOT NULL,
  poopmap_username text,
  poopmap_user_id integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX poopmap_tokens_user_id_idx ON public.poopmap_tokens(user_id);

-- Reuse existing update_updated_at() trigger from migration 001
CREATE TRIGGER set_poopmap_tokens_updated_at
  BEFORE UPDATE ON public.poopmap_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.poopmap_tokens ENABLE ROW LEVEL SECURITY;

-- SELECT: users can view their own token
CREATE POLICY "poopmap_tokens_select"
  ON public.poopmap_tokens FOR SELECT
  TO authenticated
  USING (user_id = public.current_profile_id());

-- INSERT: users can insert their own token
CREATE POLICY "poopmap_tokens_insert"
  ON public.poopmap_tokens FOR INSERT
  TO authenticated
  WITH CHECK (user_id = public.current_profile_id());

-- UPDATE: users can update their own token
CREATE POLICY "poopmap_tokens_update"
  ON public.poopmap_tokens FOR UPDATE
  TO authenticated
  USING (user_id = public.current_profile_id());

-- DELETE: users can delete their own token
CREATE POLICY "poopmap_tokens_delete"
  ON public.poopmap_tokens FOR DELETE
  TO authenticated
  USING (user_id = public.current_profile_id());
