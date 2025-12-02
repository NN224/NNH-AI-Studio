-- =====================================================
-- Clean All GMB Data - Fresh Start
-- =====================================================
-- WARNING: This will DELETE all GMB accounts and related data!
-- =====================================================

-- Start transaction
BEGIN;

-- Delete in order (respecting foreign keys)

-- 1. Delete all reviews
DELETE FROM gmb_reviews WHERE user_id = auth.uid();

-- 2. Delete all questions
DELETE FROM gmb_questions WHERE user_id = auth.uid();

-- 3. Delete all posts
DELETE FROM gmb_posts WHERE user_id = auth.uid();

-- 4. Delete all media
DELETE FROM gmb_media WHERE user_id = auth.uid();

-- 5. Delete all metrics
DELETE FROM gmb_metrics WHERE user_id = auth.uid();

-- 6. Delete all locations
DELETE FROM gmb_locations WHERE user_id = auth.uid();

-- 7. Delete all GMB accounts
DELETE FROM gmb_accounts WHERE user_id = auth.uid();

-- 8. Delete OAuth tokens
DELETE FROM oauth_tokens WHERE user_id = auth.uid();

-- 9. Delete sync queue items
DELETE FROM sync_queue WHERE user_id = auth.uid();

-- 10. Delete oauth states
DELETE FROM oauth_states WHERE user_id = auth.uid();

-- Commit transaction
COMMIT;

-- Success message
SELECT 'All GMB data deleted successfully! You can now connect as a new user.' as message;
