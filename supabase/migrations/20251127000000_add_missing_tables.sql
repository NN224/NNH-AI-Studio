-- Migration: Add 6 Missing Tables Referenced in Code
-- Created: 2025-11-27
-- Purpose: Fix critical database schema gaps discovered in production readiness audit
-- Issue: Code references tables that don't exist in database

BEGIN;

-- ============================================================================
-- 1. TEAMS TABLE
-- ============================================================================
-- Used in: lib/auth/rbac.ts (line 136)
-- Purpose: Team/organization management for multi-user workspaces

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Settings
  plan VARCHAR(50) DEFAULT 'free', -- free, pro, enterprise
  max_members INTEGER DEFAULT 5,

  -- Metadata
  logo_url TEXT,
  website TEXT,
  description TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_teams_owner_id ON teams(owner_id);
CREATE INDEX idx_teams_slug ON teams(slug);

-- RLS Policies
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view teams they own or are members of"
  ON teams FOR SELECT
  USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Only team owners can update teams"
  ON teams FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Only team owners can delete teams"
  ON teams FOR DELETE
  USING (auth.uid() = owner_id);

CREATE POLICY "Authenticated users can create teams"
  ON teams FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- ============================================================================
-- 2. TEAM_MEMBERS TABLE
-- ============================================================================
-- Used in: lib/auth/rbac.ts (lines 86-90, 131-135, 182-188)
-- Purpose: Team membership and role-based access control (RBAC)

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Role-based access control
  role VARCHAR(50) NOT NULL DEFAULT 'member', -- owner, admin, member, viewer

  -- Permissions (JSON for flexibility)
  permissions JSONB DEFAULT '{
    "reviews": {"read": true, "write": false, "delete": false},
    "questions": {"read": true, "write": false, "delete": false},
    "posts": {"read": true, "write": false, "delete": false},
    "locations": {"read": true, "write": false, "delete": false},
    "settings": {"read": false, "write": false, "delete": false}
  }'::jsonb,

  -- Status
  status VARCHAR(50) DEFAULT 'active', -- active, inactive, suspended

  -- Timestamps
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Unique constraint: one membership per user per team
  UNIQUE(team_id, user_id)
);

-- Indexes
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_role ON team_members(role);

-- RLS Policies
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view other members"
  ON team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Only team owners and admins can add members"
  ON team_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_id = team_members.team_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Only team owners and admins can update members"
  ON team_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Only team owners and admins can remove members"
  ON team_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- 3. TEAM_INVITATIONS TABLE
-- ============================================================================
-- Used in: lib/auth/rbac.ts (line 163)
-- Purpose: Invite users to join teams

CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Invitee information
  email VARCHAR(255) NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Role to be assigned upon acceptance
  role VARCHAR(50) NOT NULL DEFAULT 'member',

  -- Invitation token and expiry
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,

  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, declined, expired
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Unique constraint: one pending invitation per email per team
  UNIQUE(team_id, email, status)
);

-- Indexes
CREATE INDEX idx_team_invitations_team_id ON team_invitations(team_id);
CREATE INDEX idx_team_invitations_email ON team_invitations(email);
CREATE INDEX idx_team_invitations_token ON team_invitations(token);
CREATE INDEX idx_team_invitations_status ON team_invitations(status);

-- RLS Policies
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view invitations"
  ON team_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_invitations.team_id
      AND team_members.user_id = auth.uid()
    ) OR
    auth.jwt()->>'email' = email
  );

CREATE POLICY "Only team owners and admins can create invitations"
  ON team_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_invitations.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Only invited users can update their invitations"
  ON team_invitations FOR UPDATE
  USING (auth.jwt()->>'email' = email);

-- ============================================================================
-- 4. BRAND_PROFILES TABLE
-- ============================================================================
-- Used in: lib/services/ai-content-generation-service.ts (line 263)
-- Purpose: Store brand voice, tone, and guidelines for AI content generation

CREATE TABLE IF NOT EXISTS brand_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Brand Information
  brand_name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  target_audience TEXT,

  -- Brand Voice & Tone
  voice VARCHAR(50) DEFAULT 'professional', -- professional, casual, friendly, authoritative
  tone_guidelines TEXT,

  -- Content Preferences
  writing_style TEXT, -- Descriptive guidelines
  keywords TEXT[], -- Important keywords to include
  avoid_words TEXT[], -- Words/phrases to avoid

  -- AI Settings
  creativity_level INTEGER DEFAULT 7 CHECK (creativity_level BETWEEN 1 AND 10),
  formality_level INTEGER DEFAULT 7 CHECK (formality_level BETWEEN 1 AND 10),

  -- Example Content (for AI learning)
  example_posts TEXT[],
  example_responses TEXT[],

  -- Settings
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- One active brand profile per user (can have multiple inactive)
  UNIQUE(user_id, is_active) WHERE is_active = true
);

