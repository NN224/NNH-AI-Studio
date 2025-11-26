-- ============================================
-- Migration: Fix Database Issues
-- Created: 2025-01-31
-- Description: Fixes duplicate locations, adds missing constraints, and improves data integrity
-- ============================================

-- ============================================
-- 1. FIX DUPLICATE LOCATIONS ISSUE
-- ============================================

-- Step 1: Add normalized_location_id column
-- This will store the normalized location ID (extracted from full resource name)
ALTER TABLE public.gmb_locations
ADD COLUMN IF NOT EXISTS normalized_location_id TEXT;

-- Step 2: Populate normalized_location_id for existing records
-- Extract location ID from various formats:
-- - "locations/123456" -> "123456"
-- - "accounts/.../locations/123456" -> "123456"
UPDATE public.gmb_locations
SET normalized_location_id = 
  CASE 
    WHEN location_id LIKE 'locations/%' THEN 
      SUBSTRING(location_id FROM 'locations/([^/]+)$')
    WHEN location_id LIKE 'accounts/%/locations/%' THEN 
      SUBSTRING(location_id FROM 'locations/([^/]+)$')
    ELSE location_id
  END
WHERE normalized_location_id IS NULL;

-- Step 3: Create index on normalized_location_id for performance
CREATE INDEX IF NOT EXISTS idx_gmb_locations_normalized_id 
ON public.gmb_locations(normalized_location_id);

-- Step 4: Create index on (gmb_account_id, normalized_location_id) for uniqueness check
CREATE INDEX IF NOT EXISTS idx_gmb_locations_account_normalized 
ON public.gmb_locations(gmb_account_id, normalized_location_id);

-- Step 5: Delete duplicate locations
-- Keep the location with:
-- 1. Most complete metadata
-- 2. Latest updated_at
-- 3. Active status
DELETE FROM public.gmb_locations
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      gmb_account_id,
      normalized_location_id,
      -- Calculate completeness score
      (
        CASE WHEN (metadata->>'profile')::jsonb->>'description' IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN (metadata->>'regularHours')::jsonb->'periods' IS NOT NULL 
             AND jsonb_array_length((metadata->>'regularHours')::jsonb->'periods') > 0 THEN 1 ELSE 0 END +
        CASE WHEN (metadata->>'serviceItems') IS NOT NULL 
             AND jsonb_array_length((metadata->>'serviceItems')::jsonb) > 0 THEN 1 ELSE 0 END +
        CASE WHEN (metadata->>'openInfo')::jsonb->>'status' IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN category IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN phone IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN website IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN rating > 0 THEN 1 ELSE 0 END +
        CASE WHEN is_active = true THEN 1 ELSE 0 END
      ) as completeness_score,
      ROW_NUMBER() OVER (
        PARTITION BY gmb_account_id, normalized_location_id
        ORDER BY 
          -- Prefer active locations
          is_active DESC,
          -- Prefer locations with more complete metadata
          (
            CASE WHEN (metadata->>'profile')::jsonb->>'description' IS NOT NULL THEN 1 ELSE 0 END +
            CASE WHEN (metadata->>'regularHours')::jsonb->'periods' IS NOT NULL THEN 1 ELSE 0 END +
            CASE WHEN (metadata->>'serviceItems') IS NOT NULL THEN 1 ELSE 0 END +
            CASE WHEN (metadata->>'openInfo')::jsonb->>'status' IS NOT NULL THEN 1 ELSE 0 END +
            CASE WHEN category IS NOT NULL THEN 1 ELSE 0 END +
            CASE WHEN phone IS NOT NULL THEN 1 ELSE 0 END +
            CASE WHEN website IS NOT NULL THEN 1 ELSE 0 END
          ) DESC,
          -- Prefer latest updated
          updated_at DESC,
          created_at DESC
      ) as rn
    FROM public.gmb_locations
    WHERE normalized_location_id IS NOT NULL
      AND gmb_account_id IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- Step 6: Update orphaned reviews to point to the kept location
