-- =====================================================
-- Add Chat System Tables Only
-- =====================================================
-- Since ai_requests, user_achievements, user_progress exist
-- We only need to add chat tables
-- =====================================================

-- Chat conversations
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  context TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_status ON chat_conversations(status);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- Enable RLS
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can manage own conversations" ON chat_conversations;
CREATE POLICY "Users can manage own conversations" ON chat_conversations
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own messages" ON chat_messages;
CREATE POLICY "Users can manage own messages" ON chat_messages
  FOR ALL USING (auth.uid() = user_id);

-- AI Settings table (if not exists)
CREATE TABLE IF NOT EXISTS ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  auto_mode BOOLEAN DEFAULT false,
  max_tokens_per_request INTEGER DEFAULT 1000,
  max_requests_per_day INTEGER DEFAULT 100,
  preferred_provider TEXT,
  custom_prompt TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ai_settings_user_id_feature_key'
  ) THEN
    ALTER TABLE ai_settings
    ADD CONSTRAINT ai_settings_user_id_feature_key
    UNIQUE(user_id, feature);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ai_settings_user_id ON ai_settings(user_id);

-- Enable RLS
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can manage own AI settings" ON ai_settings;
CREATE POLICY "Users can manage own AI settings" ON ai_settings
  FOR ALL USING (auth.uid() = user_id);

-- Success
SELECT
  '✅ Chat tables added successfully!' as status,
  'chat_conversations and chat_messages are ready' as message,
  'ai_settings table also added/verified' as additional;
