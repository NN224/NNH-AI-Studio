-- ============================================
-- 🎛️ COMMAND CENTER TABLES
-- Tables needed for the AI Command Center feature
-- ============================================

-- ============================================
-- 1. PENDING AI ACTIONS
-- Actions prepared by AI waiting for user approval
-- ============================================
CREATE TABLE IF NOT EXISTS public.pending_ai_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.gmb_locations(id) ON DELETE SET NULL,
    
    -- Action Type
    action_type TEXT NOT NULL CHECK (action_type IN (
        'review_reply',      -- Reply to a review
        'question_answer',   -- Answer a Q&A question
        'post',              -- Create a post
        'offer'              -- Create an offer/promotion
    )),
    
    -- Reference to original item
    reference_id TEXT NOT NULL,              -- ID of review/question/etc
    reference_data JSONB DEFAULT '{}'::jsonb, -- Snapshot of original data
    
    -- AI Generated Content
    ai_generated_content TEXT NOT NULL,
    ai_confidence INTEGER DEFAULT 85 CHECK (ai_confidence >= 0 AND ai_confidence <= 100),
    ai_reasoning TEXT,                        -- Why AI generated this
    ai_provider TEXT,                         -- Which AI model was used
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending',           -- Waiting for approval
        'approved',          -- Approved and published
        'rejected',          -- Rejected by user
        'auto_published',    -- Auto-published by autopilot
        'edited',            -- Edited by user then published
        'expired'            -- Expired without action
    )),
    
    -- Attention Flags
    requires_attention BOOLEAN DEFAULT false,
    attention_reason TEXT,                    -- Why it needs attention
    
    -- User Edits
    edited_content TEXT,                      -- If user edited before approving
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    reviewed_at TIMESTAMPTZ,                  -- When user reviewed
    published_at TIMESTAMPTZ,                 -- When published to Google
    reviewed_by UUID REFERENCES auth.users(id),
    
    -- Expiration
    expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days')
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pending_actions_user ON public.pending_ai_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_actions_location ON public.pending_ai_actions(location_id);
CREATE INDEX IF NOT EXISTS idx_pending_actions_status ON public.pending_ai_actions(status);
CREATE INDEX IF NOT EXISTS idx_pending_actions_type ON public.pending_ai_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_pending_actions_pending ON public.pending_ai_actions(user_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_pending_actions_attention ON public.pending_ai_actions(user_id, requires_attention) WHERE requires_attention = true;
CREATE INDEX IF NOT EXISTS idx_pending_actions_reference ON public.pending_ai_actions(reference_id);

-- ============================================
-- 2. AI PROACTIVE INSIGHTS
-- Insights generated proactively by AI
-- ============================================
CREATE TABLE IF NOT EXISTS public.ai_proactive_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.gmb_locations(id) ON DELETE SET NULL,
    
    -- Insight Type
    insight_type TEXT NOT NULL CHECK (insight_type IN (
        'problem_detected',   -- Issue found (negative reviews, complaints)
        'opportunity',        -- Opportunity identified
        'competitor_alert',   -- Competitor activity
        'positive_trend',     -- Something is improving
        'quiet_period',       -- Low activity period
        'welcome_back',       -- User returned after absence
        'milestone',          -- Achievement reached
        'suggestion',         -- General suggestion
        'all_good'            -- Everything is fine
    )),
    
    -- Priority
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    
    -- Content
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    detailed_analysis JSONB DEFAULT '{}'::jsonb,
    
    -- Suggested Actions
    suggested_actions JSONB DEFAULT '[]'::jsonb,  -- [{label: "...", action: "...", primary: true}]
    
    -- Status
    is_read BOOLEAN DEFAULT false,
    is_dismissed BOOLEAN DEFAULT false,
    action_taken TEXT,                            -- What action user took
    
    -- Validity
    valid_until TIMESTAMPTZ,                      -- When insight expires
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    read_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_proactive_insights_user ON public.ai_proactive_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_proactive_insights_type ON public.ai_proactive_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_proactive_insights_unread ON public.ai_proactive_insights(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_proactive_insights_priority ON public.ai_proactive_insights(user_id, priority);

-- ============================================
-- 3. USER ACTIVITY LOG
-- Track user visits and actions for proactive insights
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Activity Type
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'command_center_visit',
        'dashboard_visit',
        'review_reply',
        'question_answer',
        'post_created',
        'settings_changed',
        'location_viewed',
        'approval_action',
        'login',
        'other'
    )),
    
    -- Activity Data
    activity_data JSONB DEFAULT '{}'::jsonb,
    
    -- Context
    location_id UUID REFERENCES public.gmb_locations(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON public.user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON public.user_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON public.user_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_type ON public.user_activity_log(user_id, activity_type);

-- ============================================
-- 4. COMPETITOR ALERTS
-- Alerts about competitor activity
-- ============================================
CREATE TABLE IF NOT EXISTS public.competitor_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.gmb_locations(id) ON DELETE SET NULL,
    
    -- Competitor Info
    competitor_name TEXT NOT NULL,
    competitor_place_id TEXT,                     -- Google Place ID
    
    -- Alert Details
    alert_type TEXT NOT NULL CHECK (alert_type IN (
        'new_offer',         -- Competitor posted an offer
        'rating_change',     -- Competitor rating changed
        'new_post',          -- Competitor posted something
        'price_change',      -- Competitor changed prices
        'new_review',        -- Competitor got notable review
        'other'
    )),
    alert_title TEXT NOT NULL,
    alert_details JSONB DEFAULT '{}'::jsonb,
    
    -- Status
    is_read BOOLEAN DEFAULT false,
    is_dismissed BOOLEAN DEFAULT false,
    action_taken TEXT,
    
    -- Timestamps
    detected_at TIMESTAMPTZ DEFAULT now(),
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_competitor_alerts_user ON public.competitor_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_competitor_alerts_unread ON public.competitor_alerts(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_competitor_alerts_location ON public.competitor_alerts(location_id);

-- ============================================
-- 5. AUTOPILOT LOGS
-- Logs of all autopilot actions
-- ============================================
CREATE TABLE IF NOT EXISTS public.autopilot_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.gmb_locations(id) ON DELETE SET NULL,
    
    -- Action Info
    action_type TEXT NOT NULL CHECK (action_type IN (
        'auto_reply',
        'auto_answer',
        'auto_post',
        'pattern_detected',
        'insight_generated',
        'other'
    )),
    
    -- Status
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped', 'pending')),
    
    -- Details
    details JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_autopilot_logs_user ON public.autopilot_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_autopilot_logs_type ON public.autopilot_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_autopilot_logs_status ON public.autopilot_logs(status);
CREATE INDEX IF NOT EXISTS idx_autopilot_logs_created ON public.autopilot_logs(created_at DESC);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Pending AI Actions
ALTER TABLE public.pending_ai_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pending_ai_actions"
    ON public.pending_ai_actions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pending_ai_actions"
    ON public.pending_ai_actions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending_ai_actions"
    ON public.pending_ai_actions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pending_ai_actions"
    ON public.pending_ai_actions FOR DELETE
    USING (auth.uid() = user_id);

-- Service role can manage all (for cron jobs)
CREATE POLICY "Service role can manage all pending_ai_actions"
    ON public.pending_ai_actions FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- AI Proactive Insights
ALTER TABLE public.ai_proactive_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own ai_proactive_insights"
    ON public.ai_proactive_insights FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all ai_proactive_insights"
    ON public.ai_proactive_insights FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- User Activity Log
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own user_activity_log"
    ON public.user_activity_log FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own user_activity_log"
    ON public.user_activity_log FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all user_activity_log"
    ON public.user_activity_log FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Competitor Alerts
ALTER TABLE public.competitor_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own competitor_alerts"
    ON public.competitor_alerts FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all competitor_alerts"
    ON public.competitor_alerts FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Autopilot Logs
ALTER TABLE public.autopilot_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own autopilot_logs"
    ON public.autopilot_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all autopilot_logs"
    ON public.autopilot_logs FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE public.pending_ai_actions IS 'Queue of AI-generated actions waiting for user approval';
COMMENT ON TABLE public.ai_proactive_insights IS 'Proactive insights and suggestions generated by AI';
COMMENT ON TABLE public.user_activity_log IS 'Log of user activities for tracking engagement and generating insights';
COMMENT ON TABLE public.competitor_alerts IS 'Alerts about competitor activities';
COMMENT ON TABLE public.autopilot_logs IS 'Logs of all autopilot/automation actions';