-- This handles reviews that were pointing to deleted duplicate locations
UPDATE public.gmb_reviews r
SET location_id = (
  SELECT l.id
  FROM public.gmb_locations l
  WHERE l.normalized_location_id = (
    SELECT normalized_location_id
    FROM public.gmb_locations
    WHERE id = r.location_id
  )
  ORDER BY l.updated_at DESC
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1
  FROM public.gmb_locations
  WHERE id = r.location_id
    AND normalized_location_id IN (
      SELECT normalized_location_id
      FROM public.gmb_locations
      GROUP BY normalized_location_id, gmb_account_id
      HAVING COUNT(*) > 1
    )
);

-- Step 7: Update orphaned posts to point to the kept location
UPDATE public.gmb_posts p
SET location_id = (
  SELECT l.id
  FROM public.gmb_locations l
  WHERE l.normalized_location_id = (
    SELECT normalized_location_id
    FROM public.gmb_locations
    WHERE id = p.location_id
  )
  ORDER BY l.updated_at DESC
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1
  FROM public.gmb_locations
  WHERE id = p.location_id
    AND normalized_location_id IN (
      SELECT normalized_location_id
      FROM public.gmb_locations
      GROUP BY normalized_location_id, gmb_account_id
      HAVING COUNT(*) > 1
    )
);

-- Step 8: Update orphaned media to point to the kept location
UPDATE public.gmb_media m
SET location_id = (
  SELECT l.id
  FROM public.gmb_locations l
  WHERE l.normalized_location_id = (
    SELECT normalized_location_id
    FROM public.gmb_locations
    WHERE id = m.location_id
  )
  ORDER BY l.updated_at DESC
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1
  FROM public.gmb_locations
  WHERE id = m.location_id
    AND normalized_location_id IN (
      SELECT normalized_location_id
      FROM public.gmb_locations
      GROUP BY normalized_location_id, gmb_account_id
      HAVING COUNT(*) > 1
    )
);

-- Step 9: Update orphaned performance metrics
UPDATE public.gmb_performance_metrics pm
SET location_id = (
  SELECT l.id
  FROM public.gmb_locations l
  WHERE l.normalized_location_id = (
    SELECT normalized_location_id
    FROM public.gmb_locations
    WHERE id = pm.location_id
  )
  ORDER BY l.updated_at DESC
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1
  FROM public.gmb_locations
  WHERE id = pm.location_id
    AND normalized_location_id IN (
      SELECT normalized_location_id
      FROM public.gmb_locations
      GROUP BY normalized_location_id, gmb_account_id
      HAVING COUNT(*) > 1
    )
);

-- Step 10: Update orphaned search keywords
UPDATE public.gmb_search_keywords sk
SET location_id = (
  SELECT l.id
  FROM public.gmb_locations l
  WHERE l.normalized_location_id = (
    SELECT normalized_location_id
    FROM public.gmb_locations
    WHERE id = sk.location_id
  )
  ORDER BY l.updated_at DESC
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1
  FROM public.gmb_locations
  WHERE id = sk.location_id
    AND normalized_location_id IN (
      SELECT normalized_location_id
      FROM public.gmb_locations
      GROUP BY normalized_location_id, gmb_account_id
      HAVING COUNT(*) > 1
    )
);

-- Step 11: Add unique constraint to prevent future duplicates
-- This ensures one location per account per normalized_location_id
ALTER TABLE public.gmb_locations
DROP CONSTRAINT IF EXISTS unique_location_per_account_normalized;

ALTER TABLE public.gmb_locations
ADD CONSTRAINT unique_location_per_account_normalized 
UNIQUE (gmb_account_id, normalized_location_id);

-- ============================================
-- 2. FIX DATA INTEGRITY ISSUES
-- ============================================

-- Fix orphaned reviews (pointing to non-existent locations)
-- Option 1: Delete orphaned reviews
-- Option 2: Set location_id to NULL (if we want to keep the data)
-- We'll set to NULL and let RLS handle it, or mark for cleanup
UPDATE public.gmb_reviews
SET location_id = NULL
WHERE location_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.gmb_locations WHERE id = gmb_reviews.location_id
  );

-- Fix orphaned posts
UPDATE public.gmb_posts
SET location_id = NULL
WHERE location_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.gmb_locations WHERE id = gmb_posts.location_id
  );

-- Fix orphaned media
UPDATE public.gmb_media
SET location_id = NULL
WHERE location_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.gmb_locations WHERE id = gmb_media.location_id
  );

-- Fix orphaned performance metrics
DELETE FROM public.gmb_performance_metrics
WHERE location_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.gmb_locations WHERE id = gmb_performance_metrics.location_id
  );

