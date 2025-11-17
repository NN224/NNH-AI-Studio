-- استخدام أي صورة موجودة كـ Logo مؤقتاً
-- حتى نضيف Upload functionality

-- 1. تحديث locations بأول صورة متاحة
UPDATE gmb_locations gl
SET logo_url = (
  SELECT url 
  FROM gmb_media gm
  WHERE gm.location_id = gl.id 
    AND gm.url IS NOT NULL
  ORDER BY 
    CASE 
      WHEN category = 'LOGO' THEN 1
      WHEN category = 'PROFILE' THEN 2
      ELSE 3
    END,
    created_at DESC
  LIMIT 1
)
WHERE gl.logo_url IS NULL
  AND EXISTS (
    SELECT 1 FROM gmb_media 
    WHERE location_id = gl.id
  );

-- 2. التحقق من النتيجة
SELECT 
  'Locations with logos' as check_name,
  COUNT(*) FILTER (WHERE logo_url IS NOT NULL) as with_logo,
  COUNT(*) FILTER (WHERE logo_url IS NULL) as without_logo,
  COUNT(*) as total
FROM gmb_locations
WHERE is_active = true;
