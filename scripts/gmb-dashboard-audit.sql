-- ============================================
-- GMB Dashboard Comprehensive Audit Report
-- ============================================
-- This script performs a complete audit of the GMB dashboard
-- including all tables, relationships, and data integrity checks
-- ============================================

-- Enable timing for performance tracking
\timing on

-- ============================================
-- SECTION 1: CRITICAL ISSUES CHECK
-- ============================================
\echo '=========================================='
\echo 'SECTION 1: CRITICAL ISSUES'
\echo '=========================================='

-- 1.1 Active accounts without refresh_token
SELECT 
    'CRITICAL' as severity,
    'Missing refresh_token' as issue,
    COUNT(*) as count,
    STRING_AGG(id::text, ', ') as affected_ids
FROM gmb_accounts
WHERE is_active = true 
    AND (refresh_token IS NULL OR refresh_token = '');

-- 1.2 Expired tokens that need refresh
SELECT 
    'CRITICAL' as severity,
    'Expired tokens (>24h)' as issue,
    COUNT(*) as count,
    STRING_AGG(id::text, ', ') as affected_ids
FROM gmb_accounts
WHERE is_active = true 
    AND token_expires_at IS NOT NULL
    AND token_expires_at < NOW() - INTERVAL '1 day';

-- 1.3 Active accounts without user_id
SELECT 
    'CRITICAL' as severity,
    'Accounts without user_id' as issue,
    COUNT(*) as count,
    STRING_AGG(id::text, ', ') as affected_ids
FROM gmb_accounts
WHERE user_id IS NULL;

-- ============================================
-- SECTION 2: DATA INTEGRITY WARNINGS
-- ============================================
\echo '=========================================='
\echo 'SECTION 2: DATA INTEGRITY WARNINGS'
\echo '=========================================='

-- 2.1 Locations with inactive accounts
SELECT 
    'WARNING' as severity,
    'Active locations with inactive accounts' as issue,
    COUNT(*) as count,
    STRING_AGG(l.id::text, ', ') as affected_ids
FROM gmb_locations l
JOIN gmb_accounts a ON a.id = l.gmb_account_id
WHERE l.is_active = true AND a.is_active = false;

-- 2.2 Orphaned locations
SELECT 
    'WARNING' as severity,
    'Locations without gmb_account_id' as issue,
    COUNT(*) as count,
    STRING_AGG(id::text, ', ') as affected_ids
FROM gmb_locations
WHERE gmb_account_id IS NULL;

-- 2.3 Reviews without proper associations
SELECT 
    'WARNING' as severity,
    'Reviews data issues' as issue,
    jsonb_build_object(
        'without_location', COUNT(*) FILTER (WHERE location_id IS NULL),
        'without_user_id', COUNT(*) FILTER (WHERE user_id IS NULL),
        'without_gmb_account', COUNT(*) FILTER (WHERE gmb_account_id IS NULL),
        'responded_no_reply', COUNT(*) FILTER (WHERE status = 'responded' AND review_reply IS NULL AND reply_text IS NULL)
    ) as details
FROM gmb_reviews;

-- ============================================
-- SECTION 3: SETTINGS CONFIGURATION AUDIT
-- ============================================
\echo '=========================================='
\echo 'SECTION 3: SETTINGS CONFIGURATION'
\echo '=========================================='

-- 3.1 Account settings analysis
SELECT 
    id,
    account_name,
    is_active,
    CASE 
        WHEN settings IS NULL THEN 'No settings'
        WHEN settings = '{}'::jsonb THEN 'Empty settings'
        ELSE 'Has settings'
    END as settings_status,
    settings->>'syncSchedule' as sync_schedule,
    settings->>'autoReply' as auto_reply,
    settings->>'reviewNotifications' as review_notifications,
    settings->>'emailDigest' as email_digest,
    settings->>'aiResponseTone' as ai_tone,
    settings->>'autoPublish' as auto_publish,
    last_sync,
    CASE 
        WHEN last_sync IS NULL THEN 'Never synced'
        WHEN last_sync < NOW() - INTERVAL '7 days' THEN 'Stale (>7 days)'
        WHEN last_sync < NOW() - INTERVAL '1 day' THEN 'Recent (>1 day)'
        ELSE 'Fresh (<1 day)'
    END as sync_status
FROM gmb_accounts
ORDER BY is_active DESC, last_sync DESC;

