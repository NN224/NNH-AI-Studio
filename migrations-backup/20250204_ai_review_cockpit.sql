-- Migration: AI Review Cockpit
-- Created: 2025-02-04
-- Description: Add fields and tables for AI Review Cockpit functionality

-- Add fields to gmb_reviews if not exist
ALTER TABLE public.gmb_reviews 
ADD COLUMN IF NOT EXISTS has_response BOOLEAN DEFAULT false;

ALTER TABLE public.gmb_reviews 
ADD COLUMN IF NOT EXISTS response_text TEXT;

ALTER TABLE public.gmb_reviews 
ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

-- Create AI analysis table
CREATE TABLE IF NOT EXISTS public.review_ai_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID REFERENCES public.gmb_reviews(id) ON DELETE CASCADE,
  sentiment VARCHAR(20) CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  sentiment_score DECIMAL(3,2),
  keywords TEXT[],
  ai_suggested_response TEXT,
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_review_ai_analysis_review_id ON public.review_ai_analysis(review_id);

-- RLS Policies
ALTER TABLE public.review_ai_analysis ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can view their own AI analysis" ON public.review_ai_analysis;
DROP POLICY IF EXISTS "Users can insert their own AI analysis" ON public.review_ai_analysis;
DROP POLICY IF EXISTS "Users can update their own AI analysis" ON public.review_ai_analysis;
DROP POLICY IF EXISTS "Users can delete their own AI analysis" ON public.review_ai_analysis;

-- Create RLS policies
CREATE POLICY "Users can view their own AI analysis"
  ON public.review_ai_analysis FOR SELECT
  USING (
    review_id IN (
      SELECT r.id FROM public.gmb_reviews r
      JOIN public.gmb_locations l ON r.location_id = l.id
      WHERE l.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own AI analysis"
  ON public.review_ai_analysis FOR INSERT
  WITH CHECK (
    review_id IN (
      SELECT r.id FROM public.gmb_reviews r
      JOIN public.gmb_locations l ON r.location_id = l.id
      WHERE l.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own AI analysis"
  ON public.review_ai_analysis FOR UPDATE
  USING (
    review_id IN (
      SELECT r.id FROM public.gmb_reviews r
      JOIN public.gmb_locations l ON r.location_id = l.id
      WHERE l.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own AI analysis"
  ON public.review_ai_analysis FOR DELETE
  USING (
    review_id IN (
      SELECT r.id FROM public.gmb_reviews r
      JOIN public.gmb_locations l ON r.location_id = l.id
      WHERE l.user_id = auth.uid()
    )
  );

-- Add comments
COMMENT ON COLUMN public.gmb_reviews.has_response IS 'Whether the review has a response';
COMMENT ON COLUMN public.gmb_reviews.response_text IS 'The response text for the review';
COMMENT ON COLUMN public.gmb_reviews.responded_at IS 'When the response was created';
COMMENT ON TABLE public.review_ai_analysis IS 'AI analysis data for reviews including sentiment and keywords';

