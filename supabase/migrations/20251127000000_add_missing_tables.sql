-- Migration: Add 6 Missing Tables Referenced in Code
-- Created: 2025-11-27
-- Purpose: Fix critical database schema gaps discovered in production readiness audit
-- Issue: Code references tables that don't exist in database

BEGIN;

-- ============================================================================
-- PART 1: CREATE ALL TABLES FIRST (without RLS policies)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TEAMS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan VARCHAR(50) DEFAULT 'free',
  max_members INTEGER DEFAULT 5,
  logo_url TEXT,
  website TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_teams_owner_id ON teams(owner_id);
CREATE INDEX idx_teams_slug ON teams(slug);

-- ----------------------------------------------------------------------------
-- 2. TEAM_MEMBERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  permissions JSONB DEFAULT '{
    "reviews": {"read": true, "write": false, "delete": false},
    "questions": {"read": true, "write": false, "delete": false},
    "posts": {"read": true, "write": false, "delete": false},
    "locations": {"read": true, "write": false, "delete": false},
    "settings": {"read": false, "write": false, "delete": false}
  }'::jsonb,
  status VARCHAR(50) DEFAULT 'active',
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(team_id, user_id)
);

CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_role ON team_members(role);

-- ----------------------------------------------------------------------------
-- 3. TEAM_INVITATIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(team_id, email, status)
);

CREATE INDEX idx_team_invitations_team_id ON team_invitations(team_id);
CREATE INDEX idx_team_invitations_email ON team_invitations(email);
CREATE INDEX idx_team_invitations_token ON team_invitations(token);
CREATE INDEX idx_team_invitations_status ON team_invitations(status);

-- ----------------------------------------------------------------------------
-- 4. BRAND_PROFILES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brand_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  target_audience TEXT,
  voice VARCHAR(50) DEFAULT 'professional',
  tone_guidelines TEXT,
  writing_style TEXT,
  keywords TEXT[],
  avoid_words TEXT[],
  creativity_level INTEGER DEFAULT 7 CHECK (creativity_level BETWEEN 1 AND 10),
  formality_level INTEGER DEFAULT 7 CHECK (formality_level BETWEEN 1 AND 10),
  example_posts TEXT[],
  example_responses TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_brand_profiles_user_id ON brand_profiles(user_id);
CREATE INDEX idx_brand_profiles_is_active ON brand_profiles(is_active);

-- Partial unique index: Only one active brand profile per user
CREATE UNIQUE INDEX idx_brand_profiles_user_active
  ON brand_profiles(user_id)
  WHERE is_active = true;

-- ----------------------------------------------------------------------------
-- 5. AUTOPILOT_LOGS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS autopilot_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  ai_provider VARCHAR(50),
  ai_model VARCHAR(100),
  prompt_text TEXT,
  response_text TEXT,
  confidence_score DECIMAL(3,2),
  tokens_used INTEGER,
  cost_usd DECIMAL(10,4),
  status VARCHAR(50) NOT NULL,
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_autopilot_logs_user_id ON autopilot_logs(user_id);
CREATE INDEX idx_autopilot_logs_action_type ON autopilot_logs(action_type);
CREATE INDEX idx_autopilot_logs_entity_type ON autopilot_logs(entity_type);
CREATE INDEX idx_autopilot_logs_entity_id ON autopilot_logs(entity_id);
CREATE INDEX idx_autopilot_logs_status ON autopilot_logs(status);
CREATE INDEX idx_autopilot_logs_created_at ON autopilot_logs(created_at DESC);

-- ----------------------------------------------------------------------------
-- 6. QUESTION_TEMPLATES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS question_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  question_pattern TEXT NOT NULL,
  answer_template TEXT NOT NULL,
  category VARCHAR(100),
  tags TEXT[],
  use_ai_enhancement BOOLEAN DEFAULT false,
  tone VARCHAR(50) DEFAULT 'professional',
  times_used INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_question_templates_user_id ON question_templates(user_id);
CREATE INDEX idx_question_templates_category ON question_templates(category);
CREATE INDEX idx_question_templates_is_active ON question_templates(is_active);
CREATE INDEX idx_question_templates_priority ON question_templates(priority DESC);

-- ============================================================================
-- PART 2: ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE autopilot_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 3: CREATE RLS POLICIES (after all tables exist)
-- ============================================================================

-- TEAMS POLICIES
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

-- TEAM_MEMBERS POLICIES
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

-- TEAM_INVITATIONS POLICIES
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

-- BRAND_PROFILES POLICIES
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

-- AUTOPILOT_LOGS POLICIES
CREATE POLICY "Users can view their own autopilot logs"
  ON autopilot_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert autopilot logs"
  ON autopilot_logs FOR INSERT
  WITH CHECK (true);

-- QUESTION_TEMPLATES POLICIES
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
-- PART 4: CREATE UPDATE TRIGGERS
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
-- PART 5: ADD COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE teams IS 'Teams/organizations for multi-user workspaces';
COMMENT ON TABLE team_members IS 'Team membership and role-based access control (RBAC)';
COMMENT ON TABLE team_invitations IS 'Pending invitations for users to join teams';
COMMENT ON TABLE brand_profiles IS 'Brand voice and guidelines for AI content generation';
COMMENT ON TABLE autopilot_logs IS 'Audit log for all automated AI actions';
COMMENT ON TABLE question_templates IS 'Templates for answering common questions';

COMMIT;
