# ✅ Checklist: إعداد Supabase Cron Jobs

## الخطوات المطلوبة (بعد إنشاء Cron Jobs)

### 1. ✅ Cron Jobs تم إنشاؤها
الوضع: ✅ **تم** - حسب الجدول الذي أرسلته:
- `gmb-sync-hourly` - كل ساعة
- `gmb-sync-daily` - يومياً
- `gmb-sync-9am` - الساعة 9 صباحاً
- `gmb-sync-6pm` - الساعة 6 مساءً
- `gmb-sync-weekly` - أسبوعياً

---

### 2. ⚠️ تحديث Function `trigger_gmb_sync()`

**الخطوة:**
1. اذهب إلى **Supabase Dashboard** → **SQL Editor**
2. افتح ملف `sql/update_trigger_function.sql`
3. استبدل `YOUR_CRON_SECRET` بالقيمة الفعلية
4. نفذ السكريبت

**أو نفذ مباشرة:**
```sql
CREATE OR REPLACE FUNCTION trigger_gmb_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_ref TEXT := 'rrarhekwhgpgkakqrlyn';
  cron_secret TEXT := 'my-super-secret-76001066';  -- ⚠️ استبدل هنا
  edge_function_url TEXT;
BEGIN
  edge_function_url := 'https://' || project_ref || '.supabase.co/functions/v1/scheduled-sync';
  
  PERFORM
    net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || cron_secret,
        'Content-Type', 'application/json'
      )
    ) AS request_id;
    
  RAISE NOTICE 'GMB sync triggered: %', edge_function_url;
END;
$$;
```

---

### 3. ⚠️ إضافة Secrets في Supabase Dashboard

**الخطوات:**
1. **Supabase Dashboard** → **Settings** → **Edge Functions** → **Secrets**
2. أضف Secret جديد:

#### Secret 1: CRON_SECRET
```
Key: CRON_SECRET
Value: (قم بتوليد - استخدم openssl rand -hex 32)
```
**مثال:** `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

#### Secret 2: NEXT_PUBLIC_BASE_URL
```
Key: NEXT_PUBLIC_BASE_URL
Value: https://your-domain.com
```
**أو في Replit:** `https://your-replit-url.repl.co`

---

### 4. ⚠️ Deploy Edge Function

**الطريقة الأولى: Supabase CLI**

```bash
# Install (إذا لم يكن مثبت)
npm install -g supabase

# Login
supabase login

# Link Project
supabase link --project-ref rrarhekwhgpgkakqrlyn

# Deploy
supabase functions deploy scheduled-sync
```

**الطريقة الثانية: من Dashboard**
1. **Supabase Dashboard** → **Edge Functions** → **Create Function**
2. **Name:** `scheduled-sync`
3. **Code:** انسخ من `supabase/functions/scheduled-sync/index.ts`
4. **Deploy**

---

### 5. ⚠️ إضافة CRON_SECRET في Replit

**الخطوات:**
1. **Replit** → **Secrets** (أيقونة 🔒 في الـ Sidebar)
2. **Add Secret:**
   - **Key:** `CRON_SECRET`
   - **Value:** (نفس القيمة التي أضفتها في Supabase Secrets)

---

### 6. ✅ اختبار

**اختبار 1: Edge Function مباشرة**
```bash
curl -X POST https://rrarhekwhgpgkakqrlyn.supabase.co/functions/v1/scheduled-sync \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

**اختبار 2: Function يدوياً**
```sql
-- في Supabase SQL Editor
SELECT trigger_gmb_sync();
```

**اختبار 3: API Endpoint**
```bash
curl -X GET https://your-domain.com/api/gmb/scheduled-sync \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

### 7. ✅ اختبار Cron Jobs من SQL Editor

**الخطوات السريعة:**
1. افتح **Supabase Dashboard** → **SQL Editor**
2. نفذ ملف `sql/quick_cron_test.sql` أو:

