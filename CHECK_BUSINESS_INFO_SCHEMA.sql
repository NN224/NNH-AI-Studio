-- ============================================
-- CHECK SCHEMA FOR BUSINESS INFO PAGE ONLY
-- ============================================

-- 1. Check if gmb_locations table exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'gmb_locations'
    ) THEN '✅ gmb_locations table EXISTS'
    ELSE '❌ gmb_locations table MISSING - Create it first!'
  END as table_status;

-- 2. Check ALL columns needed for Business Info page
SELECT 
  'Basic Info Fields' as category,
  column_name,
  data_type,
  CASE WHEN is_nullable = 'YES' THEN 'NULL' ELSE 'NOT NULL' END as nullable,
  '✅' as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'gmb_locations'
  AND column_name IN (
    'id',
    'location_name',
    'description',
    'short_description',
    'phone',
    'website',
    'category',
    'rating',
    'review_count'
  )
UNION ALL
SELECT 
  'Media URLs' as category,
  column_name,
  data_type,
  CASE WHEN is_nullable = 'YES' THEN 'NULL' ELSE 'NOT NULL' END as nullable,
  '✅' as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'gmb_locations'
  AND column_name IN (
    'logo_url',
    'cover_photo_url'
  )
UNION ALL
SELECT 
  'Action Links' as category,
  column_name,
  data_type,
  CASE WHEN is_nullable = 'YES' THEN 'NULL' ELSE 'NOT NULL' END as nullable,
  '✅' as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'gmb_locations'
  AND column_name IN (
    'menu_url',
    'booking_url',
    'order_url',
    'appointment_url'
  )
UNION ALL
SELECT 
  'Categories & Features' as category,
  column_name,
  data_type,
  CASE WHEN is_nullable = 'YES' THEN 'NULL' ELSE 'NOT NULL' END as nullable,
  '✅' as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'gmb_locations'
  AND column_name IN (
    'additional_categories',
    'from_the_business'
  )
UNION ALL
SELECT 
  'Business Hours & Metadata' as category,
  column_name,
  data_type,
  CASE WHEN is_nullable = 'YES' THEN 'NULL' ELSE 'NOT NULL' END as nullable,
  '✅' as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'gmb_locations'
  AND column_name IN (
    'business_hours',
    'regularhours',
    'metadata'
  )
UNION ALL
SELECT 
  'Additional Settings' as category,
  column_name,
  data_type,
  CASE WHEN is_nullable = 'YES' THEN 'NULL' ELSE 'NOT NULL' END as nullable,
  '✅' as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'gmb_locations'
  AND column_name IN (
    'opening_date',
    'service_area_enabled',
    'profile_completeness'
  )
ORDER BY 
  category,
  column_name;

-- 3. Check for MISSING critical columns
WITH required AS (
  SELECT 'location_name' as col, 'TEXT' as type, 'Basic Info - Location Name' as description
  UNION ALL SELECT 'description', 'TEXT', 'Basic Info - Description'
  UNION ALL SELECT 'phone', 'TEXT', 'Basic Info - Phone'
  UNION ALL SELECT 'website', 'TEXT', 'Basic Info - Website'
  UNION ALL SELECT 'category', 'TEXT', 'Basic Info - Primary Category'
  UNION ALL SELECT 'rating', 'NUMERIC(3,2)', 'Basic Info - Rating'
  UNION ALL SELECT 'review_count', 'INTEGER', 'Basic Info - Review Count'
  UNION ALL SELECT 'logo_url', 'TEXT', '🖼️ Logo URL'
  UNION ALL SELECT 'cover_photo_url', 'TEXT', '🖼️ Cover Photo URL'
  UNION ALL SELECT 'menu_url', 'TEXT', '🔗 Menu Link'
  UNION ALL SELECT 'booking_url', 'TEXT', '🔗 Booking Link'
  UNION ALL SELECT 'order_url', 'TEXT', '🔗 Order Link'
  UNION ALL SELECT 'appointment_url', 'TEXT', '🔗 Appointment Link'
  UNION ALL SELECT 'additional_categories', 'TEXT[]', '📂 Additional Categories Array'
  UNION ALL SELECT 'from_the_business', 'TEXT[]', '⭐ Features/Attributes Array'
  UNION ALL SELECT 'business_hours', 'JSONB', '🕐 Business Hours JSON'
  UNION ALL SELECT 'metadata', 'JSONB', '📦 Full GMB Metadata (CRITICAL!)'
  UNION ALL SELECT 'opening_date', 'DATE', '📅 Opening Date'
  UNION ALL SELECT 'service_area_enabled', 'BOOLEAN', '🌍 Service Area Enabled'
),
existing AS (
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'gmb_locations'
)
SELECT 
  '❌ MISSING: ' || r.col as missing_column,
  r.description,
  'ALTER TABLE gmb_locations ADD COLUMN ' || r.col || ' ' || r.type || 
    CASE 
      WHEN r.col = 'service_area_enabled' THEN ' DEFAULT false'
      WHEN r.col = 'profile_completeness' THEN ' DEFAULT 0'
      WHEN r.col = 'review_count' THEN ' DEFAULT 0'
      ELSE ''
    END || ';' as fix_command
