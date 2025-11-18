-- Migration: Create Auto-Reply Settings Table
-- Created: 2025-01-15
-- Description: Create the auto_reply_settings table for managing auto-reply configuration

-- ============================================
-- 1. Create auto_reply_settings table
-- ============================================

CREATE TABLE IF NOT EXISTS auto_reply_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID REFERENCES gmb_locations(id) ON DELETE CASCADE,
  
  -- Core settings
  enabled BOOLEAN DEFAULT false,
  require_approval BOOLEAN DEFAULT false,
  response_style TEXT DEFAULT 'friendly',
  response_delay_minutes INTEGER DEFAULT 0,
  
  -- Legacy per-sentiment controls
  reply_to_positive BOOLEAN DEFAULT true,
  reply_to_neutral BOOLEAN DEFAULT false,
  reply_to_negative BOOLEAN DEFAULT false,
  
  -- Per-rating controls (added later in 20250120_enhance_auto_reply.sql)
  -- These will be added by the enhancement migration
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_user_location UNIQUE (user_id, location_id),
  CONSTRAINT valid_response_style CHECK (response_style IN ('friendly', 'professional', 'apologetic', 'marketing'))
);

-- ============================================
-- 2. Create indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_auto_reply_settings_user 
  ON auto_reply_settings(user_id);

CREATE INDEX IF NOT EXISTS idx_auto_reply_settings_location 
  ON auto_reply_settings(location_id);

CREATE INDEX IF NOT EXISTS idx_auto_reply_settings_enabled 
  ON auto_reply_settings(enabled) 
  WHERE enabled = true;

-- ============================================
-- 3. Enable Row Level Security (RLS)
-- ============================================

ALTER TABLE auto_reply_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. Create RLS Policies
-- ============================================

-- Users can view their own settings
CREATE POLICY "Users can view their own auto-reply settings"
  ON auto_reply_settings
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own settings
CREATE POLICY "Users can create their own auto-reply settings"
  ON auto_reply_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own settings
CREATE POLICY "Users can update their own auto-reply settings"
  ON auto_reply_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own settings
CREATE POLICY "Users can delete their own auto-reply settings"
  ON auto_reply_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 5. Create trigger for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_auto_reply_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_reply_settings_updated_at
  BEFORE UPDATE ON auto_reply_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_auto_reply_settings_updated_at();

-- ============================================
-- 6. Add comments for documentation
-- ============================================

COMMENT ON TABLE auto_reply_settings IS 'Configuration for automated review reply system';
COMMENT ON COLUMN auto_reply_settings.user_id IS 'User who owns these settings';
COMMENT ON COLUMN auto_reply_settings.location_id IS 'Specific location (NULL = all locations)';
COMMENT ON COLUMN auto_reply_settings.enabled IS 'Whether auto-reply is enabled';
COMMENT ON COLUMN auto_reply_settings.require_approval IS 'Whether replies need manual approval before sending';
COMMENT ON COLUMN auto_reply_settings.response_style IS 'Tone of auto-generated replies (friendly, professional, apologetic, marketing)';
COMMENT ON COLUMN auto_reply_settings.response_delay_minutes IS 'Delay in minutes before sending auto-reply';
COMMENT ON COLUMN auto_reply_settings.reply_to_positive IS 'Auto-reply to 4-5 star reviews (legacy)';
COMMENT ON COLUMN auto_reply_settings.reply_to_neutral IS 'Auto-reply to 3 star reviews (legacy)';
COMMENT ON COLUMN auto_reply_settings.reply_to_negative IS 'Auto-reply to 1-2 star reviews (legacy)';

