# إعداد Supabase للمزامنة التلقائية - خطوات إضافية

## ✅ تم إنشاء Cron Jobs بنجاح!

الآن تحتاج إلى إكمال الخطوات التالية:

---

## 1. إضافة Secrets في Supabase Dashboard

### الخطوات:
1. اذهب إلى **Supabase Dashboard** → مشروعك
2. **Settings** → **Edge Functions** → **Secrets**
3. أضف الـ Secrets التالية:

#### Secret 1: CRON_SECRET
- **Key**: `CRON_SECRET`
- **Value**: (قم بتوليد secret قوي)
  ```bash
  openssl rand -hex 32
  ```
  أو استخدم نص عشوائي طويل مثل: `gmb-sync-secret-2024-nnh-abc123xyz`

#### Secret 2: NEXT_PUBLIC_BASE_URL
- **Key**: `NEXT_PUBLIC_BASE_URL`
- **Value**: رابط موقعك
  - مثال: `https://your-domain.com`
  - أو في Replit: `https://your-replit-url.repl.co`

---

## 2. تحديث Function `trigger_gmb_sync()` في Supabase SQL Editor

### الخطوات:
1. اذهب إلى **Supabase Dashboard** → **SQL Editor** → **New Query**
2. نفذ هذا SQL بعد استبدال القيم:

```sql
-- تحديث Function trigger_gmb_sync()
CREATE OR REPLACE FUNCTION trigger_gmb_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_ref TEXT := 'YOUR_PROJECT_REF';  -- ⚠️ استبدل بـ Project Reference الخاص بك
  cron_secret TEXT := 'YOUR_CRON_SECRET';   -- ⚠️ استبدل بـ CRON_SECRET الذي أضفته في Secrets
  edge_function_url TEXT;
BEGIN
  -- Build the Edge Function URL
  edge_function_url := 'https://' || project_ref || '.supabase.co/functions/v1/scheduled-sync';
  
  -- Make HTTP POST request to Edge Function
  PERFORM
    net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || cron_secret,
        'Content-Type', 'application/json'
      )
    ) AS request_id;
    
  RAISE NOTICE 'GMB sync triggered via Edge Function';
END;
$$;
```

### أين تجد PROJECT_REF؟
1. **Supabase Dashboard** → **Settings** → **General**
2. ابحث عن **Project Reference** (مثل: `rrarhekwhgpgkakqrlyn`)

---

## 3. Deploy Edge Function

### الطريقة الأولى: باستخدام Supabase CLI (موصى بها)

```bash
# 1. Install Supabase CLI (إذا لم يكن مثبت)
npm install -g supabase

# 2. Login إلى Supabase
supabase login

# 3. Link مشروعك
supabase link --project-ref YOUR_PROJECT_REF

# 4. Deploy Function
supabase functions deploy scheduled-sync
```

### الطريقة الثانية: Manual Deploy من Dashboard

1. اذهب إلى **Supabase Dashboard** → **Edge Functions**
2. **Create a new function**
3. **Name**: `scheduled-sync`
4. **Code**: انسخ محتوى `supabase/functions/scheduled-sync/index.ts`
5. **Deploy**

---

## 4. إضافة CRON_SECRET في Replit/Vercel

### في Replit:
1. **Secrets** → **Add Secret**
2. **Key**: `CRON_SECRET`
3. **Value**: (نفس القيمة التي أضفتها في Supabase Secrets)

### في Vercel:
1. **Project Settings** → **Environment Variables**
2. أضف:
   - `CRON_SECRET`: (نفس القيمة)

---

## 5. تحديث `.env.local` (للـ Local Development)

```env
CRON_SECRET=your-secret-here
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

---

## 6. اختبار الـ Setup

### اختبار 1: Edge Function مباشرة

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/scheduled-sync \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

يجب أن ترى response مثل:
```json
{
  "message": "Scheduled sync process completed",
  "synced": 0,
  "errors": 0
}
```

### اختبار 2: API Endpoint مباشرة

```bash
curl -X GET https://your-domain.com/api/gmb/scheduled-sync \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### اختبار 3: Cron Job (انتظر الساعة التالية)

