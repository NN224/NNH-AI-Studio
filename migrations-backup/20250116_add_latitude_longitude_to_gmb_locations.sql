-- Migration: Add latitude and longitude columns to gmb_locations table
-- Created: 2025-01-16
-- Description: Adds latitude and longitude columns to gmb_locations table and populates them from metadata.latlng

-- Step 1: Add latitude and longitude columns
ALTER TABLE public.gmb_locations
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Step 2: Populate latitude and longitude from metadata.latlng for existing records
-- Handle { latitude, longitude } format
UPDATE public.gmb_locations
SET 
  latitude = CASE 
    WHEN metadata->'latlng'->>'latitude' IS NOT NULL 
    THEN (metadata->'latlng'->>'latitude')::DOUBLE PRECISION
    ELSE NULL
  END,
  longitude = CASE 
    WHEN metadata->'latlng'->>'longitude' IS NOT NULL 
    THEN (metadata->'latlng'->>'longitude')::DOUBLE PRECISION
    ELSE NULL
  END
WHERE 
  latitude IS NULL 
  AND longitude IS NULL
  AND metadata->'latlng' IS NOT NULL
  AND metadata->'latlng'->>'latitude' IS NOT NULL
  AND metadata->'latlng'->>'longitude' IS NOT NULL;

-- Step 3: Create indexes for latitude and longitude columns for better query performance
CREATE INDEX IF NOT EXISTS idx_gmb_locations_latitude 
  ON public.gmb_locations(latitude) 
  WHERE latitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gmb_locations_longitude 
  ON public.gmb_locations(longitude) 
  WHERE longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gmb_locations_coordinates 
  ON public.gmb_locations(latitude, longitude) 
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Step 4: Add comments for documentation
COMMENT ON COLUMN public.gmb_locations.latitude IS 'Latitude coordinate of the location (from Google API latlng)';
COMMENT ON COLUMN public.gmb_locations.longitude IS 'Longitude coordinate of the location (from Google API latlng)';

