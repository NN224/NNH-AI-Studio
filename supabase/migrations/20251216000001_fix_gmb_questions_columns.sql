-- ============================================
-- Fix gmb_questions table - add missing columns
-- ============================================

-- Add missing columns for AI features
ALTER TABLE public.gmb_questions 
ADD COLUMN IF NOT EXISTS ai_suggested_answer TEXT;

ALTER TABLE public.gmb_questions 
ADD COLUMN IF NOT EXISTS ai_confidence_score DECIMAL(5,2);

-- Add answered_at as alias/copy of answer_date for code compatibility
-- Or we can just add it as a new column
ALTER TABLE public.gmb_questions 
ADD COLUMN IF NOT EXISTS answered_at TIMESTAMPTZ;

-- Sync answered_at with answer_date for existing records
UPDATE public.gmb_questions 
SET answered_at = answer_date 
WHERE answer_date IS NOT NULL AND answered_at IS NULL;

-- Create trigger to keep them in sync
CREATE OR REPLACE FUNCTION sync_answered_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.answer_date IS DISTINCT FROM OLD.answer_date THEN
        NEW.answered_at = NEW.answer_date;
    END IF;
    IF NEW.answered_at IS DISTINCT FROM OLD.answered_at THEN
        NEW.answer_date = NEW.answered_at;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_answered_at ON public.gmb_questions;
CREATE TRIGGER trigger_sync_answered_at
    BEFORE UPDATE ON public.gmb_questions
    FOR EACH ROW
    EXECUTE FUNCTION sync_answered_at();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_gmb_questions_ai_confidence 
ON public.gmb_questions(ai_confidence_score) 
WHERE ai_confidence_score IS NOT NULL;

-- Add comments
COMMENT ON COLUMN public.gmb_questions.ai_suggested_answer IS 'AI-generated suggested answer for the question';
COMMENT ON COLUMN public.gmb_questions.ai_confidence_score IS 'AI confidence score for the suggested answer (0-100)';
COMMENT ON COLUMN public.gmb_questions.answered_at IS 'Timestamp when question was answered (synced with answer_date)';