- انتظر حتى الساعة التالية (عند دقيقة 0)
- تحقق من Logs في:
  - **Supabase Dashboard** → **Edge Functions** → **Logs**
  - **Replit Logs**

---

## 7. مراقبة Cron Jobs

### عرض Cron Jobs النشطة:

```sql
SELECT 
  jobid,
  schedule,
  command,
  active,
  jobname
FROM cron.job
WHERE active = true;
```

### عرض تاريخ تنفيذ Cron Jobs:

```sql
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 20;
```

---

## 8. استكشاف الأخطاء

### المشكلة: Cron Job لا يعمل

**الحلول:**
1. تحقق من أن `active = true`:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'gmb-sync-hourly';
   ```

2. تحقق من Logs:
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'gmb-sync-hourly')
   ORDER BY start_time DESC LIMIT 5;
   ```

3. تأكد من أن `pg_net` extension مفعل:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_net;
   ```

---

### المشكلة: Edge Function يعطي 401 Unauthorized

**الحلول:**
1. تأكد من أن `CRON_SECRET` متطابق في:
   - Supabase Edge Function Secrets
   - Function `trigger_gmb_sync()`
   - Next.js API endpoint

2. تحقق من Authorization Header في Edge Function Logs

---

### المشكلة: Edge Function لا يجد Accounts

**الحلول:**
1. تأكد من أن `NEXT_PUBLIC_BASE_URL` صحيح في Supabase Secrets
2. تحقق من أن API endpoint موجود ويعمل
3. تحقق من Logs في Next.js

---

## 9. إيقاف/تشغيل Cron Jobs

### إيقاف Cron Job مؤقتاً:

```sql
UPDATE cron.job 
SET active = false 
WHERE jobname = 'gmb-sync-hourly';
```

### تشغيل Cron Job:

```sql
UPDATE cron.job 
SET active = true 
WHERE jobname = 'gmb-sync-hourly';
```

### حذف Cron Job:

```sql
SELECT cron.unschedule('gmb-sync-hourly');
```

---

## 10. Checklist النهائي

- [ ] Cron Jobs تم إنشاؤها (✅ تم - حسب الجدول الذي أرسلته)
- [ ] Secrets أضفتها في Supabase Dashboard (CRON_SECRET + NEXT_PUBLIC_BASE_URL)
- [ ] Function `trigger_gmb_sync()` محدثة بـ PROJECT_REF و CRON_SECRET الصحيحين
- [ ] Edge Function تم Deploy
- [ ] CRON_SECRET أضفته في Replit/Vercel Secrets
- [ ] اختبرت Edge Function مباشرة
- [ ] اختبرت API endpoint
- [ ] راقبت Logs بعد ساعة واحدة للتأكد من عمل Cron

---

## ملاحظات مهمة

1. **كل Cron Job يستدعي `trigger_gmb_sync()`** → الذي يستدعي Edge Function → الذي يستدعي Next.js API
2. **الـ API endpoint يتحقق من الوقت ويختار الحسابات المراد مزامنتها** بناءً على `syncSchedule` في `settings`
3. **لذلك قد لا ترى sync في كل مرة** إذا لم تكن هناك حسابات مع `syncSchedule` مناسب للوقت الحالي

---

## مثال: كيف يعمل النظام

1. **الساعة 12:00** → Cron Job `gmb-sync-hourly` يعمل
2. يستدعي `trigger_gmb_sync()` → يستدعي Edge Function
3. Edge Function يستدعي `/api/gmb/scheduled-sync`
4. API يتحقق: أي حسابات لديها `syncSchedule = 'hourly'`؟
5. يجد حسابات → يبدأ المزامنة
6. يسجل النتائج في Logs

---

## جاهز! 🎉

بعد إكمال الخطوات أعلاه، ستعمل المزامنة التلقائية بشكل كامل!

