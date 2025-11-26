-- Migration: Comprehensive GMB Reviews Schema
-- Created: 2025-11-06
-- Description: Production-ready reviews management with all required fields

-- Create gmb_reviews table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.gmb_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.gmb_locations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Google identifiers
  external_review_id TEXT UNIQUE NOT NULL, -- Google's review ID
  google_my_business_name TEXT, -- Full resource name from Google
  review_url TEXT,
  
  -- Review details
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  review_date TIMESTAMPTZ NOT NULL, -- When customer posted review
  
  -- Reviewer information
  reviewer_name TEXT NOT NULL,
  reviewer_display_name TEXT,
  reviewer_profile_photo_url TEXT,
  is_verified_purchase BOOLEAN DEFAULT false,
  
  -- Reply information
  response TEXT, -- Our reply text
  reply_date TIMESTAMPTZ, -- When we replied
  responded_at TIMESTAMPTZ, -- Alias for compatibility
  has_reply BOOLEAN DEFAULT false,
  
  -- AI features (for Phase 3)
  ai_sentiment TEXT CHECK (ai_sentiment IN ('positive', 'neutral', 'negative')),
  ai_sentiment_score DECIMAL(3,2) CHECK (ai_sentiment_score >= 0 AND ai_sentiment_score <= 1),
  ai_generated_response TEXT, -- AI-suggested reply
  ai_reply_generated BOOLEAN DEFAULT false,
  ai_confidence_score DECIMAL(3,2),
  
  -- Status and categorization
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'replied', 'responded', 'flagged', 'archived')),
  response_priority TEXT CHECK (response_priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Internal management
  internal_notes TEXT,
  flagged_reason TEXT,
  tags TEXT[],
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
DECLARE
  target_schema CONSTANT TEXT := 'public';
  target_table  CONSTANT TEXT := 'gmb_reviews';
BEGIN
  -- Google identifiers
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = target_schema
      AND table_name = target_table
      AND column_name = 'external_review_id'
  ) THEN
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN external_review_id TEXT UNIQUE;', target_schema, target_table);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = target_schema AND table_name = target_table AND column_name = 'google_my_business_name'
  ) THEN
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN google_my_business_name TEXT;', target_schema, target_table);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = target_schema AND table_name = target_table AND column_name = 'review_url'
  ) THEN
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN review_url TEXT;', target_schema, target_table);
  END IF;

  -- Review details
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = target_schema AND table_name = target_table AND column_name = 'review_date'
  ) THEN
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN review_date TIMESTAMPTZ;', target_schema, target_table);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = target_schema AND table_name = target_table AND column_name = 'review_text'
  ) THEN
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN review_text TEXT;', target_schema, target_table);
  END IF;

  -- Reviewer info
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = target_schema AND table_name = target_table AND column_name = 'reviewer_name'
  ) THEN
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN reviewer_name TEXT;', target_schema, target_table);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = target_schema AND table_name = target_table AND column_name = 'reviewer_display_name'
  ) THEN
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN reviewer_display_name TEXT;', target_schema, target_table);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = target_schema AND table_name = target_table AND column_name = 'reviewer_profile_photo_url'
  ) THEN
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN reviewer_profile_photo_url TEXT;', target_schema, target_table);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = target_schema AND table_name = target_table AND column_name = 'is_verified_purchase'
  ) THEN
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN is_verified_purchase BOOLEAN DEFAULT false;', target_schema, target_table);
  END IF;

  -- Reply info
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = target_schema AND table_name = target_table AND column_name = 'response'
  ) THEN
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN response TEXT;', target_schema, target_table);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = target_schema AND table_name = target_table AND column_name = 'reply_date'
  ) THEN
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN reply_date TIMESTAMPTZ;', target_schema, target_table);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = target_schema AND table_name = target_table AND column_name = 'responded_at'
  ) THEN
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN responded_at TIMESTAMPTZ;', target_schema, target_table);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = target_schema AND table_name = target_table AND column_name = 'has_reply'
  ) THEN
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN has_reply BOOLEAN DEFAULT false;', target_schema, target_table);
  END IF;

  -- AI features
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = target_schema AND table_name = target_table AND column_name = 'ai_sentiment'
  ) THEN
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN ai_sentiment TEXT;', target_schema, target_table);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = target_schema AND table_name = target_table AND column_name = 'ai_sentiment_score'
  ) THEN
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN ai_sentiment_score DECIMAL(3,2);', target_schema, target_table);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = target_schema AND table_name = target_table AND column_name = 'ai_generated_response'
  ) THEN
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN ai_generated_response TEXT;', target_schema, target_table);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = target_schema AND table_name = target_table AND column_name = 'ai_reply_generated'
  ) THEN
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN ai_reply_generated BOOLEAN DEFAULT false;', target_schema, target_table);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = target_schema AND table_name = target_table AND column_name = 'ai_confidence_score'
  ) THEN
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN ai_confidence_score DECIMAL(3,2);', target_schema, target_table);
  END IF;

  -- Status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = target_schema AND table_name = target_table AND column_name = 'status'
  ) THEN
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN status TEXT DEFAULT ''pending'';', target_schema, target_table);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = target_schema AND table_name = target_table AND column_name = 'response_priority'
  ) THEN
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN response_priority TEXT;', target_schema, target_table);
  END IF;

  -- Internal management
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = target_schema AND table_name = target_table AND column_name = 'internal_notes'
  ) THEN
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN internal_notes TEXT;', target_schema, target_table);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = target_schema AND table_name = target_table AND column_name = 'flagged_reason'
  ) THEN
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN flagged_reason TEXT;', target_schema, target_table);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = target_schema AND table_name = target_table AND column_name = 'tags'
  ) THEN
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN tags TEXT[];', target_schema, target_table);
  END IF;

  -- Timestamps
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = target_schema AND table_name = target_table AND column_name = 'synced_at'
  ) THEN
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN synced_at TIMESTAMPTZ DEFAULT NOW();', target_schema, target_table);
  END IF;
