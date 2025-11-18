-- Safe Migration: Enhanced Auto-Reply Settings
-- Created: 2025-01-20
-- Description: Add per-rating control (safe version - creates column if not exists)

-- ============================================
-- 1. Create require_approval column if not exists
-- ============================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auto_reply_settings' 
    AND column_name = 'require_approval'
  ) THEN
    ALTER TABLE auto_reply_settings
      ADD COLUMN require_approval BOOLEAN DEFAULT false;
  END IF;
END $$;

-- ============================================
-- 2. Add per-rating control columns
-- ============================================

ALTER TABLE auto_reply_settings
  ADD COLUMN IF NOT EXISTS auto_reply_1_star BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_reply_2_star BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_reply_3_star BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_reply_4_star BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_reply_5_star BOOLEAN DEFAULT true;

-- ============================================
-- 3. Set default for require_approval to false
-- ============================================

ALTER TABLE auto_reply_settings
  ALTER COLUMN require_approval SET DEFAULT false;

-- ============================================
-- 4. Update existing rows to disable approval
-- ============================================

DO $$
BEGIN
  -- Check if reply_to_positive exists before using it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auto_reply_settings' 
    AND column_name = 'reply_to_positive'
  ) THEN
    UPDATE auto_reply_settings
    SET 
      require_approval = false,
      auto_reply_1_star = COALESCE(reply_to_negative, true),
      auto_reply_2_star = COALESCE(reply_to_negative, true),
      auto_reply_3_star = COALESCE(reply_to_neutral, true),
      auto_reply_4_star = COALESCE(reply_to_positive, true),
      auto_reply_5_star = COALESCE(reply_to_positive, true),
      updated_at = NOW()
    WHERE require_approval IS NULL OR require_approval = true;
  ELSE
    -- If old columns don't exist, just set defaults
    UPDATE auto_reply_settings
    SET 
      require_approval = false,
      auto_reply_1_star = true,
      auto_reply_2_star = true,
      auto_reply_3_star = true,
      auto_reply_4_star = true,
      auto_reply_5_star = true,
      updated_at = NOW()
    WHERE require_approval IS NULL OR require_approval = true;
  END IF;
END $$;

-- ============================================
-- 5. Create index for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_auto_reply_settings_enabled 
  ON auto_reply_settings(enabled, require_approval) 
  WHERE enabled = true AND require_approval = false;

-- ============================================
-- 6. Add comments for documentation
-- ============================================

COMMENT ON COLUMN auto_reply_settings.require_approval IS 'Require manual approval before sending (default: false for instant replies)';
COMMENT ON COLUMN auto_reply_settings.auto_reply_1_star IS 'Auto-reply to 1-star reviews';
COMMENT ON COLUMN auto_reply_settings.auto_reply_2_star IS 'Auto-reply to 2-star reviews';
COMMENT ON COLUMN auto_reply_settings.auto_reply_3_star IS 'Auto-reply to 3-star reviews';
COMMENT ON COLUMN auto_reply_settings.auto_reply_4_star IS 'Auto-reply to 4-star reviews';
COMMENT ON COLUMN auto_reply_settings.auto_reply_5_star IS 'Auto-reply to 5-star reviews';

-- ============================================
-- 7. Verification query
-- ============================================

SELECT 
  'Migration completed successfully!' as status,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = 'auto_reply_settings' 
   AND column_name LIKE 'auto_reply_%_star') as new_columns_added;