-- Fix orphaned search keywords
DELETE FROM public.gmb_search_keywords
WHERE location_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.gmb_locations WHERE id = gmb_search_keywords.location_id
  );

-- Fix locations without accounts (shouldn't exist, but handle it)
UPDATE public.gmb_locations
SET gmb_account_id = (
  SELECT id FROM public.gmb_accounts 
  WHERE user_id = gmb_locations.user_id 
  AND is_active = true 
  LIMIT 1
)
WHERE gmb_account_id IS NULL
  AND user_id IS NOT NULL;

-- ============================================
-- 3. ADD MISSING CONSTRAINTS
-- ============================================

-- Ensure external_review_id is unique (if not already)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'gmb_reviews_external_review_id_key'
  ) THEN
    ALTER TABLE public.gmb_reviews
    ADD CONSTRAINT gmb_reviews_external_review_id_key 
    UNIQUE (external_review_id);
  END IF;
END $$;

-- Ensure external_media_id is unique (if table exists)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'gmb_media'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'gmb_media_external_media_id_key'
    ) THEN
      ALTER TABLE public.gmb_media
      ADD CONSTRAINT gmb_media_external_media_id_key 
      UNIQUE (external_media_id);
    END IF;
  END IF;
END $$;

-- ============================================
-- 4. ADD MISSING INDEXES
-- ============================================

-- Index for location queries by account
CREATE INDEX IF NOT EXISTS idx_gmb_locations_account_active 
ON public.gmb_locations(gmb_account_id, is_active) 
WHERE is_active = true;

-- Index for location queries by user
CREATE INDEX IF NOT EXISTS idx_gmb_locations_user_active 
ON public.gmb_locations(user_id, is_active) 
WHERE is_active = true;

-- Index for reviews by location and status
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_location_status 
ON public.gmb_reviews(location_id, status) 
WHERE status IN ('new', 'in_progress');

-- Index for posts by location and status
CREATE INDEX IF NOT EXISTS idx_gmb_posts_location_status 
ON public.gmb_posts(location_id, status);

-- Index for posts by scheduled_at
CREATE INDEX IF NOT EXISTS idx_gmb_posts_scheduled 
ON public.gmb_posts(scheduled_at) 
WHERE scheduled_at IS NOT NULL AND status = 'queued';

-- ============================================
-- 5. ADD TRIGGER TO AUTO-UPDATE normalized_location_id
-- ============================================

-- Create function to normalize location_id
CREATE OR REPLACE FUNCTION public.normalize_location_id(location_id TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE 
    WHEN location_id LIKE 'locations/%' THEN 
      SUBSTRING(location_id FROM 'locations/([^/]+)$')
    WHEN location_id LIKE 'accounts/%/locations/%' THEN 
      SUBSTRING(location_id FROM 'locations/([^/]+)$')
    ELSE location_id
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create trigger to auto-update normalized_location_id on insert/update
CREATE OR REPLACE FUNCTION public.update_normalized_location_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.normalized_location_id = public.normalize_location_id(NEW.location_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_normalized_location_id ON public.gmb_locations;

CREATE TRIGGER trigger_update_normalized_location_id
BEFORE INSERT OR UPDATE OF location_id ON public.gmb_locations
FOR EACH ROW
EXECUTE FUNCTION public.update_normalized_location_id();

-- ============================================
-- 6. ADD COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN public.gmb_locations.normalized_location_id IS 
'Normalized location ID extracted from full resource name. Used to prevent duplicates.';

COMMENT ON CONSTRAINT unique_location_per_account_normalized ON public.gmb_locations IS 
'Ensures one location per account per normalized location ID. Prevents duplicate locations.';

-- ============================================
-- 7. VERIFY MIGRATION
-- ============================================

-- Check if duplicates were removed
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT gmb_account_id, normalized_location_id
    FROM public.gmb_locations
    WHERE normalized_location_id IS NOT NULL
      AND gmb_account_id IS NOT NULL
    GROUP BY gmb_account_id, normalized_location_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE WARNING 'Still found % duplicate locations after migration', duplicate_count;
  ELSE
    RAISE NOTICE 'All duplicate locations have been removed successfully';
  END IF;
END $$;

-- ============================================
-- END OF MIGRATION
-- ============================================