FROM required r
LEFT JOIN existing e ON r.col = e.column_name
WHERE e.column_name IS NULL;

-- 4. Sample data check - do we have any locations?
SELECT 
  'Total Locations in DB' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 0 THEN '⚠️ No locations - Run sync first!'
    WHEN COUNT(*) > 0 THEN '✅ ' || COUNT(*) || ' location(s) found'
  END as status
FROM gmb_locations;

-- 5. Check if metadata contains the new data
SELECT 
  'Metadata Content Check' as check_type,
  COUNT(*) FILTER (WHERE metadata IS NOT NULL) as has_metadata,
  COUNT(*) FILTER (WHERE metadata->'attributes' IS NOT NULL) as has_attributes,
  COUNT(*) FILTER (WHERE metadata->'placeActionLinks' IS NOT NULL) as has_place_actions,
  COUNT(*) FILTER (WHERE metadata->'regularHours' IS NOT NULL) as has_regular_hours,
  COUNT(*) FILTER (WHERE metadata->'moreHours' IS NOT NULL) as has_more_hours,
  COUNT(*) FILTER (WHERE metadata->'serviceItems' IS NOT NULL) as has_service_items,
  CASE 
    WHEN COUNT(*) FILTER (WHERE metadata IS NOT NULL) = 0 
    THEN '⚠️ No metadata - Import from GMB needed!'
    WHEN COUNT(*) FILTER (WHERE metadata->'attributes' IS NOT NULL) = 0
    THEN '⚠️ No attributes in metadata - Import from GMB needed!'
    ELSE '✅ Metadata looks good'
  END as status
FROM gmb_locations;

-- 6. Sample one location to see its structure
SELECT 
  'Sample Location Data' as info,
  location_name,
  CASE WHEN description IS NOT NULL AND description != '' THEN '✅ Has description' ELSE '❌ No description' END as description_status,
  CASE WHEN logo_url IS NOT NULL THEN '✅ Has logo' ELSE '❌ No logo' END as logo_status,
  CASE WHEN cover_photo_url IS NOT NULL THEN '✅ Has cover' ELSE '❌ No cover' END as cover_status,
  CASE WHEN menu_url IS NOT NULL THEN '✅ Has menu link' ELSE '⚠️ No menu link' END as menu_status,
  CASE WHEN business_hours IS NOT NULL THEN '✅ Has hours' ELSE '⚠️ No hours' END as hours_status,
  CASE WHEN metadata IS NOT NULL THEN '✅ Has metadata' ELSE '❌ No metadata!' END as metadata_status,
  CASE WHEN metadata->'attributes' IS NOT NULL THEN '✅ Has attributes' ELSE '⚠️ No attributes' END as attributes_status,
  CASE WHEN metadata->'placeActionLinks' IS NOT NULL THEN '✅ Has action links' ELSE '⚠️ No action links' END as action_links_status
FROM gmb_locations
LIMIT 1;

-- 7. Final Summary
SELECT 
  '================================' as summary,
  'Business Info Page Schema Check Complete!' as message,
  '================================' as summary2;

SELECT 
  'Next Steps:' as guide,
  CASE 
    WHEN (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'gmb_locations' AND column_name = 'metadata') = 0
    THEN '1️⃣ Add missing columns shown above'
    WHEN (SELECT COUNT(*) FROM gmb_locations WHERE metadata IS NOT NULL) = 0
    THEN '2️⃣ Go to Business Info page and click "Import from GMB"'
    ELSE '3️⃣ Open Business Info page and check browser console for logs'
  END as action;

