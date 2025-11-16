-- ============================================================================
-- ADD LOGO_URL AND CATEGORY SUPPORT
-- ============================================================================
-- Issue: Logo is not being fetched during sync, and media category is not stored
-- Solution: Add logo_url to gmb_locations and category to gmb_media
-- ============================================================================

-- 1. Add logo_url to gmb_locations
ALTER TABLE gmb_locations 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 2. Add category to gmb_media
ALTER TABLE gmb_media 
ADD COLUMN IF NOT EXISTS category TEXT;

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gmb_media_category 
ON gmb_media(category) 
WHERE category IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gmb_media_location_category 
ON gmb_media(location_id, category) 
WHERE category IS NOT NULL;

-- 4. Add comments
COMMENT ON COLUMN gmb_locations.logo_url IS 'Direct URL to location logo from GMB (mediaFormat: LOGO)';
COMMENT ON COLUMN gmb_media.category IS 'Media category from GMB: LOGO, COVER, PROFILE, ADDITIONAL, INTERIOR, EXTERIOR, PRODUCT, FOOD_AND_DRINK, MENU, COMMON_AREA, ROOMS, TEAMS, AT_WORK';

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Run these to verify the changes:

/*
-- Check if columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'gmb_locations' AND column_name = 'logo_url';

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'gmb_media' AND column_name = 'category';

-- Check media categories after next sync
SELECT 
  category,
  COUNT(*) as count,
  COUNT(DISTINCT location_id) as locations
FROM gmb_media
WHERE category IS NOT NULL
GROUP BY category
ORDER BY count DESC;

-- Check locations with logo
SELECT 
  location_name,
  CASE WHEN logo_url IS NOT NULL THEN '✅ Has Logo' ELSE '❌ No Logo' END as logo_status,
  CASE WHEN cover_photo_url IS NOT NULL THEN '✅ Has Cover' ELSE '❌ No Cover' END as cover_status
FROM gmb_locations
WHERE is_active = true;
*/

