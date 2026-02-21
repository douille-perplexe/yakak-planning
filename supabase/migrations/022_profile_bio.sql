-- ============================================================
-- Profile bio + avatars storage bucket
-- ============================================================

-- Add bio column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- Create avatars storage bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Public can read avatars
CREATE POLICY "storage_avatars_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Authenticated users can upload avatars
CREATE POLICY "storage_avatars_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');

-- Authenticated users can update their own avatars
CREATE POLICY "storage_avatars_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars');
