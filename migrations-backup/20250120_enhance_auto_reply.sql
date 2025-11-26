-- Migration: Enhanced Auto-Reply Settings
-- Created: 2025-01-20
-- Description: Add per-rating control and set requireApproval default to false

-- ============================================
-- 1. Add per-rating control columns
-- ============================================

ALTER TABLE auto_reply_settings
  ADD COLUMN IF NOT EXISTS auto_reply_1_star BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_reply_2_star BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_reply_3_star BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_reply_4_star BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_reply_5_star BOOLEAN DEFAULT true;

-- ============================================
-- 2. Set default for require_approval to false
-- ============================================

ALTER TABLE auto_reply_settings
  ALTER COLUMN require_approval SET DEFAULT false;

-- ============================================
-- 3. Update existing rows to disable approval
-- ============================================

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

-- ============================================
-- 4. Create index for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_auto_reply_settings_enabled 
  ON auto_reply_settings(enabled, require_approval) 
  WHERE enabled = true AND require_approval = false;

-- ============================================
-- 5. Add comment for documentation
-- ============================================

COMMENT ON COLUMN auto_reply_settings.auto_reply_1_star IS 'Auto-reply to 1-star reviews';
COMMENT ON COLUMN auto_reply_settings.auto_reply_2_star IS 'Auto-reply to 2-star reviews';
COMMENT ON COLUMN auto_reply_settings.auto_reply_3_star IS 'Auto-reply to 3-star reviews';
COMMENT ON COLUMN auto_reply_settings.auto_reply_4_star IS 'Auto-reply to 4-star reviews';
COMMENT ON COLUMN auto_reply_settings.auto_reply_5_star IS 'Auto-reply to 5-star reviews';