```sql
-- 1. عرض Cron Jobs
SELECT jobname, schedule, 
  CASE WHEN active THEN '✅ نشط' ELSE '❌ متوقف' END AS status
FROM cron.job WHERE jobname LIKE 'gmb-sync%';

-- 2. اختبار Function يدوياً
SELECT trigger_gmb_sync();

-- 3. عرض آخر تنفيذات
SELECT jobname, start_time, status, return_message
FROM cron.job_run_details rd
JOIN cron.job j ON rd.jobid = j.jobid
WHERE j.jobname LIKE 'gmb-sync%'
ORDER BY start_time DESC LIMIT 5;
```

**للمزيد من Queries:** راجع `sql/test_cron_jobs.sql`

---

### 8. ✅ مراقبة Logs

**Supabase Logs:**
- **Dashboard** → **Edge Functions** → **Logs**

**Cron Job Logs:**
```sql
SELECT 
  jobid,
  runid,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname LIKE 'gmb-sync%')
ORDER BY start_time DESC
LIMIT 10;
```

---

## 📋 Checklist السريع

- [ ] ✅ Cron Jobs تم إنشاؤها
- [ ] ⚠️ Function `trigger_gmb_sync()` محدثة بـ CRON_SECRET الصحيح
- [ ] ⚠️ Secrets أضفتها في Supabase (CRON_SECRET + NEXT_PUBLIC_BASE_URL)
- [ ] ⚠️ Edge Function تم Deploy
- [ ] ⚠️ CRON_SECRET أضفته في Replit Secrets
- [ ] ⚠️ اختبرت Edge Function
- [ ] ⚠️ اختبرت Function يدوياً
- [ ] ⚠️ راقبت Logs بعد ساعة

---

## 🎯 القيم المطلوبة

### PROJECT_REF
```
rrarhekwhgpgkakqrlyn
```

### Edge Function URL
```
https://rrarhekwhgpgkakqrlyn.supabase.co/functions/v1/scheduled-sync
```

### CRON_SECRET
```
(قم بتوليده - استخدم نفس القيمة في جميع الأماكن)
```

### NEXT_PUBLIC_BASE_URL
```
https://your-domain.com
أو
https://your-replit-url.repl.co
```

---

## ⚠️ ملاحظات مهمة

1. **CRON_SECRET يجب أن يكون نفسه في:**
   - Supabase Secrets
   - Function `trigger_gmb_sync()`
   - Replit Secrets
   - `.env.local` (للـ local development)

2. **Cron Jobs ستعمل فقط للحسابات التي لديها:**
   - `syncSchedule` محدد في `gmb_accounts.settings`
   - `syncSchedule` يطابق وقت Cron Job

3. **للاختبار السريع:**
   - ضع `syncSchedule = 'hourly'` في Settings
   - انتظر حتى الدقيقة 0 من الساعة التالية
   - تحقق من Logs

---

## 🆘 استكشاف الأخطاء

### المشكلة: Function لا تعمل
**الحل:**
```sql
-- تحقق من أن Function موجودة
SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'trigger_gmb_sync';
```

### المشكلة: Edge Function يعطي 401
**الحل:** تأكد من أن CRON_SECRET متطابق في جميع الأماكن

### المشكلة: لا توجد accounts للمزامنة
**الحل:** تحقق من Settings:
```sql
SELECT id, account_name, settings->>'syncSchedule' as sync_schedule
FROM gmb_accounts
WHERE is_active = true;
```

---

## ✅ بعد إكمال جميع الخطوات

النظام سيعمل تلقائياً:
- ✅ كل ساعة → `gmb-sync-hourly`
- ✅ يومياً → `gmb-sync-daily`
- ✅ الساعة 9 و 6 → `gmb-sync-9am`, `gmb-sync-6pm`
- ✅ أسبوعياً → `gmb-sync-weekly`

**ولكن:** المزامنة تحدث فقط للحسابات التي `syncSchedule` يطابق الوقت!

