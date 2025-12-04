-- ============================================
-- Create auto_reply_settings table
-- ============================================

-- Create the table
CREATE TABLE IF NOT EXISTS public.auto_reply_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.gmb_locations(id) ON DELETE CASCADE,
    
    -- Core settings
    enabled BOOLEAN DEFAULT false,
    reply_to_positive BOOLEAN DEFAULT true,
    reply_to_neutral BOOLEAN DEFAULT false,
    reply_to_negative BOOLEAN DEFAULT false,
    require_approval BOOLEAN DEFAULT false,
    
    -- Response configuration
    response_style TEXT DEFAULT 'friendly' CHECK (response_style IN ('friendly', 'professional', 'apologetic', 'marketing')),
    response_delay_minutes INTEGER DEFAULT 4,
    language TEXT DEFAULT 'en',
    
    -- Per-rating controls (new system)
    auto_reply_1_star BOOLEAN DEFAULT true,
    auto_reply_2_star BOOLEAN DEFAULT true,
    auto_reply_3_star BOOLEAN DEFAULT true,
    auto_reply_4_star BOOLEAN DEFAULT true,
    auto_reply_5_star BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Unique constraint: one setting per user per location (null location = global)
    CONSTRAINT unique_user_location_setting UNIQUE (user_id, location_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_auto_reply_settings_user_id ON public.auto_reply_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_reply_settings_location_id ON public.auto_reply_settings(location_id);
CREATE INDEX IF NOT EXISTS idx_auto_reply_settings_user_location ON public.auto_reply_settings(user_id, location_id);

-- Enable RLS
ALTER TABLE public.auto_reply_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own settings
CREATE POLICY "Users can view own auto_reply_settings"
    ON public.auto_reply_settings
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own settings
CREATE POLICY "Users can insert own auto_reply_settings"
    ON public.auto_reply_settings
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own settings
CREATE POLICY "Users can update own auto_reply_settings"
    ON public.auto_reply_settings
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own settings
CREATE POLICY "Users can delete own auto_reply_settings"
    ON public.auto_reply_settings
    FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_auto_reply_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_auto_reply_settings_updated_at ON public.auto_reply_settings;
CREATE TRIGGER trigger_update_auto_reply_settings_updated_at
    BEFORE UPDATE ON public.auto_reply_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_auto_reply_settings_updated_at();

-- Add comment for documentation
COMMENT ON TABLE public.auto_reply_settings IS 'Stores auto-reply configuration per user and optionally per location';
