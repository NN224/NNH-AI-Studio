-- Migration: Fix Foreign Keys and Constraints to match JSON structure
-- Created: 2025-01-05
-- Description: Ensures all Foreign Keys are properly set and constraints match JSON structure

-- ============================================
-- 1. ENSURE ALL FOREIGN KEYS EXIST
-- ============================================

-- Add user_id to autopilot_logs if it doesn't exist (for better querying)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'autopilot_logs' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.autopilot_logs 
    ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    
    -- Update existing rows to set user_id from location
    UPDATE public.autopilot_logs al
    SET user_id = gl.user_id
    FROM public.gmb_locations gl
    WHERE al.location_id = gl.id 
    AND al.user_id IS NULL;
    
    -- Make it NOT NULL after populating
    ALTER TABLE public.autopilot_logs 
    ALTER COLUMN user_id SET NOT NULL;
    
    CREATE INDEX IF NOT EXISTS idx_autopilot_logs_user_id 
      ON public.autopilot_logs(user_id);
      
    RAISE NOTICE 'Added user_id column to autopilot_logs';
  END IF;
END $$;

-- Add user_id to competitor_tracking if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'competitor_tracking' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.competitor_tracking 
    ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    
    -- Update existing rows
    UPDATE public.competitor_tracking ct
    SET user_id = gl.user_id
    FROM public.gmb_locations gl
    WHERE ct.location_id = gl.id 
    AND ct.user_id IS NULL;
    
    -- Make it NOT NULL after populating
    ALTER TABLE public.competitor_tracking 
    ALTER COLUMN user_id SET NOT NULL;
    
    CREATE INDEX IF NOT EXISTS idx_competitor_tracking_user_id 
      ON public.competitor_tracking(user_id);
      
    RAISE NOTICE 'Added user_id column to competitor_tracking';
  END IF;
END $$;

-- Add user_id to citation_listings if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'citation_listings' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.citation_listings 
    ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    
    -- Update existing rows
    UPDATE public.citation_listings cl
    SET user_id = gl.user_id
    FROM public.gmb_locations gl
    WHERE cl.location_id = gl.id 
    AND cl.user_id IS NULL;
    
    -- Make it NOT NULL after populating
    ALTER TABLE public.citation_listings 
    ALTER COLUMN user_id SET NOT NULL;
    
    CREATE INDEX IF NOT EXISTS idx_citation_listings_user_id 
      ON public.citation_listings(user_id);
      
    RAISE NOTICE 'Added user_id column to citation_listings';
  END IF;
END $$;

-- ============================================
-- 2. ENSURE FOREIGN KEY CONSTRAINTS ARE CORRECT
-- ============================================

-- Verify all location_id foreign keys point to gmb_locations(id)
DO $$ 
BEGIN
  -- Check competitor_tracking
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'competitor_tracking') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'competitor_tracking'
        AND kcu.column_name = 'location_id'
        AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN
      ALTER TABLE public.competitor_tracking
      ADD CONSTRAINT fk_competitor_tracking_location 
      FOREIGN KEY (location_id) REFERENCES public.gmb_locations(id) ON DELETE CASCADE;
      
      RAISE NOTICE 'Added foreign key constraint for competitor_tracking.location_id';
    END IF;
  END IF;
END $$;

-- ============================================
-- 3. ENSURE UNIQUE CONSTRAINTS
-- ============================================

-- Ensure autopilot_settings has unique constraint on location_id
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'autopilot_settings') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'autopilot_settings_location_id_key'
      AND conrelid = 'public.autopilot_settings'::regclass
    ) THEN
      ALTER TABLE public.autopilot_settings
      ADD CONSTRAINT autopilot_settings_location_id_key UNIQUE (location_id);
      
      RAISE NOTICE 'Added unique constraint for autopilot_settings.location_id';
    END IF;
  END IF;
END $$;

-- Ensure ai_settings has unique constraint on (user_id, provider)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_settings') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'ai_settings_user_id_provider_key'
      AND conrelid = 'public.ai_settings'::regclass
    ) THEN
      ALTER TABLE public.ai_settings
      ADD CONSTRAINT ai_settings_user_id_provider_key UNIQUE (user_id, provider);
      
      RAISE NOTICE 'Added unique constraint for ai_settings(user_id, provider)';
    END IF;
  END IF;
END $$;

-- ============================================
-- 4. ENSURE CHECK CONSTRAINTS
-- ============================================

-- Ensure rating constraints are correct
DO $$ 
BEGIN
  -- competitor_tracking.average_rating
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'competitor_tracking') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'competitor_tracking_rating_check'
      AND conrelid = 'public.competitor_tracking'::regclass
    ) THEN
      ALTER TABLE public.competitor_tracking
      ADD CONSTRAINT competitor_tracking_rating_check 
      CHECK (average_rating IS NULL OR (average_rating >= 0 AND average_rating <= 5));
      
      RAISE NOTICE 'Added rating check constraint for competitor_tracking';
    END IF;
  END IF;
END $$;

-- ============================================
-- 5. UPDATE RLS POLICIES TO USE user_id WHERE POSSIBLE
-- ============================================

-- Update autopilot_logs RLS to use user_id if column exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'autopilot_logs' 
    AND column_name = 'user_id'
  ) THEN
    -- Drop old policy if exists
    DROP POLICY IF EXISTS "Users can view autopilot logs for their locations" ON public.autopilot_logs;
    
    -- Create new policy using user_id (more efficient)
    CREATE POLICY "Users can view their own autopilot logs"
      ON public.autopilot_logs FOR SELECT
      USING (auth.uid() = user_id);
      
    RAISE NOTICE 'Updated RLS policy for autopilot_logs to use user_id';
  END IF;
END $$;

-- Update competitor_tracking RLS to use user_id if column exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'competitor_tracking' 
    AND column_name = 'user_id'
  ) THEN
    -- Drop old policy if exists
    DROP POLICY IF EXISTS "Users can view competitor tracking for their locations" ON public.competitor_tracking;
    
    -- Create new policy using user_id (more efficient)
    CREATE POLICY "Users can view their own competitor tracking"
      ON public.competitor_tracking FOR SELECT
      USING (auth.uid() = user_id);
      
    RAISE NOTICE 'Updated RLS policy for competitor_tracking to use user_id';
  END IF;
END $$;

-- Update citation_listings RLS to use user_id if column exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'citation_listings' 
    AND column_name = 'user_id'
  ) THEN
    -- Drop old policy if exists
    DROP POLICY IF EXISTS "Users can view citation listings for their locations" ON public.citation_listings;
    
    -- Create new policy using user_id (more efficient)
    CREATE POLICY "Users can view their own citation listings"
      ON public.citation_listings FOR SELECT
      USING (auth.uid() = user_id);
      
    RAISE NOTICE 'Updated RLS policy for citation_listings to use user_id';
  END IF;
END $$;