-- ============================================
-- SECTION 4: DATA VOLUME SUMMARY
-- ============================================
\echo '=========================================='
\echo 'SECTION 4: DATA VOLUME SUMMARY'
\echo '=========================================='

WITH table_counts AS (
    SELECT 'gmb_accounts' as table_name, COUNT(*) as total_count, 
           COUNT(*) FILTER (WHERE is_active = true) as active_count
    FROM gmb_accounts
    UNION ALL
    SELECT 'gmb_locations', COUNT(*), COUNT(*) FILTER (WHERE is_active = true)
    FROM gmb_locations
    UNION ALL
    SELECT 'gmb_reviews', COUNT(*), COUNT(*) FILTER (WHERE status != 'responded')
    FROM gmb_reviews
    UNION ALL
    SELECT 'gmb_questions', COUNT(*), COUNT(*) FILTER (WHERE answer_status = 'pending')
    FROM gmb_questions
    UNION ALL
    SELECT 'gmb_posts', COUNT(*), COUNT(*) FILTER (WHERE status = 'published')
    FROM gmb_posts
    UNION ALL
    SELECT 'gmb_performance_metrics', COUNT(*), COUNT(DISTINCT location_id)
    FROM gmb_performance_metrics
    UNION ALL
    SELECT 'gmb_search_keywords', COUNT(*), COUNT(DISTINCT location_id)
    FROM gmb_search_keywords
    UNION ALL
    SELECT 'gmb_media', COUNT(*), COUNT(*) FILTER (WHERE media_url IS NOT NULL)
    FROM gmb_media
)
SELECT 
    table_name,
    total_count,
    active_count,
    CASE 
        WHEN total_count = 0 THEN 'Empty'
        WHEN total_count < 100 THEN 'Small'
        WHEN total_count < 1000 THEN 'Medium'
        ELSE 'Large'
    END as volume_category
FROM table_counts
ORDER BY table_name;

-- ============================================
-- SECTION 5: PERFORMANCE & SYNC STATUS
-- ============================================
\echo '=========================================='
\echo 'SECTION 5: PERFORMANCE & SYNC STATUS'
\echo '=========================================='

-- 5.1 Recent sync activity
SELECT 
    a.account_name,
    l.location_name,
    l.last_sync as location_last_sync,
    COUNT(DISTINCT r.id) as review_count,
    COUNT(DISTINCT q.id) as question_count,
    COUNT(DISTINCT p.id) as post_count,
    MAX(r.created_at) as latest_review,
    MAX(q.created_at) as latest_question,
    MAX(p.created_at) as latest_post
FROM gmb_accounts a
LEFT JOIN gmb_locations l ON l.gmb_account_id = a.id
LEFT JOIN gmb_reviews r ON r.location_id = l.id
LEFT JOIN gmb_questions q ON q.location_id = l.id
LEFT JOIN gmb_posts p ON p.location_id = l.id
WHERE a.is_active = true
GROUP BY a.id, a.account_name, l.id, l.location_name, l.last_sync
ORDER BY a.account_name, l.location_name;

-- ============================================
-- SECTION 6: AI & AUTOMATION FEATURES
-- ============================================
\echo '=========================================='
\echo 'SECTION 6: AI & AUTOMATION STATUS'
\echo '=========================================='

-- 6.1 AI features usage
SELECT 
    'AI Feature Usage' as category,
    jsonb_build_object(
        'reviews_with_ai_sentiment', COUNT(*) FILTER (WHERE ai_sentiment IS NOT NULL),
        'reviews_with_ai_suggestions', COUNT(*) FILTER (WHERE ai_suggested_reply IS NOT NULL),
        'positive_sentiment', COUNT(*) FILTER (WHERE ai_sentiment = 'positive'),
        'neutral_sentiment', COUNT(*) FILTER (WHERE ai_sentiment = 'neutral'),
        'negative_sentiment', COUNT(*) FILTER (WHERE ai_sentiment = 'negative'),
        'auto_replied', COUNT(*) FILTER (WHERE status = 'responded' AND replied_at IS NOT NULL)
    ) as metrics
FROM gmb_reviews;

-- 6.2 Automation settings across accounts
SELECT 
    account_name,
    settings->>'autoReply' as auto_reply_enabled,
    settings->>'aiResponseTone' as ai_tone,
    settings->>'autoPublish' as auto_publish_enabled,
    COUNT(DISTINCT l.id) as location_count
