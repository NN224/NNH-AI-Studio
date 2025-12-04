-- ============================================
-- Create autopilot_settings table
-- ============================================

CREATE TABLE IF NOT EXISTS public.autopilot_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.gmb_locations(id) ON DELETE CASCADE,
    
    -- Autopilot feature toggles
    is_enabled BOOLEAN DEFAULT false,
    auto_reply_enabled BOOLEAN DEFAULT false,
    smart_posting_enabled BOOLEAN DEFAULT false,
    
    -- Additional settings
    auto_answer_questions BOOLEAN DEFAULT false,
    notification_enabled BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Unique constraint
    CONSTRAINT unique_autopilot_user_location UNIQUE (user_id, location_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_autopilot_settings_user_id ON public.autopilot_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_autopilot_settings_location_id ON public.autopilot_settings(location_id);
CREATE INDEX IF NOT EXISTS idx_autopilot_settings_enabled ON public.autopilot_settings(user_id, is_enabled) WHERE is_enabled = true;

-- Enable RLS
ALTER TABLE public.autopilot_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own autopilot_settings"
    ON public.autopilot_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own autopilot_settings"
    ON public.autopilot_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own autopilot_settings"
    ON public.autopilot_settings FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own autopilot_settings"
    ON public.autopilot_settings FOR DELETE
    USING (auth.uid() = user_id);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_autopilot_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_autopilot_settings_updated ON public.autopilot_settings;
CREATE TRIGGER trigger_autopilot_settings_updated
    BEFORE UPDATE ON public.autopilot_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_autopilot_settings_timestamp();

COMMENT ON TABLE public.autopilot_settings IS 'Stores autopilot/automation settings per user and location';
