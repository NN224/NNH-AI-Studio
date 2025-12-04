/**
 * 🚀 ADD ONBOARDING TRACKING TO PROFILES
 *
 * Adds columns to track user onboarding progress and feature discovery
 * for the progressive onboarding system.
 *
 * Onboarding Stages:
 * 1 - Preview Mode (demo data)
 * 2 - GMB Connection (connect account)
 * 3 - Initial Sync (Business DNA building)
 * 4 - Feature Discovery (learning features)
 * 5 - Fully Onboarded (complete)
 */

-- Add onboarding tracking columns to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_stage INTEGER DEFAULT 1 CHECK (onboarding_stage BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_onboarding_steps TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS dismissed_feature_tips TEXT[] DEFAULT '{}';

-- Add comments explaining the new columns
COMMENT ON COLUMN profiles.onboarding_stage IS 'Current onboarding stage (1=Preview, 2=GMB Connection, 3=Initial Sync, 4=Feature Discovery, 5=Complete)';
COMMENT ON COLUMN profiles.onboarding_completed_at IS 'Timestamp when user completed full onboarding';
COMMENT ON COLUMN profiles.completed_onboarding_steps IS 'Array of completed onboarding step IDs';
COMMENT ON COLUMN profiles.dismissed_feature_tips IS 'Array of dismissed feature tip IDs';

-- Add index for querying users by onboarding stage
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_stage
ON profiles(onboarding_stage)
WHERE onboarding_stage < 5;

-- Add index for incomplete onboarding (for follow-up campaigns)
CREATE INDEX IF NOT EXISTS idx_profiles_incomplete_onboarding
ON profiles(onboarding_stage, created_at)
WHERE onboarding_stage < 5 AND onboarding_completed_at IS NULL;
