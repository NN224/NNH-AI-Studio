-- إنشاء Storage Bucket للـ Location Media

-- 1. إنشاء الـ bucket (شغل هذا في Supabase Dashboard > Storage)
-- اسم الـ bucket: location-media
-- Public bucket: Yes

-- 2. Storage Policies (RLS)
-- هذه تشتغل في SQL Editor

-- Allow authenticated users to upload their own media
CREATE POLICY "Users can upload location media" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'location-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own media
CREATE POLICY "Users can update their location media" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'location-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own media
CREATE POLICY "Users can delete their location media" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'location-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public to view all location media (since it's public)
CREATE POLICY "Public can view location media" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'location-media');
