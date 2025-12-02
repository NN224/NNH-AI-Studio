-- =====================================================
-- Check which tables are missing and what they do
-- =====================================================

-- List of expected tables and their purposes
WITH expected_tables AS (
    SELECT unnest(ARRAY[
        'ai_requests',
        'ai_settings',
        'chat_messages',
        'chat_conversations',
        'content_generations',
        'gmb_reviews',
        'gmb_questions',
        'gmb_posts',
        'gmb_media',
        'gmb_metrics',
        'gmb_messages',
        'gmb_performance_metrics',
        'gmb_products',
        'gmb_search_keywords',
        'gmb_services',
        'gmb_sync_logs',
        'gmb_locations',
        'business_profile_history',
        'gmb_accounts',
        'oauth_tokens',
        'oauth_states',
        'gmb_secrets',
        'activity_logs',
        'audit_logs',
        'error_logs',
        'token_audit_log',
        'user_achievements',
        'user_progress',
        'user_suggestion_actions',
        'weekly_task_recommendations',
        'sync_queue',
        'sync_status',
        'sync_worker_runs',
        'auto_reply_settings',
        'user_preferences',
        'review_reply_drafts',
        'notifications',
        'newsletter_subscriptions',
        'contact_submissions',
        'performance_metrics',
        'team_members',
        'teams',
        'profiles'
    ]) AS table_name
),
existing_tables AS (
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
)

-- Show missing tables
SELECT
    et.table_name,
    CASE
        WHEN ext.table_name IS NULL THEN '❌ MISSING'
        ELSE '✅ EXISTS'
    END AS status,
    CASE et.table_name
        -- AI Features
        WHEN 'ai_requests' THEN 'AI: Tracks AI API usage and costs'
        WHEN 'ai_settings' THEN 'AI: User AI preferences and limits'
        WHEN 'content_generations' THEN 'AI: Stores generated content history'

        -- Chat System
        WHEN 'chat_messages' THEN 'Chat: Message history for support chat'
        WHEN 'chat_conversations' THEN 'Chat: Chat conversation threads'

        -- GMB Core (REQUIRED)
        WHEN 'gmb_accounts' THEN '⭐ GMB: Google Business accounts (CORE)'
        WHEN 'gmb_locations' THEN '⭐ GMB: Business locations (CORE)'
        WHEN 'gmb_reviews' THEN '⭐ GMB: Customer reviews (CORE)'
        WHEN 'gmb_questions' THEN '⭐ GMB: Q&A from customers (CORE)'
        WHEN 'gmb_posts' THEN 'GMB: Business posts and updates'
        WHEN 'gmb_media' THEN 'GMB: Photos and videos'
        WHEN 'gmb_metrics' THEN 'GMB: Performance metrics'
        WHEN 'gmb_messages' THEN 'GMB: Customer messages'
        WHEN 'gmb_performance_metrics' THEN 'GMB: Detailed analytics'
        WHEN 'gmb_products' THEN 'GMB: Product catalog'
        WHEN 'gmb_search_keywords' THEN 'GMB: Search terms analysis'
        WHEN 'gmb_services' THEN 'GMB: Service offerings'
        WHEN 'gmb_sync_logs' THEN 'GMB: Sync operation logs'
        WHEN 'gmb_secrets' THEN 'GMB: Encrypted credentials'

        -- User Management
        WHEN 'profiles' THEN '⭐ User: User profiles (CORE)'
        WHEN 'user_preferences' THEN 'User: Settings and preferences'
        WHEN 'user_achievements' THEN 'Gamification: User badges and achievements'
        WHEN 'user_progress' THEN 'Gamification: Progress tracking'
        WHEN 'user_suggestion_actions' THEN 'AI: Suggested actions for users'
        WHEN 'weekly_task_recommendations' THEN 'AI: Weekly task suggestions'

        -- Authentication
        WHEN 'oauth_tokens' THEN '⭐ Auth: OAuth tokens (CORE)'
        WHEN 'oauth_states' THEN 'Auth: OAuth flow states'

        -- Sync System
        WHEN 'sync_queue' THEN '⭐ Sync: Queue for data sync (CORE)'
        WHEN 'sync_status' THEN 'Sync: Current sync status'
        WHEN 'sync_worker_runs' THEN 'Sync: Worker execution logs'

        -- Features
        WHEN 'auto_reply_settings' THEN 'Feature: Auto-reply configuration'
        WHEN 'review_reply_drafts' THEN 'Feature: Draft replies for reviews'
        WHEN 'business_profile_history' THEN 'History: Profile change tracking'

        -- System
        WHEN 'activity_logs' THEN 'Logging: User activity tracking'
        WHEN 'audit_logs' THEN 'Security: Audit trail for compliance'
        WHEN 'error_logs' THEN 'Debug: Error tracking'
        WHEN 'token_audit_log' THEN 'Security: Token operation logs'
        WHEN 'performance_metrics' THEN 'Monitoring: System performance'

        -- Communication
        WHEN 'notifications' THEN 'Notifications: In-app notifications'
        WHEN 'newsletter_subscriptions' THEN 'Marketing: Email subscriptions'
        WHEN 'contact_submissions' THEN 'Support: Contact form submissions'

        -- Teams
        WHEN 'teams' THEN 'Enterprise: Team management'
        WHEN 'team_members' THEN 'Enterprise: Team member roles'

        ELSE 'Unknown purpose'
    END AS purpose
FROM expected_tables et
LEFT JOIN existing_tables ext ON et.table_name = ext.table_name
ORDER BY
    CASE
        WHEN ext.table_name IS NULL THEN 0
        ELSE 1
    END,
    et.table_name;
