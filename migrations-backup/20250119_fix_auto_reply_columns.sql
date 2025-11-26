-- Migration: Fix Auto-Reply Settings Columns
-- Created: 2025-01-19
-- Description: Add missing columns to existing auto_reply_settings table

-- ============================================
-- 1. Add missing columns if they don't exist
-- ============================================

DO $$ 
BEGIN
  -- Add response_style if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auto_reply_settings' 
    AND column_name = 'response_style'
  ) THEN
    ALTER TABLE auto_reply_settings 
      ADD COLUMN response_style TEXT DEFAULT 'friendly';
    
    ALTER TABLE auto_reply_settings
      ADD CONSTRAINT valid_response_style 
      CHECK (response_style IN ('friendly', 'professional', 'apologetic', 'marketing'));
  END IF;

  -- Add response_delay_minutes if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auto_reply_settings' 
    AND column_name = 'response_delay_minutes'
  ) THEN
    ALTER TABLE auto_reply_settings 
      ADD COLUMN response_delay_minutes INTEGER DEFAULT 0;
  END IF;

  -- Add reply_to_positive if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auto_reply_settings' 
    AND column_name = 'reply_to_positive'
  ) THEN
    ALTER TABLE auto_reply_settings 
      ADD COLUMN reply_to_positive BOOLEAN DEFAULT true;
  END IF;

  -- Add reply_to_neutral if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auto_reply_settings' 
    AND column_name = 'reply_to_neutral'
  ) THEN
    ALTER TABLE auto_reply_settings 
      ADD COLUMN reply_to_neutral BOOLEAN DEFAULT false;
  END IF;

  -- Add reply_to_negative if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auto_reply_settings' 
    AND column_name = 'reply_to_negative'
  ) THEN
    ALTER TABLE auto_reply_settings 
      ADD COLUMN reply_to_negative BOOLEAN DEFAULT false;
  END IF;

  -- Add updated_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auto_reply_settings' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE auto_reply_settings 
      ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

END $$;

-- ============================================
-- 2. Create or replace trigger for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_auto_reply_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_reply_settings_updated_at ON auto_reply_settings;

CREATE TRIGGER auto_reply_settings_updated_at
  BEFORE UPDATE ON auto_reply_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_auto_reply_settings_updated_at();

-- ============================================
-- 3. Add comments for new columns
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auto_reply_settings' 
    AND column_name = 'response_style'
  ) THEN
    COMMENT ON COLUMN auto_reply_settings.response_style IS 
      'Tone of auto-generated replies (friendly, professional, apologetic, marketing)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auto_reply_settings' 
    AND column_name = 'response_delay_minutes'
  ) THEN
    COMMENT ON COLUMN auto_reply_settings.response_delay_minutes IS 
      'Delay in minutes before sending auto-reply';
  END IF;
END $$;

-- ============================================
-- 4. Verify table structure
-- ============================================

-- This will show you all columns in the table
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'auto_reply_settings'
ORDER BY ordinal_position;

