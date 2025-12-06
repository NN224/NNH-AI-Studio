# إعداد pg_cron في Supabase

## 📋 المتطلبات

- Supabase Project (Pro plan أو أعلى - pg_cron متاح فقط في Pro+)
- Database access (SQL Editor)
- CRON_SECRET environment variable

## 🔧 خطوات الإعداد

### 1. تفعيل pg_cron Extension

افتح SQL Editor في Supabase Dashboard وقم بتنفيذ:

```sql
-- تفعيل pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- التحقق من التفعيل
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

### 2. إعداد CRON_SECRET

في Supabase Dashboard → Settings → Database → Custom Config:

```sql
-- إضافة CRON_SECRET كـ database setting
ALTER DATABASE postgres SET app.cron_secret = 'YOUR_SECRET_HERE';
```

أو استخدم environment variable في Supabase:

- Settings → API → Environment Variables
- أضف `CRON_SECRET` مع قيمة آمنة (32+ حرف)

### 3. إنشاء Cron Jobs

**⚠️ مهم**: قبل إنشاء الـ jobs، تأكد من:

1. تطبيق migration `20250115000000_fix_stale_jobs_and_distributed_lock.sql`
2. استبدال `YOUR_PROJECT_REF` بـ project_id الخاص بك
3. إعداد `CRON_SECRET` في database settings

```sql
-- Job 1: تشغيل sync worker كل 5 دقائق
-- ملاحظة: استبدل YOUR_PROJECT_REF بـ project_id الخاص بك (من supabase/config.toml)
-- مثال: rrarhekwhgpgkakqrlyn
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

-- Job 2: تنظيف stale jobs كل 15 دقيقة
-- ملاحظة: mark_stale_sync_jobs() ترجع TABLE، لكن SELECT يعمل بشكل صحيح
SELECT cron.schedule(
  'mark-stale-sync-jobs',
  '*/15 * * * *', -- كل 15 دقيقة
  $$
  SELECT * FROM mark_stale_sync_jobs();
  $$
);

-- Job 3: تنظيف expired locks كل ساعة
SELECT cron.schedule(
  'cleanup-expired-locks',
  '0 * * * *', -- كل ساعة
  $$
  SELECT cleanup_expired_locks();
  $$
);
```

### 3.5. إصلاح Cron Jobs الموجودة (اختياري)

إذا كانت الـ jobs موجودة بالفعل وتريد إصلاحها:

```sql
-- استخدم الـ script الجاهز في docs/fix-cron-jobs.sql
-- أو نفذ الأوامر التالية يدوياً:

-- حذف الـ jobs القديمة
SELECT cron.unschedule('gmb-sync-worker');
SELECT cron.unschedule('mark-stale-sync-jobs');
SELECT cron.unschedule('cleanup-expired-locks');

-- ثم أنشئها من جديد باستخدام الأوامر في القسم 3 أعلاه
```

**ملاحظة**: تأكد من:

- ✅ استبدال `YOUR_PROJECT_REF` بـ project_id الحقيقي
- ✅ استخدام `SELECT * FROM mark_stale_sync_jobs();` (وليس `SELECT mark_stale_sync_jobs();`)

### 4. التحقق من Cron Jobs

```sql
-- عرض جميع cron jobs
SELECT * FROM cron.job;

-- عرض تاريخ تنفيذ cron jobs
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

**ملاحظة**: إذا كانت الـ jobs موجودة بالفعل في Supabase Dashboard:

1. تأكد من أن الـ URL في `gmb-sync-worker` صحيح (يستخدم project_id الحقيقي)
2. تأكد من أن `mark-stale-sync-jobs` يستخدم `SELECT * FROM mark_stale_sync_jobs();` (وليس `SELECT mark_stale_sync_jobs();`)
3. إذا كان هناك خطأ، احذف الـ job وأنشئه من جديد

### 5. إدارة Cron Jobs

```sql
-- إيقاف job مؤقتاً
SELECT cron.unschedule('gmb-sync-worker');

-- إعادة تفعيل job
SELECT cron.schedule(
  'gmb-sync-worker',
  '*/5 * * * *',
  $$ ... $$
);

-- حذف job
SELECT cron.unschedule('gmb-sync-worker');
```

## ⚠️ ملاحظات مهمة

1. **pg_cron متاح فقط في Pro plan أو أعلى**
   - Free tier لا يدعم pg_cron
   - استخدم Vercel Cron كـ fallback

2. **Security**
   - استخدم CRON_SECRET قوي (32+ حرف)
   - لا تشارك CRON_SECRET في الكود
   - استخدم environment variables

3. **Monitoring**
   - راقب `cron.job_run_details` بانتظام
   - تحقق من الأخطاء في logs
   - استخدم Supabase Dashboard → Logs

4. **Fallback Strategy**
   - Vercel Cron موجود في `vercel.json` كـ backup
   - إذا فشل pg_cron، Vercel Cron سيعمل تلقائياً

## 🔄 Migration Strategy

إذا كنت تستخدم Vercel Cron حالياً:

1. أضف pg_cron jobs (كما هو موضح أعلاه)
2. احتفظ بـ Vercel Cron كـ backup
3. راقب كلا النظامين لمدة أسبوع
4. إذا كان pg_cron يعمل بشكل جيد، يمكنك إزالة Vercel Cron (اختياري)

## 📊 Monitoring

```sql
-- عدد jobs النشطة
SELECT COUNT(*) FROM cron.job WHERE active = true;

-- آخر 10 تنفيذات
SELECT
  jobid,
  jobname,
  status,
  start_time,
  end_time,
  return_message
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;

-- Jobs التي فشلت
SELECT
  jobname,
  status,
  start_time,
  return_message
FROM cron.job_run_details
WHERE status = 'failed'
ORDER BY start_time DESC
LIMIT 10;
```

## 🆘 Troubleshooting

### المشكلة: pg_cron غير متاح

**الحل**: تأكد من أنك في Pro plan أو أعلى

### المشكلة: Jobs لا تعمل

**الحل**:

1. تحقق من `cron.job_run_details` للأخطاء
2. تأكد من صحة URLs
3. تحقق من CRON_SECRET

### المشكلة: Permission denied

**الحل**: تأكد من أنك تستخدم service_role أو superuser

## 📚 مراجع

- [pg_cron Documentation](https://github.com/citusdata/pg_cron)
- [Supabase Database Functions](https://supabase.com/docs/guides/database/functions)
- [Supabase Cron Jobs](https://supabase.com/docs/guides/database/extensions/pg_cron)
