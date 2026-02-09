-- ============================================================
-- Phase 2.4: Image sharing in comment threads
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Create the storage bucket for comment images
INSERT INTO storage.buckets (id, name, public)
VALUES ('comment-images', 'comment-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: approved members can read all images
CREATE POLICY "storage_comment_images_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'comment-images'
    AND (SELECT public.is_approved_member())
  );

-- Storage policies: approved members can upload images
CREATE POLICY "storage_comment_images_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'comment-images'
    AND (SELECT public.is_approved_member())
  );

-- Storage policies: users can delete their own uploads (path: user_profile_id/filename)
CREATE POLICY "storage_comment_images_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'comment-images'
    AND (SELECT public.is_approved_member())
  );
