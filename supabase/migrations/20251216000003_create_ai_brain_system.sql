-- ============================================
-- 🧠 AI BRAIN SYSTEM - The "10-Year Employee"
-- ============================================

-- ============================================
-- 1. BUSINESS DNA - Everything AI knows about the business
-- ============================================
CREATE TABLE IF NOT EXISTS public.business_dna (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.gmb_locations(id) ON DELETE CASCADE,
    
    -- Business Identity
    business_name TEXT,
    business_type TEXT,
    business_category TEXT,
    target_audience TEXT,
    brand_voice TEXT, -- "friendly", "professional", "casual", etc.
    languages TEXT[] DEFAULT ARRAY['en'],
    
    -- Extracted Intelligence
    strengths JSONB DEFAULT '[]'::jsonb,        -- ["great food", "fast service"]
    weaknesses JSONB DEFAULT '[]'::jsonb,       -- ["parking", "wait time"]
    common_topics JSONB DEFAULT '[]'::jsonb,    -- [{topic: "food quality", mentions: 15, sentiment: "positive"}]
    customer_personas JSONB DEFAULT '[]'::jsonb, -- [{type: "families", percentage: 40}]
    
    -- Patterns
    peak_days JSONB DEFAULT '[]'::jsonb,        -- ["Friday", "Saturday"]
    peak_hours JSONB DEFAULT '[]'::jsonb,       -- ["19:00", "20:00", "21:00"]
    best_post_times JSONB DEFAULT '[]'::jsonb,  -- [{day: "Thursday", hour: 18}]
    seasonal_trends JSONB DEFAULT '{}'::jsonb,
    
    -- Competitive Intelligence  
    competitors JSONB DEFAULT '[]'::jsonb,      -- [{name: "...", rating: 4.5, strengths: [...]}]
    market_position TEXT,                        -- "leader", "challenger", "newcomer"
    unique_selling_points JSONB DEFAULT '[]'::jsonb,
    
    -- Communication Style (learned from past replies)
    reply_style JSONB DEFAULT '{}'::jsonb,      -- {tone: "friendly", length: "medium", emoji_usage: true}
    signature_phrases JSONB DEFAULT '[]'::jsonb, -- ["Thank you for visiting!", "We appreciate..."]
    
    -- Performance Metrics
    average_rating DECIMAL(3,2),
    total_reviews INTEGER DEFAULT 0,
    response_rate DECIMAL(5,2),
    sentiment_score DECIMAL(5,2),               -- -100 to +100
    growth_trend TEXT,                          -- "growing", "stable", "declining"
    
    -- AI Confidence
    confidence_score DECIMAL(5,2) DEFAULT 0,    -- How confident AI is about this profile
    data_completeness DECIMAL(5,2) DEFAULT 0,   -- % of data analyzed
    
    -- Timestamps
    last_analysis_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT unique_business_dna_user_location UNIQUE (user_id, location_id)
);

-- ============================================
-- 2. AI MEMORY - Conversation History & Context
-- ============================================
CREATE TABLE IF NOT EXISTS public.ai_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Memory Type
    memory_type TEXT NOT NULL CHECK (memory_type IN (
        'conversation',      -- Chat messages
        'preference',        -- User preferences learned
        'decision',          -- Decisions user made
        'action',            -- Actions AI took
        'feedback',          -- User feedback on AI suggestions
        'insight'            -- AI-generated insights
    )),
    
    -- Content
    content TEXT NOT NULL,
    context JSONB DEFAULT '{}'::jsonb,          -- Additional context
    
    -- Importance & Retrieval
    importance_score DECIMAL(5,2) DEFAULT 50,   -- 0-100, for memory prioritization
    embedding vector(1536),                      -- For semantic search (if using pgvector)
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Expiration (some memories fade)
    expires_at TIMESTAMPTZ,                      -- NULL = permanent
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 3. AI CONVERSATIONS - Full Chat History
-- ============================================
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Conversation metadata
    title TEXT,                                  -- Auto-generated title
    summary TEXT,                                -- AI-generated summary
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    
    -- Context at conversation start
    business_context_snapshot JSONB,             -- Snapshot of business_dna at start
    
    -- Timestamps
    started_at TIMESTAMPTZ DEFAULT now(),
    last_message_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 4. AI MESSAGES - Individual Messages
