-- SQL Queries لاختبار ومراقبة Cron Jobs في Supabase

-- ============================================
-- 1. عرض جميع Cron Jobs
-- ============================================
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobname
FROM cron.job
ORDER BY jobid;

-- ============================================
-- 2. اختبار Function يدوياً (بدون انتظار Cron)
-- ============================================
-- هذا سيستدعي Edge Function مباشرة
SELECT trigger_gmb_sync();

-- ============================================
-- 3. عرض تاريخ تنفيذ Cron Jobs
-- ============================================
SELECT 
  j.jobid,
  j.jobname,
  j.schedule,
  rd.runid,
  rd.job_pid,
  rd.status,
  rd.return_message,
  rd.start_time,
  rd.end_time,
  CASE 
    WHEN rd.end_time IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (rd.end_time - rd.start_time)) 
    ELSE NULL 
  END AS duration_seconds,
  CASE 
    WHEN rd.status = 'succeeded' THEN '✅ نجح'
    WHEN rd.status = 'failed' THEN '❌ فشل'
    WHEN rd.status = 'running' THEN '🔄 قيد التشغيل'
    ELSE rd.status
  END AS status_arabic
FROM cron.job j
LEFT JOIN cron.job_run_details rd ON j.jobid = rd.jobid
WHERE j.jobname LIKE 'gmb-sync%'
ORDER BY rd.start_time DESC
LIMIT 20;

-- ============================================
-- 4. عرض آخر 5 تنفيذات لكل Cron Job
-- ============================================
SELECT 
  j.jobname,
  rd.start_time,
  rd.end_time,
  rd.status,
  rd.return_message,
  CASE 
    WHEN rd.status = 'succeeded' THEN '✅'
    WHEN rd.status = 'failed' THEN '❌'
    ELSE '🔄'
  END AS icon
FROM cron.job j
LEFT JOIN cron.job_run_details rd ON j.jobid = rd.jobid
WHERE j.jobname LIKE 'gmb-sync%'
ORDER BY rd.start_time DESC
LIMIT 10;

-- ============================================
-- 5. إحصائيات Cron Jobs
-- ============================================
SELECT 
  j.jobname,
  COUNT(rd.runid) AS total_runs,
  COUNT(CASE WHEN rd.status = 'succeeded' THEN 1 END) AS successful,
  COUNT(CASE WHEN rd.status = 'failed' THEN 1 END) AS failed,
  MAX(rd.start_time) AS last_run,
  CASE 
    WHEN MAX(rd.start_time) > NOW() - INTERVAL '1 hour' THEN '✅ نشط'
    WHEN MAX(rd.start_time) > NOW() - INTERVAL '24 hours' THEN '⚠️ منذ أكثر من ساعة'
    ELSE '❌ غير نشط'
  END AS status
FROM cron.job j
LEFT JOIN cron.job_run_details rd ON j.jobid = rd.jobid
WHERE j.jobname LIKE 'gmb-sync%'
GROUP BY j.jobname, j.jobid
ORDER BY j.jobname;

-- ============================================
-- 6. عرض Cron Jobs الفاشلة فقط
-- ============================================
SELECT 
  j.jobname,
  rd.start_time,
  rd.end_time,
  rd.return_message AS error_message
FROM cron.job j
JOIN cron.job_run_details rd ON j.jobid = rd.jobid
WHERE rd.status = 'failed'
  AND j.jobname LIKE 'gmb-sync%'
ORDER BY rd.start_time DESC
LIMIT 10;

-- ============================================
-- 7. التحقق من أن Extensions مفعلة
-- ============================================
SELECT 
  extname AS extension_name,
  CASE 
    WHEN extname = 'pg_cron' THEN '✅ Cron Jobs'
    WHEN extname = 'pg_net' THEN '✅ HTTP Requests'
    ELSE extname
  END AS status
FROM pg_extension
WHERE extname IN ('pg_cron', 'pg_net');

-- ============================================
-- 8. عرض Cron Jobs النشطة فقط
-- ============================================
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  CASE 
    WHEN active THEN '✅ نشط'
    ELSE '❌ متوقف'
  END AS status
FROM cron.job
WHERE jobname LIKE 'gmb-sync%'
ORDER BY jobname;

-- ============================================
-- 9. اختبار Edge Function URL
-- ============================================
-- هذا يستدعي Edge Function مباشرة باستخدام pg_net
-- ⚠️ استبدل YOUR_CRON_SECRET بالقيمة الفعلية
SELECT 
  net.http_post(
    url := 'https://rrarhekwhgpgkakqrlyn.supabase.co/functions/v1/scheduled-sync',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_CRON_SECRET',
      'Content-Type', 'application/json'
    )
  ) AS request_id;

-- ============================================
-- 10. عرض معلومات Function trigger_gmb_sync
-- ============================================
SELECT 
  routine_name,
  routine_type,
  data_type AS return_type
FROM information_schema.routines
WHERE routine_name = 'trigger_gmb_sync'
  AND routine_schema = 'public';

-- ============================================
-- 11. حساب الوقت حتى التنفيذ التالي
-- ============================================
-- هذا يستخدم cron schedule parser (يتطلب extension إضافي)
-- للبساطة، سنعرض Schedule فقط
SELECT 
  jobname,
  schedule,
  active,
  CASE schedule
    WHEN '0 * * * *' THEN 'كل ساعة (عند دقيقة 0)'
    WHEN '0 0 * * *' THEN 'يومياً (الساعة 12 صباحاً)'
    WHEN '0 9 * * *' THEN 'يومياً (الساعة 9 صباحاً)'
    WHEN '0 18 * * *' THEN 'يومياً (الساعة 6 مساءً)'
    WHEN '0 0 * * 1' THEN 'أسبوعياً (كل يوم اثنين)'
    ELSE schedule
  END AS schedule_description
FROM cron.job
WHERE jobname LIKE 'gmb-sync%'
ORDER BY jobname;

-- ============================================
-- 12. تفعيل/إيقاف Cron Job مؤقتاً
-- ============================================
-- إيقاف Cron Job
-- UPDATE cron.job 
-- SET active = false 
-- WHERE jobname = 'gmb-sync-hourly';

-- تفعيل Cron Job
-- UPDATE cron.job 
-- SET active = true 
-- WHERE jobname = 'gmb-sync-hourly';

-- ============================================
-- 13. حذف Cron Job (احذر!)
-- ============================================
-- SELECT cron.unschedule('gmb-sync-hourly');
-- SELECT cron.unschedule('gmb-sync-daily');
-- SELECT cron.unschedule('gmb-sync-weekly');