-- Indexes
CREATE INDEX idx_brand_profiles_user_id ON brand_profiles(user_id);
CREATE INDEX idx_brand_profiles_is_active ON brand_profiles(is_active);

-- RLS Policies
ALTER TABLE brand_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own brand profiles"
  ON brand_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own brand profiles"
  ON brand_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brand profiles"
  ON brand_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brand profiles"
  ON brand_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 5. AUTOPILOT_LOGS TABLE
-- ============================================================================
-- Used in: lib/services/ai-review-reply-service.ts (line 316)
-- Purpose: Track all automated AI actions for auditing and debugging

CREATE TABLE IF NOT EXISTS autopilot_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Action Details
  action_type VARCHAR(100) NOT NULL, -- review_reply, question_answer, post_creation, etc.
  entity_type VARCHAR(100) NOT NULL, -- gmb_review, gmb_question, gmb_post
  entity_id UUID NOT NULL, -- ID of the affected entity

  -- AI Provider Info
  ai_provider VARCHAR(50), -- anthropic, openai, google, etc.
  ai_model VARCHAR(100),

  -- Request/Response
  prompt_text TEXT,
  response_text TEXT,

  -- Metadata
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  tokens_used INTEGER,
  cost_usd DECIMAL(10,4),

  -- Status
  status VARCHAR(50) NOT NULL, -- success, failed, partial, skipped
  error_message TEXT,

  -- Timing
  processing_time_ms INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_autopilot_logs_user_id ON autopilot_logs(user_id);
CREATE INDEX idx_autopilot_logs_action_type ON autopilot_logs(action_type);
CREATE INDEX idx_autopilot_logs_entity_type ON autopilot_logs(entity_type);
CREATE INDEX idx_autopilot_logs_entity_id ON autopilot_logs(entity_id);
CREATE INDEX idx_autopilot_logs_status ON autopilot_logs(status);
CREATE INDEX idx_autopilot_logs_created_at ON autopilot_logs(created_at DESC);

-- RLS Policies
ALTER TABLE autopilot_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own autopilot logs"
  ON autopilot_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert autopilot logs"
  ON autopilot_logs FOR INSERT
  WITH CHECK (true); -- Allow service role to insert

-- ============================================================================
-- 6. QUESTION_TEMPLATES TABLE
-- ============================================================================
-- Used in: server/actions/questions-management.ts (lines 1032, 1078)
-- Purpose: Pre-defined templates for answering common questions

CREATE TABLE IF NOT EXISTS question_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Template Details
  title VARCHAR(255) NOT NULL,
  question_pattern TEXT NOT NULL, -- Pattern to match (regex or keywords)
  answer_template TEXT NOT NULL,

  -- Categorization
  category VARCHAR(100), -- hours, services, location, pricing, etc.
  tags TEXT[],

  -- AI Settings
  use_ai_enhancement BOOLEAN DEFAULT false,
  tone VARCHAR(50) DEFAULT 'professional',

  -- Usage Stats
  times_used INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Settings
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- Higher priority templates matched first

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_question_templates_user_id ON question_templates(user_id);
CREATE INDEX idx_question_templates_category ON question_templates(category);
CREATE INDEX idx_question_templates_is_active ON question_templates(is_active);
CREATE INDEX idx_question_templates_priority ON question_templates(priority DESC);

-- RLS Policies
ALTER TABLE question_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own question templates"
  ON question_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own question templates"
  ON question_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own question templates"
  ON question_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own question templates"
  ON question_templates FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- UPDATE TRIGGERS (Auto-update updated_at)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_invitations_updated_at
  BEFORE UPDATE ON team_invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brand_profiles_updated_at
  BEFORE UPDATE ON brand_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_question_templates_updated_at
  BEFORE UPDATE ON question_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE teams IS 'Teams/organizations for multi-user workspaces';
COMMENT ON TABLE team_members IS 'Team membership and role-based access control (RBAC)';
COMMENT ON TABLE team_invitations IS 'Pending invitations for users to join teams';
COMMENT ON TABLE brand_profiles IS 'Brand voice and guidelines for AI content generation';
COMMENT ON TABLE autopilot_logs IS 'Audit log for all automated AI actions';
COMMENT ON TABLE question_templates IS 'Templates for answering common questions';

COMMIT;