-- ============================================
CREATE TABLE IF NOT EXISTS public.ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Message content
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    
    -- AI metadata
    model_used TEXT,                             -- "gpt-4", "claude-3", etc.
    tokens_used INTEGER,
    confidence_score DECIMAL(5,2),
    
    -- Actions taken
    actions_suggested JSONB DEFAULT '[]'::jsonb, -- [{type: "reply_review", id: "..."}]
    actions_taken JSONB DEFAULT '[]'::jsonb,
    
    -- User feedback
    feedback TEXT CHECK (feedback IN ('positive', 'negative', NULL)),
    feedback_note TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 5. AI DAILY BRIEFINGS - Pre-generated Insights
-- ============================================
CREATE TABLE IF NOT EXISTS public.ai_daily_briefings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Briefing content
    briefing_date DATE NOT NULL DEFAULT CURRENT_DATE,
    greeting TEXT,                               -- "Good morning, Fouad!"
    summary TEXT,                                -- Main summary paragraph
    
    -- Structured insights
    highlights JSONB DEFAULT '[]'::jsonb,        -- [{type: "new_reviews", count: 3, sentiment: "positive"}]
    alerts JSONB DEFAULT '[]'::jsonb,            -- [{priority: "high", message: "Negative review needs attention"}]
    suggestions JSONB DEFAULT '[]'::jsonb,       -- [{action: "post", reason: "Best time to post is now"}]
    tasks JSONB DEFAULT '[]'::jsonb,             -- [{task: "Reply to review", status: "pending", priority: 1}]
    
    -- Quick stats
    stats JSONB DEFAULT '{}'::jsonb,             -- {new_reviews: 3, avg_rating: 4.5, response_rate: 85}
    
    -- Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    
    -- Timestamps
    generated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT unique_daily_briefing UNIQUE (user_id, briefing_date)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_business_dna_user ON public.business_dna(user_id);
CREATE INDEX IF NOT EXISTS idx_business_dna_location ON public.business_dna(location_id);

CREATE INDEX IF NOT EXISTS idx_ai_memory_user ON public.ai_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_memory_type ON public.ai_memory(memory_type);
CREATE INDEX IF NOT EXISTS idx_ai_memory_importance ON public.ai_memory(importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_ai_memory_tags ON public.ai_memory USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON public.ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_status ON public.ai_conversations(status);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_last_message ON public.ai_conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON public.ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_user ON public.ai_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created ON public.ai_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_briefings_user_date ON public.ai_daily_briefings(user_id, briefing_date DESC);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE public.business_dna ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_daily_briefings ENABLE ROW LEVEL SECURITY;

-- Business DNA
CREATE POLICY "Users can manage own business_dna" ON public.business_dna
    FOR ALL USING (auth.uid() = user_id);

-- AI Memory
CREATE POLICY "Users can manage own ai_memory" ON public.ai_memory
    FOR ALL USING (auth.uid() = user_id);

-- AI Conversations
CREATE POLICY "Users can manage own ai_conversations" ON public.ai_conversations
    FOR ALL USING (auth.uid() = user_id);

-- AI Messages
CREATE POLICY "Users can manage own ai_messages" ON public.ai_messages
    FOR ALL USING (auth.uid() = user_id);

-- AI Briefings
CREATE POLICY "Users can manage own ai_daily_briefings" ON public.ai_daily_briefings
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_business_dna_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_business_dna_updated ON public.business_dna;
CREATE TRIGGER trigger_business_dna_updated
    BEFORE UPDATE ON public.business_dna
    FOR EACH ROW
    EXECUTE FUNCTION update_business_dna_timestamp();

-- Update conversation last_message_at when new message added
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.ai_conversations 
    SET last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON public.ai_messages;
CREATE TRIGGER trigger_update_conversation_last_message
    AFTER INSERT ON public.ai_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_last_message();

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE public.business_dna IS 'AI-extracted business intelligence profile - the "brain" that knows everything about the business';
COMMENT ON TABLE public.ai_memory IS 'Long-term memory storage for AI assistant - preferences, decisions, feedback';
COMMENT ON TABLE public.ai_conversations IS 'Chat conversation threads with AI assistant';
COMMENT ON TABLE public.ai_messages IS 'Individual messages in AI conversations';
COMMENT ON TABLE public.ai_daily_briefings IS 'Pre-generated daily AI briefings for users';
