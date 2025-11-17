-- ============================================
-- CHECK CRITICAL COLUMNS FOR BUSINESS INFO
-- ============================================

-- 1. Check gmb_locations critical columns
SELECT 
  column_name,
  data_type,
  CASE 
    WHEN column_name IN (
      'logo_url', 'cover_photo_url', 'rating', 'calculated_response_rate',
      'menu_url', 'booking_url', 'order_url', 'appointment_url',
      'from_the_business', 'additional_categories', 'business_hours', 'metadata'
    ) THEN '✅ REQUIRED'
    ELSE '⚠️ OPTIONAL'
  END as importance
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'gmb_locations'
  AND column_name IN (
    'logo_url', 'cover_photo_url', 'rating', 'calculated_response_rate',
    'menu_url', 'booking_url', 'order_url', 'appointment_url',
    'from_the_business', 'additional_categories', 'business_hours', 
    'regularhours', 'metadata', 'description', 'short_description',
    'opening_date', 'service_area_enabled', 'profile_completeness'
  )
ORDER BY 
  CASE 
    WHEN column_name IN (
      'logo_url', 'cover_photo_url', 'rating', 'calculated_response_rate',
      'menu_url', 'booking_url', 'order_url', 'appointment_url',
      'from_the_business', 'additional_categories', 'business_hours', 'metadata'
    ) THEN 1
    ELSE 2
  END,
  column_name;

-- 2. Check which critical columns are MISSING
WITH required_columns AS (
  SELECT unnest(ARRAY[
    'logo_url', 'cover_photo_url', 'rating', 'calculated_response_rate',
    'menu_url', 'booking_url', 'order_url', 'appointment_url',
    'from_the_business', 'additional_categories', 'business_hours', 'metadata'
  ]) as col_name
),
existing_columns AS (
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'gmb_locations'
)
SELECT 
  rc.col_name as missing_column,
  '❌ MISSING' as status,
  CASE 
    WHEN rc.col_name = 'logo_url' THEN 'ALTER TABLE gmb_locations ADD COLUMN logo_url TEXT;'
    WHEN rc.col_name = 'cover_photo_url' THEN 'ALTER TABLE gmb_locations ADD COLUMN cover_photo_url TEXT;'
    WHEN rc.col_name = 'rating' THEN 'ALTER TABLE gmb_locations ADD COLUMN rating NUMERIC(3,2);'
    WHEN rc.col_name = 'calculated_response_rate' THEN 'ALTER TABLE gmb_locations ADD COLUMN calculated_response_rate NUMERIC(5,2);'
    WHEN rc.col_name = 'menu_url' THEN 'ALTER TABLE gmb_locations ADD COLUMN menu_url TEXT;'
    WHEN rc.col_name = 'booking_url' THEN 'ALTER TABLE gmb_locations ADD COLUMN booking_url TEXT;'
    WHEN rc.col_name = 'order_url' THEN 'ALTER TABLE gmb_locations ADD COLUMN order_url TEXT;'
    WHEN rc.col_name = 'appointment_url' THEN 'ALTER TABLE gmb_locations ADD COLUMN appointment_url TEXT;'
    WHEN rc.col_name = 'from_the_business' THEN 'ALTER TABLE gmb_locations ADD COLUMN from_the_business TEXT[];'
    WHEN rc.col_name = 'additional_categories' THEN 'ALTER TABLE gmb_locations ADD COLUMN additional_categories TEXT[];'
    WHEN rc.col_name = 'business_hours' THEN 'ALTER TABLE gmb_locations ADD COLUMN business_hours JSONB;'
    WHEN rc.col_name = 'metadata' THEN 'ALTER TABLE gmb_locations ADD COLUMN metadata JSONB;'
  END as fix_command
FROM required_columns rc
LEFT JOIN existing_columns ec ON rc.col_name = ec.column_name
WHERE ec.column_name IS NULL;

-- 3. Check gmb_reviews critical columns
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'gmb_reviews'
  AND column_name IN ('has_reply', 'reply_text', 'review_reply', 'response_text', 'replied_at', 'responded_at')
ORDER BY column_name;

-- 4. Check which review columns are MISSING
WITH required_review_columns AS (
  SELECT unnest(ARRAY['has_reply', 'reply_text']) as col_name
),
existing_review_columns AS (
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'gmb_reviews'
)
SELECT 
  rc.col_name as missing_column,
  '❌ MISSING' as status,
  CASE 
    WHEN rc.col_name = 'has_reply' THEN 'ALTER TABLE gmb_reviews ADD COLUMN has_reply BOOLEAN DEFAULT false;'
    WHEN rc.col_name = 'reply_text' THEN 'ALTER TABLE gmb_reviews ADD COLUMN reply_text TEXT;'
  END as fix_command
FROM required_review_columns rc
LEFT JOIN existing_review_columns ec ON rc.col_name = ec.column_name
WHERE ec.column_name IS NULL;

-- 5. Final Summary
SELECT 
  'If you see results above, run those ALTER TABLE commands!' as message,
  'If no results, everything is ✅ GOOD!' as status;

