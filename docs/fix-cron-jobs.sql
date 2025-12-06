-- =====================================================
-- إصلاح Cron Jobs - حذف وإعادة إنشاء
-- =====================================================
--
-- هذا الـ script يحذف الـ jobs القديمة وينشئها من جديد بشكل صحيح
--
-- ⚠️ مهم: استبدل YOUR_PROJECT_REF بـ project_id الخاص بك
-- من supabase/config.toml: project_id = "rrarhekwhgpgkakqrlyn"
--

-- 1. حذف الـ jobs القديمة
SELECT cron.unschedule('gmb-sync-worker');
SELECT cron.unschedule('mark-stale-sync-jobs');
SELECT cron.unschedule('cleanup-expired-locks');

-- 2. إنشاء Job 1: تشغيل sync worker كل 5 دقائق
-- ⚠️ استبدل rrarhekwhgpgkakqrlyn بـ project_id الخاص بك
SELECT cron.schedule(
  'gmb-sync-worker',
  '*/5 * * * *', -- كل 5 دقائق
  $$
  SELECT net.http_post(
    url := 'https://rrarhekwhgpgkakqrlyn.supabase.co/functions/v1/gmb-sync-worker',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
    )
  )
  $$
);

-- 3. إنشاء Job 2: تنظيف stale jobs كل 15 دقيقة
-- ✅ صحيح: يستخدم SELECT * FROM لأن الـ function ترجع TABLE
SELECT cron.schedule(
  'mark-stale-sync-jobs',
  '*/15 * * * *', -- كل 15 دقيقة
  $$
  SELECT * FROM mark_stale_sync_jobs();
  $$
);

-- 4. إنشاء Job 3: تنظيف expired locks كل ساعة
SELECT cron.schedule(
  'cleanup-expired-locks',
  '0 * * * *', -- كل ساعة
  $$
  SELECT cleanup_expired_locks();
  $$
);

-- 5. التحقق من الـ jobs الجديدة
SELECT
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job
WHERE jobname IN ('gmb-sync-worker', 'mark-stale-sync-jobs', 'cleanup-expired-locks')
ORDER BY jobname;

-- ✅ تم! الـ jobs الآن صحيحة وجاهزة للعمل
