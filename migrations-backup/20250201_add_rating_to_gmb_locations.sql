-- Add rating column to gmb_locations table
-- This column stores the average rating for the location

ALTER TABLE public.gmb_locations 
ADD COLUMN IF NOT EXISTS rating NUMERIC(2,1);

-- Add index for rating queries
CREATE INDEX IF NOT EXISTS idx_gmb_locations_rating ON public.gmb_locations(rating);

-- Add comment
COMMENT ON COLUMN public.gmb_locations.rating IS 'Average rating for the location (0.0 to 5.0)';

