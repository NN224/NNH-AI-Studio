-- ========================================
-- 🔍 CHECK NEW SYNC STATUS
-- ========================================
-- بعد ما تجرب Sync جديد، نفذ هذا SQL
-- ========================================

-- 1️⃣ آخر sync attempt
-- ========================================
SELECT 
  '1. Latest Sync' as check_name,
  id,
  status,
  progress,
  started_at,
  finished_at,
  CASE 
    WHEN finished_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (finished_at - started_at)) / 60 
    ELSE EXTRACT(EPOCH FROM (NOW() - started_at)) / 60 
  END as duration_minutes,
  CASE
    WHEN status = 'running' AND started_at < NOW() - INTERVAL '5 minutes' THEN '❌ STUCK'
    WHEN status = 'running' THEN '⏳ In Progress'
    WHEN status = 'success' THEN '✅ Success'
    WHEN status = 'failed' THEN '❌ Failed'
    ELSE status
  END as status_emoji
FROM sync_status
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d'
ORDER BY started_at DESC
LIMIT 1;

-- 2️⃣ فحص meta (error details)
-- ========================================
SELECT 
  '2. Latest Sync Details' as check_name,
  id,
  status,
  meta,
  started_at,
  finished_at
FROM sync_status
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d'
ORDER BY started_at DESC
LIMIT 1;

-- 3️⃣ فحص gmb_sync_logs (detailed phase logs)
-- ========================================
SELECT 
  '3. Latest Sync Phase Logs' as check_name,
  phase,
  status,
  error,
  counts,
  started_at,
  ended_at,
  EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at)) as duration_seconds
FROM gmb_sync_logs
WHERE gmb_account_id IN (
  SELECT id FROM gmb_accounts WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d'
)
AND started_at > NOW() - INTERVAL '1 hour'
ORDER BY started_at DESC
LIMIT 10;

-- 4️⃣ فحص gmb_accounts (token status)
-- ========================================
SELECT 
  '4. GMB Account Status' as check_name,
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

-- 5️⃣ فحص البيانات المجلوبة (إذا نجح الـ Sync)
-- ========================================
SELECT 
  '5. Data Counts After Sync' as check_name,
  (SELECT COUNT(*) FROM gmb_locations WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d' AND is_active = true) as locations,
  (SELECT COUNT(*) FROM gmb_reviews WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d') as reviews,
  (SELECT COUNT(*) FROM gmb_questions WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d') as questions,
  (SELECT COUNT(*) FROM gmb_media WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d') as media,
  (SELECT COUNT(*) FROM gmb_media WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d' AND category = 'LOGO') as logos,
  (SELECT COUNT(*) FROM gmb_media WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d' AND category = 'COVER') as covers;

-- 6️⃣ فحص Logo & Cover في gmb_locations
-- ========================================
SELECT 
  '6. Logo & Cover Status' as check_name,
  location_name,
  CASE WHEN logo_url IS NOT NULL THEN '✅' ELSE '❌' END as has_logo,
  CASE WHEN cover_photo_url IS NOT NULL THEN '✅' ELSE '❌' END as has_cover,
  last_synced_at
FROM gmb_locations
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d'
AND is_active = true;

-- 7️⃣ فحص Average Rating
-- ========================================
SELECT 
  '7. Average Rating Check' as check_name,
  (SELECT avg_rating FROM v_dashboard_stats WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d') as view_avg_rating,
  (SELECT AVG(rating) FILTER (WHERE rating IS NOT NULL AND rating > 0) FROM gmb_reviews WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d') as actual_avg_rating,
  (SELECT COUNT(*) FROM gmb_reviews WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d') as total_reviews;

-- 8️⃣ فحص Replied Reviews
-- ========================================
SELECT 
  '8. Replied Reviews Check' as check_name,
  (SELECT replied_reviews FROM v_dashboard_stats WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d') as view_replied_reviews,
  (SELECT COUNT(*) FROM gmb_reviews WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d' AND has_reply = true) as actual_replied_reviews,
  (SELECT calculated_response_rate FROM v_dashboard_stats WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d') as response_rate;