END $$;

-- Create indexes for performance
DO $$
DECLARE
  target_schema CONSTANT TEXT := 'public';
  target_table  CONSTANT TEXT := 'gmb_reviews';
BEGIN
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_gmb_reviews_location ON %I.%I(location_id);', target_schema, target_table);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_gmb_reviews_user ON %I.%I(user_id);', target_schema, target_table);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_gmb_reviews_rating ON %I.%I(rating);', target_schema, target_table);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_gmb_reviews_has_reply ON %I.%I(has_reply);', target_schema, target_table);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_gmb_reviews_status ON %I.%I(status);', target_schema, target_table);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_gmb_reviews_review_date ON %I.%I(review_date DESC);', target_schema, target_table);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_gmb_reviews_sentiment ON %I.%I(ai_sentiment);', target_schema, target_table);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_gmb_reviews_external_id ON %I.%I(external_review_id);', target_schema, target_table);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_gmb_reviews_created_at ON %I.%I(created_at DESC);', target_schema, target_table);
END $$;

-- Enable Row Level Security
DO $$
DECLARE
  target_schema CONSTANT TEXT := 'public';
  target_table  CONSTANT TEXT := 'gmb_reviews';
BEGIN
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY;', target_schema, target_table);
END $$;

-- Drop existing policies if they exist
DO $$
DECLARE
  target_schema CONSTANT TEXT := 'public';
  target_table  CONSTANT TEXT := 'gmb_reviews';
BEGIN
  EXECUTE format('DROP POLICY IF EXISTS "Users can view their own reviews" ON %I.%I;', target_schema, target_table);
  EXECUTE format('DROP POLICY IF EXISTS "Users can insert their own reviews" ON %I.%I;', target_schema, target_table);
  EXECUTE format('DROP POLICY IF EXISTS "Users can update their own reviews" ON %I.%I;', target_schema, target_table);
  EXECUTE format('DROP POLICY IF EXISTS "Users can delete their own reviews" ON %I.%I;', target_schema, target_table);
END $$;

-- RLS Policies
DO $$
DECLARE
  target_schema CONSTANT TEXT := 'public';
  target_table  CONSTANT TEXT := 'gmb_reviews';
BEGIN
  EXECUTE format(
    $policy$
      CREATE POLICY "Users can view their own reviews"
        ON %I.%I FOR SELECT
        USING (auth.uid() = user_id);
    $policy$,
    target_schema,
    target_table
  );

  EXECUTE format(
    $policy$
      CREATE POLICY "Users can insert their own reviews"
        ON %I.%I FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    $policy$,
    target_schema,
    target_table
  );

  EXECUTE format(
    $policy$
      CREATE POLICY "Users can update their own reviews"
        ON %I.%I FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    $policy$,
    target_schema,
    target_table
  );

  EXECUTE format(
    $policy$
      CREATE POLICY "Users can delete their own reviews"
        ON %I.%I FOR DELETE
        USING (auth.uid() = user_id);
    $policy$,
    target_schema,
    target_table
  );
END $$;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_gmb_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  target_schema CONSTANT TEXT := 'public';
  target_table  CONSTANT TEXT := 'gmb_reviews';
BEGIN
  EXECUTE format('DROP TRIGGER IF EXISTS trigger_update_gmb_reviews_updated_at ON %I.%I;', target_schema, target_table);
  EXECUTE format(
    $trigger$
      CREATE TRIGGER trigger_update_gmb_reviews_updated_at
        BEFORE UPDATE ON %I.%I
        FOR EACH ROW
        EXECUTE FUNCTION public.update_gmb_reviews_updated_at();
    $trigger$,
    target_schema,
    target_table
  );
END $$;

-- Add comments for documentation
DO $$
DECLARE
  target_schema CONSTANT TEXT := 'public';
  target_table  CONSTANT TEXT := 'gmb_reviews';
BEGIN
  EXECUTE format(
    'COMMENT ON TABLE %I.%I IS %L;',
    target_schema,
    target_table,
    'Stores Google My Business reviews with AI analysis and reply management'
  );

  EXECUTE format(
    'COMMENT ON COLUMN %I.%I.external_review_id IS %L;',
    target_schema,
    target_table,
    'Unique review ID from Google My Business API'
  );

  EXECUTE format(
    'COMMENT ON COLUMN %I.%I.ai_sentiment IS %L;',
    target_schema,
    target_table,
    'AI-analyzed sentiment: positive, neutral, or negative'
  );

  EXECUTE format(
    'COMMENT ON COLUMN %I.%I.ai_generated_response IS %L;',
    target_schema,
    target_table,
    'AI-suggested reply text for this review'
  );

  EXECUTE format(
    'COMMENT ON COLUMN %I.%I.response_priority IS %L;',
    target_schema,
    target_table,
    'Priority level for responding to this review'
  );
END $$;

