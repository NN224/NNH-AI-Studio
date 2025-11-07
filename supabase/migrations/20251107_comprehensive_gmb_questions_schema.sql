-- Migration: Comprehensive gmb_questions table update
-- Created: 2025-11-07
-- Description: Updates gmb_questions table to match production requirements

-- Add missing columns if they don't exist
DO $$ 
BEGIN
  -- Question ID (rename external_question_id to question_id for consistency)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gmb_questions' AND column_name = 'question_id'
  ) THEN
    ALTER TABLE public.gmb_questions ADD COLUMN question_id TEXT UNIQUE;
    -- Copy data from external_question_id if it exists
    UPDATE public.gmb_questions 
    SET question_id = external_question_id 
    WHERE external_question_id IS NOT NULL AND question_id IS NULL;
  END IF;

  -- Asked at timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gmb_questions' AND column_name = 'asked_at'
  ) THEN
    ALTER TABLE public.gmb_questions ADD COLUMN asked_at TIMESTAMPTZ;
    -- Copy from created_at if asked_at is null
    UPDATE public.gmb_questions 
    SET asked_at = created_at 
    WHERE asked_at IS NULL;
  END IF;

  -- Author display name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gmb_questions' AND column_name = 'author_display_name'
  ) THEN
    ALTER TABLE public.gmb_questions ADD COLUMN author_display_name TEXT;
  END IF;

  -- Author profile photo URL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gmb_questions' AND column_name = 'author_profile_photo_url'
  ) THEN
    ALTER TABLE public.gmb_questions ADD COLUMN author_profile_photo_url TEXT;
  END IF;

  -- Answer ID
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gmb_questions' AND column_name = 'answer_id'
  ) THEN
    ALTER TABLE public.gmb_questions ADD COLUMN answer_id TEXT;
  END IF;

  -- Total answer count
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gmb_questions' AND column_name = 'total_answer_count'
  ) THEN
    ALTER TABLE public.gmb_questions ADD COLUMN total_answer_count INTEGER DEFAULT 0;
  END IF;

  -- Status (separate from answer_status)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gmb_questions' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.gmb_questions ADD COLUMN status TEXT DEFAULT 'pending' 
      CHECK (status IN ('pending', 'answered', 'flagged', 'archived'));
  END IF;

  -- Priority
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gmb_questions' AND column_name = 'priority'
  ) THEN
    ALTER TABLE public.gmb_questions ADD COLUMN priority TEXT 
      CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
  END IF;

  -- Question URL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gmb_questions' AND column_name = 'question_url'
  ) THEN
    ALTER TABLE public.gmb_questions ADD COLUMN question_url TEXT;
  END IF;

  -- Google resource name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gmb_questions' AND column_name = 'google_resource_name'
  ) THEN
    ALTER TABLE public.gmb_questions ADD COLUMN google_resource_name TEXT;
  END IF;

  -- Internal notes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gmb_questions' AND column_name = 'internal_notes'
  ) THEN
    ALTER TABLE public.gmb_questions ADD COLUMN internal_notes TEXT;
  END IF;

  -- AI category
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gmb_questions' AND column_name = 'ai_category'
  ) THEN
    ALTER TABLE public.gmb_questions ADD COLUMN ai_category TEXT;
  END IF;

  -- AI answer generated flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gmb_questions' AND column_name = 'ai_answer_generated'
  ) THEN
    ALTER TABLE public.gmb_questions ADD COLUMN ai_answer_generated BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Update answer_status check constraint to include 'unanswered' and 'deleted'
ALTER TABLE public.gmb_questions 
  DROP CONSTRAINT IF EXISTS gmb_questions_answer_status_check;

ALTER TABLE public.gmb_questions 
  ADD CONSTRAINT gmb_questions_answer_status_check 
  CHECK (answer_status IN ('unanswered', 'answered', 'deleted', 'pending', 'draft'));

-- Update status based on answer_status if status is null
UPDATE public.gmb_questions 
SET status = CASE 
  WHEN answer_status = 'answered' THEN 'answered'
  WHEN answer_status = 'pending' OR answer_status = 'unanswered' THEN 'pending'
  ELSE 'pending'
END
WHERE status IS NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_questions_question_id 
  ON public.gmb_questions(question_id);

CREATE INDEX IF NOT EXISTS idx_questions_asked_at 
  ON public.gmb_questions(asked_at DESC);

CREATE INDEX IF NOT EXISTS idx_questions_priority 
  ON public.gmb_questions(priority);

CREATE INDEX IF NOT EXISTS idx_questions_upvotes 
  ON public.gmb_questions(upvote_count DESC);

CREATE INDEX IF NOT EXISTS idx_questions_status 
  ON public.gmb_questions(status);

-- Create question_templates table for FAQ library
CREATE TABLE IF NOT EXISTS public.question_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  question_pattern TEXT NOT NULL,
  template_answer TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for question_templates
CREATE INDEX IF NOT EXISTS idx_question_templates_user 
  ON public.question_templates(user_id);

CREATE INDEX IF NOT EXISTS idx_question_templates_category 
  ON public.question_templates(category);

CREATE INDEX IF NOT EXISTS idx_question_templates_usage 
  ON public.question_templates(usage_count DESC);

-- RLS for question_templates
ALTER TABLE public.question_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own templates"
  ON public.question_templates
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_question_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_question_templates_updated_at ON public.question_templates;

CREATE TRIGGER trigger_update_question_templates_updated_at
BEFORE UPDATE ON public.question_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_question_templates_updated_at();

-- Comments
COMMENT ON TABLE public.question_templates IS 'FAQ library for common question templates';
COMMENT ON COLUMN public.question_templates.question_pattern IS 'Pattern to match questions (e.g., "what are your hours")';
COMMENT ON COLUMN public.question_templates.template_answer IS 'Template answer for matching questions';

