-- Make bucket public
UPDATE storage.buckets
SET public = true
WHERE id = 'exam-uploads';

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Candidates can upload exam images" ON storage.objects;
DROP POLICY IF EXISTS "Candidates can view their own uploaded images" ON storage.objects;

-- Create more flexible policies
-- Allow insert to any path in this bucket for authenticated users
CREATE POLICY "Candidates can upload exam images generic"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'exam-uploads'
);

-- Allow public read access (since we made bucket public, though getPublicUrl generates valid URLs, 
-- explicit SELECT policy is technically good but public bucket bypasses RLS for reading via public URL usually? 
-- Actually for public buckets, RLS for SELECT is skipped for public URLs.)
-- But let's add a select policy for authenticated users just in case they use the JS client's download().

CREATE POLICY "Allow view access to all"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'exam-uploads' );

-- Allow update/delete for own files
CREATE POLICY "Candidates can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'exam-uploads' AND
  owner = auth.uid()
);
