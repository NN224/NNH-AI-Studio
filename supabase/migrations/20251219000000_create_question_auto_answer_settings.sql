-- ============================================
-- Create question_auto_answer_settings table
-- ============================================

-- Create the table for question auto-answer settings
CREATE TABLE IF NOT EXISTS public.question_auto_answer_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.gmb_locations(id) ON DELETE CASCADE,
    
    -- Core settings
    enabled BOOLEAN DEFAULT false,
    confidence_threshold INTEGER DEFAULT 80 CHECK (confidence_threshold >= 0 AND confidence_threshold <= 100),
    
    -- Question type settings
    answer_hours_questions BOOLEAN DEFAULT true,
    answer_location_questions BOOLEAN DEFAULT true,
    answer_services_questions BOOLEAN DEFAULT true,
    answer_pricing_questions BOOLEAN DEFAULT false,
    answer_general_questions BOOLEAN DEFAULT true,
    
    -- Response configuration
    tone TEXT DEFAULT 'professional' CHECK (tone IN ('professional', 'friendly', 'casual')),
    language_preference TEXT DEFAULT 'auto',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Unique constraint: one setting per user per location (null location = global)
    CONSTRAINT unique_user_location_question_setting UNIQUE (user_id, location_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_question_auto_answer_settings_user_id ON public.question_auto_answer_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_question_auto_answer_settings_location_id ON public.question_auto_answer_settings(location_id);
CREATE INDEX IF NOT EXISTS idx_question_auto_answer_settings_user_location ON public.question_auto_answer_settings(user_id, location_id);

-- Enable RLS
ALTER TABLE public.question_auto_answer_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own settings
CREATE POLICY "Users can view own question_auto_answer_settings"
    ON public.question_auto_answer_settings
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own settings
CREATE POLICY "Users can insert own question_auto_answer_settings"
    ON public.question_auto_answer_settings
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own settings
CREATE POLICY "Users can update own question_auto_answer_settings"
    ON public.question_auto_answer_settings
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own settings
CREATE POLICY "Users can delete own question_auto_answer_settings"
    ON public.question_auto_answer_settings
    FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_question_auto_answer_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_question_auto_answer_settings_updated_at ON public.question_auto_answer_settings;
CREATE TRIGGER trigger_update_question_auto_answer_settings_updated_at
    BEFORE UPDATE ON public.question_auto_answer_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_question_auto_answer_settings_updated_at();

-- Add comment for documentation
COMMENT ON TABLE public.question_auto_answer_settings IS 'Stores auto-answer configuration for questions per user and optionally per location';