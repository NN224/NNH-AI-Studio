-- ========================================
-- 🔧 FIX LAST STUCK SYNC
-- ========================================
-- تنظيف الـ Sync المتبقي العالق
-- ========================================

-- 1️⃣ فحص الـ Sync العالق
-- ========================================
SELECT 
  '1. Current Stuck Sync' as check_name,
  id,
  status,
  progress,
  started_at,
  EXTRACT(EPOCH FROM (NOW() - started_at)) / 60 as minutes_stuck
FROM sync_status
WHERE id = 'a5b52a2c-96db-482e-9c2d-39b73b1d738c';

-- 2️⃣ تحديث الـ Sync العالق إلى "failed"
-- ========================================
UPDATE sync_status
SET 
  status = 'failed',
  finished_at = NOW(),
  meta = jsonb_set(
    COALESCE(meta, '{}'::jsonb),
    '{error}',
    '"Sync timeout - marked as failed after 51+ minutes stuck in running state"'::jsonb
  )
WHERE id = 'a5b52a2c-96db-482e-9c2d-39b73b1d738c'
AND status = 'running'
RETURNING 
  id, 
  status, 
  started_at, 
  finished_at,
  EXTRACT(EPOCH FROM (finished_at - started_at)) / 60 as total_duration_minutes;

-- 3️⃣ تنظيف شامل لأي syncs عالقة (> 30 دقيقة)
-- ========================================
UPDATE sync_status
SET 
  status = 'failed',
  finished_at = NOW(),
  meta = jsonb_set(
    COALESCE(meta, '{}'::jsonb),
    '{error}',
    '"Sync timeout - automatically marked as failed"'::jsonb
  )
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d'
AND status = 'running'
AND started_at < NOW() - INTERVAL '30 minutes'
RETURNING 
  id, 
  started_at,
  EXTRACT(EPOCH FROM (NOW() - started_at)) / 60 as minutes_stuck;

-- 4️⃣ التحقق النهائي
-- ========================================
SELECT 
  '4. Final Status Check' as check_name,
  status,
  COUNT(*) as count,
  MAX(started_at) as last_sync
FROM sync_status
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d'
GROUP BY status
ORDER BY status;

-- 5️⃣ آخر 5 syncs بعد التنظيف الكامل
-- ========================================
SELECT 
  '5. All Recent Syncs' as check_name,
  id,
  status,
  progress,
  started_at,
  finished_at,
  CASE 
    WHEN finished_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (finished_at - started_at)) / 60 
    ELSE EXTRACT(EPOCH FROM (NOW() - started_at)) / 60 
  END as duration_minutes
FROM sync_status
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d'
ORDER BY started_at DESC
LIMIT 5;

