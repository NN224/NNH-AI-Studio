-- Check metadata for The DXB Night Club location
SELECT 
  id,
  location_name,
  description,
  additional_categories,
  from_the_business,
  menu_url,
  booking_url,
  order_url,
  appointment_url,
  opening_date,
  service_area_enabled,
  -- Check if metadata contains the data
  metadata->'profile' as metadata_profile,
  metadata->'attributes' as metadata_attributes,
  metadata->'placeActionLinks' as metadata_place_actions,
  metadata->'specialLinks' as metadata_special_links,
  metadata->'moreHours' as metadata_more_hours,
  metadata->'serviceItems' as metadata_service_items,
  -- Check categories
  metadata->'categories'->'primaryCategory'->>'displayName' as primary_category_name,
  metadata->'categories'->'additionalCategories' as additional_categories_metadata
FROM gmb_locations
WHERE location_name LIKE '%DXB Night Club%'
LIMIT 1;

