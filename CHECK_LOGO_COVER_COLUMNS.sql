-- 🔍 فحص وجود أعمدة Logo & Cover في الجداول

-- 1. فحص أعمدة gmb_locations
SELECT 
  'gmb_locations columns' as check_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'gmb_locations'
  AND column_name IN ('logo_url', 'cover_photo_url', 'cover_url', 'profile_photo_url')
ORDER BY column_name;

-- 2. فحص أعمدة gmb_media
SELECT 
  'gmb_media columns' as check_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'gmb_media'
ORDER BY column_name;

-- 3. عينة من البيانات
SELECT 
  'Sample gmb_locations' as check_name,
  id,
  location_name,
  cover_photo_url,
  metadata->>'logoUrl' as metadata_logo,
  metadata->>'coverPhotoUrl' as metadata_cover
FROM gmb_locations
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d'
LIMIT 1;

-- 4. عينة من gmb_media (using actual columns)
SELECT 
  'Sample gmb_media' as check_name,
  *
FROM gmb_media
WHERE location_id IN (
  SELECT id FROM gmb_locations 
  WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d'
  LIMIT 1
)
ORDER BY created_at DESC
LIMIT 2;
