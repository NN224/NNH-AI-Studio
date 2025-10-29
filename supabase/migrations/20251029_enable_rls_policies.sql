-- Migration: Enable Row Level Security (RLS) and create policies
-- Created: 2025-10-29
-- Description: Enable RLS on gmb_locations and gmb_reviews tables with user-specific policies

-- Step 1: Enable Row Level Security on gmb_locations
ALTER TABLE gmb_locations ENABLE ROW LEVEL SECURITY;

-- Step 2: Enable Row Level Security on gmb_reviews
ALTER TABLE gmb_reviews ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policy for gmb_locations - SELECT
CREATE POLICY "Users can view their own locations"
ON gmb_locations
FOR SELECT
USING (auth.uid() = user_id);

-- Step 4: Create RLS policy for gmb_locations - INSERT
CREATE POLICY "Users can insert their own locations"
ON gmb_locations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Step 5: Create RLS policy for gmb_locations - UPDATE
CREATE POLICY "Users can update their own locations"
ON gmb_locations
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Step 6: Create RLS policy for gmb_locations - DELETE
CREATE POLICY "Users can delete their own locations"
ON gmb_locations
FOR DELETE
USING (auth.uid() = user_id);

-- Step 7: Create RLS policy for gmb_reviews - SELECT
CREATE POLICY "Users can view their own reviews"
ON gmb_reviews
FOR SELECT
USING (auth.uid() = user_id);

-- Step 8: Create RLS policy for gmb_reviews - INSERT
CREATE POLICY "Users can insert their own reviews"
ON gmb_reviews
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Step 9: Create RLS policy for gmb_reviews - UPDATE
CREATE POLICY "Users can update their own reviews"
ON gmb_reviews
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Step 10: Create RLS policy for gmb_reviews - DELETE
CREATE POLICY "Users can delete their own reviews"
ON gmb_reviews
FOR DELETE
USING (auth.uid() = user_id);

COMMENT ON POLICY "Users can view their own locations" ON gmb_locations IS 'Allow users to view only their own locations';
COMMENT ON POLICY "Users can view their own reviews" ON gmb_reviews IS 'Allow users to view only their own reviews';
