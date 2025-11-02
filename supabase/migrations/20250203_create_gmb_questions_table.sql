-- Migration: Create gmb_questions table for Q&A feature
-- Created: 2025-02-03
-- Description: Creates table to store Google My Business questions and answers

-- Create gmb_questions table
CREATE TABLE IF NOT EXISTS public.gmb_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gmb_account_id UUID REFERENCES public.gmb_accounts(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES public.gmb_locations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Question details
  external_question_id TEXT UNIQUE, -- Google's question ID if available
  question_text TEXT NOT NULL,
  author_name TEXT,
  author_type TEXT CHECK (author_type IN ('MERCHANT', 'CUSTOMER', 'GOOGLE_USER')),
  
  -- Answer details
  answer_text TEXT,
  answered_by TEXT,
  answered_at TIMESTAMPTZ,
  answer_status TEXT DEFAULT 'pending' CHECK (answer_status IN ('pending', 'answered', 'draft')),
  
  -- AI suggestions
  ai_suggested_answer TEXT,
  ai_confidence_score DECIMAL(3,2) CHECK (ai_confidence_score >= 0 AND ai_confidence_score <= 1),
  
  -- Metadata
  upvote_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_hidden BOOLEAN DEFAULT false,
  language_code TEXT DEFAULT 'en',
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_gmb_questions_account 
  ON public.gmb_questions(gmb_account_id);
CREATE INDEX IF NOT EXISTS idx_gmb_questions_location 
  ON public.gmb_questions(location_id);
CREATE INDEX IF NOT EXISTS idx_gmb_questions_user 
  ON public.gmb_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_gmb_questions_status 
  ON public.gmb_questions(answer_status);
CREATE INDEX IF NOT EXISTS idx_gmb_questions_created 
  ON public.gmb_questions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gmb_questions_external_id 
  ON public.gmb_questions(external_question_id);

-- Enable Row Level Security
ALTER TABLE public.gmb_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gmb_questions
CREATE POLICY "Users can view their own questions"
  ON public.gmb_questions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own questions"
  ON public.gmb_questions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own questions"
  ON public.gmb_questions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own questions"
  ON public.gmb_questions FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE public.gmb_questions IS 'Stores Google My Business questions and answers for locations';
COMMENT ON COLUMN public.gmb_questions.external_question_id IS 'External question ID from Google if available';
COMMENT ON COLUMN public.gmb_questions.ai_suggested_answer IS 'AI-generated suggested answer for the question';
COMMENT ON COLUMN public.gmb_questions.ai_confidence_score IS 'Confidence score (0-1) for AI-generated answer';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_gmb_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_gmb_questions_updated_at ON public.gmb_questions;

CREATE TRIGGER trigger_update_gmb_questions_updated_at
BEFORE UPDATE ON public.gmb_questions
FOR EACH ROW
EXECUTE FUNCTION public.update_gmb_questions_updated_at();