FROM gmb_accounts a
LEFT JOIN gmb_locations l ON l.gmb_account_id = a.id
WHERE a.is_active = true
GROUP BY a.id, a.account_name, a.settings;

-- ============================================
-- SECTION 7: SECURITY & PERMISSIONS
-- ============================================
\echo '=========================================='
\echo 'SECTION 7: SECURITY & PERMISSIONS CHECK'
\echo '=========================================='

-- 7.1 RLS Policy Status
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity = true THEN 'Enabled ✓'
        ELSE 'DISABLED ✗'
    END as rls_status
FROM pg_tables
WHERE schemaname = 'public' 
    AND tablename LIKE 'gmb_%'
ORDER BY tablename;

-- 7.2 Check for policies
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual IS NOT NULL as has_using_clause,
    with_check IS NOT NULL as has_with_check_clause
FROM pg_policies
WHERE schemaname = 'public' 
    AND tablename LIKE 'gmb_%'
ORDER BY tablename, policyname;

-- ============================================
-- SECTION 8: DATA CONSISTENCY CHECKS
-- ============================================
\echo '=========================================='
\echo 'SECTION 8: DATA CONSISTENCY CHECKS'
\echo '=========================================='

-- 8.1 Rating consistency check
WITH rating_calc AS (
    SELECT 
        l.id,
        l.location_name,
        l.rating as stored_rating,
        l.review_count as stored_count,
        AVG(r.rating) as calculated_avg_rating,
        COUNT(r.id) as calculated_review_count
    FROM gmb_locations l
    LEFT JOIN gmb_reviews r ON r.location_id = l.id
    WHERE l.is_active = true
    GROUP BY l.id, l.location_name, l.rating, l.review_count
)
SELECT 
    location_name,
    stored_rating,
    ROUND(calculated_avg_rating::numeric, 1) as calculated_rating,
    stored_count,
    calculated_review_count,
    CASE 
        WHEN ABS(COALESCE(stored_rating, 0) - COALESCE(calculated_avg_rating, 0)) > 0.1 THEN 'Mismatch'
        ELSE 'OK'
    END as rating_status,
    CASE 
        WHEN stored_count != calculated_review_count THEN 'Count Mismatch'
        ELSE 'OK'
    END as count_status
FROM rating_calc
WHERE ABS(COALESCE(stored_rating, 0) - COALESCE(calculated_avg_rating, 0)) > 0.1
   OR stored_count != calculated_review_count;

-- ============================================
-- SECTION 9: RECOMMENDATIONS
-- ============================================
\echo '=========================================='
\echo 'SECTION 9: AUDIT RECOMMENDATIONS'
\echo '=========================================='

WITH issues AS (
    SELECT 
        CASE 
            WHEN COUNT(*) FILTER (WHERE is_active = true AND (refresh_token IS NULL OR refresh_token = '')) > 0 
                THEN 'CRITICAL: Active accounts missing refresh tokens - Re-authenticate required'
            ELSE NULL
        END as issue1,
        CASE 
            WHEN COUNT(*) FILTER (WHERE is_active = true AND token_expires_at < NOW() - INTERVAL '1 day') > 0 
                THEN 'CRITICAL: Expired tokens detected - Immediate refresh needed'
            ELSE NULL
        END as issue2,
        CASE 
            WHEN COUNT(*) FILTER (WHERE is_active = true AND last_sync < NOW() - INTERVAL '7 days') > 0 
                THEN 'WARNING: Stale data detected - Consider enabling auto-sync'
            ELSE NULL
        END as issue3,
        CASE 
            WHEN COUNT(*) FILTER (WHERE is_active = true AND (settings IS NULL OR settings = '{}'::jsonb)) > 0 
                THEN 'INFO: Accounts with default settings - Review configuration'
            ELSE NULL
        END as issue4
    FROM gmb_accounts
)
SELECT 
    UNNEST(ARRAY[issue1, issue2, issue3, issue4]) as recommendation
FROM issues
WHERE UNNEST(ARRAY[issue1, issue2, issue3, issue4]) IS NOT NULL;

-- ============================================
-- FINAL SUMMARY
-- ============================================
\echo '=========================================='
\echo 'AUDIT COMPLETE - Review results above'
\echo '=========================================='

-- Disable timing
\timing off
