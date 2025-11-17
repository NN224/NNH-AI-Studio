-- Quick check for most important columns
SELECT 
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gmb_locations' AND column_name = 'logo_url'
  ) as has_logo_url,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gmb_locations' AND column_name = 'cover_photo_url'
  ) as has_cover_photo_url,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gmb_locations' AND column_name = 'metadata'
  ) as has_metadata,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gmb_locations' AND column_name = 'business_hours'
  ) as has_business_hours,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gmb_locations' AND column_name = 'menu_url'
  ) as has_menu_url,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gmb_reviews' AND column_name = 'has_reply'
  ) as has_reply_column,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gmb_reviews' AND column_name = 'reply_text'
  ) as has_reply_text;

-- If all return TRUE, everything is perfect!
-- If any return FALSE, that column needs to be added

