-- ========================================
-- 🔍 QUICK DIAGNOSTIC SQL
-- ========================================
-- نفذ هذا في Supabase Dashboard
-- ========================================

-- 1️⃣ فحص gmb_accounts (Sync failed issue)
-- ========================================
SELECT 
  '1. GMB Accounts Status' as check_name,
  id,
  account_name,
  is_active,
  token_expires_at,
  CASE 
    WHEN token_expires_at < NOW() THEN '❌ Expired'
    WHEN token_expires_at < NOW() + INTERVAL '7 days' THEN '⚠️ Expiring Soon'
    ELSE '✅ Valid'
  END as token_status,
  last_sync
FROM gmb_accounts
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d'
ORDER BY created_at DESC;

-- 2️⃣ فحص gmb_locations (Logo issue)
-- ========================================
SELECT 
  '2. Locations Logo/Cover Status' as check_name,
  location_name,
  CASE WHEN logo_url IS NOT NULL THEN '✅ Has Logo' ELSE '❌ No Logo' END as logo_status,
  CASE WHEN cover_photo_url IS NOT NULL THEN '✅ Has Cover' ELSE '❌ No Cover' END as cover_status,
  rating,
  review_count,
  last_synced_at
FROM gmb_locations
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d'
AND is_active = true;

-- 3️⃣ فحص gmb_reviews ratings (Average Rating issue)
-- ========================================
SELECT 
  '3. Reviews Rating Analysis' as check_name,
  COUNT(*) as total_reviews,
  COUNT(CASE WHEN rating IS NULL THEN 1 END) as null_ratings,
  COUNT(CASE WHEN rating = 0 THEN 1 END) as zero_ratings,
  COUNT(CASE WHEN rating > 0 THEN 1 END) as valid_ratings,
  MIN(rating) as min_rating,
  MAX(rating) as max_rating,
  AVG(rating) as simple_avg,
  AVG(rating) FILTER (WHERE rating IS NOT NULL AND rating > 0) as filtered_avg,
  COUNT(CASE WHEN has_reply = true THEN 1 END) as replied_count,
  COUNT(CASE WHEN has_reply = false OR has_reply IS NULL THEN 1 END) as pending_count
FROM gmb_reviews
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d';

-- 4️⃣ فحص v_dashboard_stats (ما يظهر في Dashboard)
-- ========================================
SELECT 
  '4. Dashboard Stats View' as check_name,
  total_locations,
  total_reviews,
  avg_rating,
  pending_reviews,
  replied_reviews,
  pending_questions,
  recent_reviews,
  avg_response_rate,
  calculated_response_rate
FROM v_dashboard_stats
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d';

-- 5️⃣ مقارنة بين View و Actual Data
-- ========================================
SELECT 
  '5. View vs Actual Comparison' as check_name,
  (SELECT total_reviews FROM v_dashboard_stats WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d') as view_total_reviews,
  (SELECT COUNT(*) FROM gmb_reviews WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d') as actual_total_reviews,
  (SELECT avg_rating FROM v_dashboard_stats WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d') as view_avg_rating,
  (SELECT AVG(rating) FILTER (WHERE rating IS NOT NULL AND rating > 0) FROM gmb_reviews WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d') as actual_avg_rating,
  (SELECT replied_reviews FROM v_dashboard_stats WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d') as view_replied_reviews,
  (SELECT COUNT(*) FROM gmb_reviews WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d' AND has_reply = true) as actual_replied_reviews;

-- 6️⃣ فحص آخر 5 reviews (للتأكد من البيانات)
-- ========================================
SELECT 
  '6. Sample Reviews Data' as check_name,
  reviewer_name,
  rating,
  has_reply,
  reply_text IS NOT NULL as has_reply_text,
  created_at
FROM gmb_reviews
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d'
ORDER BY created_at DESC
LIMIT 5;

-- 7️⃣ فحص gmb_media (للتأكد من Media synced)
-- ========================================
SELECT 
  '7. Media Items Status' as check_name,
  COUNT(*) as total_media,
  COUNT(CASE WHEN category = 'LOGO' THEN 1 END) as logo_count,
  COUNT(CASE WHEN category = 'COVER' THEN 1 END) as cover_count,
  COUNT(CASE WHEN category IS NULL THEN 1 END) as no_category_count,
  MAX(created_at) as last_media_sync
FROM gmb_media
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d';

-- 8️⃣ فحص gmb_sync_logs (آخر sync attempts)
-- ========================================
-- Note: Using gmb_sync_logs instead of sync_progress (not in production yet)
SELECT 
  '8. Recent Sync Logs' as check_name,
  phase,
  status,
  error,
  counts,
  started_at,
  ended_at,
  EXTRACT(EPOCH FROM (ended_at - started_at)) as duration_seconds
FROM gmb_sync_logs
WHERE gmb_account_id IN (
  SELECT id FROM gmb_accounts WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d'
)
ORDER BY started_at DESC
LIMIT 10;

-- ========================================
-- 📊 SUMMARY REPORT
-- ========================================
SELECT 
  '📊 SUMMARY' as report_section,
  CASE 
    WHEN EXISTS (SELECT 1 FROM gmb_accounts WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d' AND token_expires_at > NOW()) 
    THEN '✅ Account Active' 
    ELSE '❌ Account Expired/Missing' 
  END as account_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM gmb_locations WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d' AND logo_url IS NOT NULL) 
    THEN '✅ Logo Found' 
    ELSE '❌ Logo Missing' 
  END as logo_status,
  CASE 
    WHEN (SELECT AVG(rating) FILTER (WHERE rating IS NOT NULL AND rating > 0) FROM gmb_reviews WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d') > 0 
    THEN '✅ Ratings Valid' 
    ELSE '❌ Ratings Invalid' 
  END as rating_status,
  CASE 
    WHEN (SELECT COUNT(*) FROM gmb_reviews WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d' AND has_reply = true) > 0 
    THEN '✅ Replies Found' 
    ELSE '❌ No Replies' 
  END as reply_status;

-- ========================================
-- 🔧 ADDITIONAL CHECKS
-- ========================================

-- 9️⃣ فحص sync_status columns (to determine which migration is active)
-- ========================================
SELECT 
  '9. Sync Status Columns' as check_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'sync_status'
ORDER BY ordinal_position;

-- 🔟 فحص آخر sync_status records
-- ========================================
SELECT 
  '10. Recent Sync Status' as check_name,
  id,
  status,
  progress,
  started_at
FROM sync_status
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d'
ORDER BY started_at DESC
LIMIT 5;

