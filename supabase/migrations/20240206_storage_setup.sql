-- Create a new storage bucket for exam uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exam-uploads', 
  'exam-uploads', 
  false, -- Private bucket
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET 
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- RLS Policies for Storage
-- Allow candidates to upload files to their own folder (by attempt_id?)
-- Or better, just allow authenticated candidates to insert.

CREATE POLICY "Candidates can upload exam images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'exam-uploads' AND
  (storage.foldername(name))[1] = 'exam-submissions'
);

CREATE POLICY "Candidates can view their own uploaded images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'exam-uploads' AND
  owner = auth.uid()
);

-- Allow exam controller/admin to view all
CREATE POLICY "Admins can view all exam images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'exam-uploads' AND
  (public.get_user_role() IN ('exam_controller', 'super_admin'))
);
