-- اختبار سريع لـ Cron Jobs
-- نسخ ولصق هذا في Supabase SQL Editor

-- ============================================
-- الخطوة 1: تأكد من أن Cron Jobs موجودة ونشطة
-- ============================================
SELECT 
  jobname,
  schedule,
  CASE WHEN active THEN '✅ نشط' ELSE '❌ متوقف' END AS status
FROM cron.job
WHERE jobname LIKE 'gmb-sync%'
ORDER BY jobname;

-- ============================================
-- الخطوة 2: اختبار Function يدوياً
-- ============================================
-- هذا سيستدعي Edge Function مباشرة
SELECT trigger_gmb_sync();

-- ============================================
-- الخطوة 3: تحقق من النتيجة (بعد ثوانٍ قليلة)
-- ============================================
SELECT 
  jobname,
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details rd
JOIN cron.job j ON rd.jobid = j.jobid
WHERE j.jobname LIKE 'gmb-sync%'
ORDER BY start_time DESC
LIMIT 5;

-- ============================================
-- الخطوة 4: تحقق من Edge Function Logs
-- ============================================
-- اذهب إلى: Supabase Dashboard → Edge Functions → Logs
-- ابحث عن: "scheduled-sync" في Logs

