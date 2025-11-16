-- ========================================
-- 🔧 FIX STUCK SYNCS
-- ========================================
-- هذا الـ SQL بيصلح الـ Sync operations العالقة
-- ========================================

-- 1️⃣ فحص الـ Stuck Syncs (أكثر من ساعة)
-- ========================================
SELECT 
  '1. Stuck Syncs (> 1 hour)' as check_name,
  id,
  status,
  progress,
  started_at,
  EXTRACT(EPOCH FROM (NOW() - started_at)) / 3600 as hours_stuck
FROM sync_status
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d'
AND status = 'running'
AND started_at < NOW() - INTERVAL '1 hour'
ORDER BY started_at DESC;

-- 2️⃣ تحديث الـ Stuck Syncs إلى "failed"
-- ========================================
-- ⚠️ هذا بيحدث جميع الـ Syncs العالقة
UPDATE sync_status
SET 
  status = 'failed',
  finished_at = NOW(),
  meta = jsonb_set(
    COALESCE(meta, '{}'::jsonb),
    '{error}',
    '"Sync timeout - marked as failed after being stuck in running state"'::jsonb
  )
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d'
AND status = 'running'
AND started_at < NOW() - INTERVAL '1 hour'
RETURNING id, started_at, EXTRACT(EPOCH FROM (NOW() - started_at)) / 3600 as hours_stuck;

-- 3️⃣ التحقق من النتيجة
-- ========================================
SELECT 
  '3. After Cleanup' as check_name,
  status,
  COUNT(*) as count
FROM sync_status
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d'
GROUP BY status
ORDER BY status;

-- 4️⃣ فحص آخر 5 syncs بعد التنظيف
-- ========================================
SELECT 
  '4. Recent Syncs After Cleanup' as check_name,
  id,
  status,
  progress,
  started_at,
  finished_at,
  EXTRACT(EPOCH FROM (COALESCE(finished_at, NOW()) - started_at)) / 60 as duration_minutes
FROM sync_status
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d'
ORDER BY started_at DESC
LIMIT 5;

