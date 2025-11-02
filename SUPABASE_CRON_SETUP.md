# إعداد Cron Jobs من Supabase

## الطريقة 1: Supabase Edge Functions + pg_cron (الأفضل)

### الخطوة 1: إنشاء Edge Function

```bash
# في مجلد المشروع
supabase functions new scheduled-sync
```

أو إنشاء الملف يدوياً:
- `supabase/functions/scheduled-sync/index.ts` (تم إنشاؤه)

### الخطوة 2: Deploy Edge Function

```bash
# تسجيل الدخول إلى Supabase
supabase login

# Link المشروع
supabase link --project-ref YOUR_PROJECT_REF

# Deploy Function
supabase functions deploy scheduled-sync
```

### الخطوة 3: إعداد pg_cron في Supabase SQL Editor

اذهب إلى Supabase Dashboard → SQL Editor → New Query

```sql
-- تفعيل pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- جدولة المزامنة كل ساعة (عند 0 دقيقة)
SELECT cron.schedule(
  'gmb-sync-hourly',                    -- اسم المهمة
  '0 * * * *',                          -- كل ساعة (0 دقيقة)
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/scheduled-sync',
      headers := jsonb_build_object(
        'Authorization', 'Bearer YOUR_CRON_SECRET',
        'Content-Type', 'application/json'
      )
    ) AS request_id;
  $$
);

-- جدولة المزامنة يومياً (الساعة 12 صباحاً)
SELECT cron.schedule(
  'gmb-sync-daily',
  '0 0 * * *',  -- كل يوم في منتصف الليل
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/scheduled-sync',
      headers := jsonb_build_object(
        'Authorization', 'Bearer YOUR_CRON_SECRET',
        'Content-Type', 'application/json'
      )
    ) AS request_id;
  $$
);

-- جدولة المزامنة أسبوعياً (كل يوم اثنين الساعة 12 صباحاً)
SELECT cron.schedule(
  'gmb-sync-weekly',
  '0 0 * * 1',  -- كل يوم اثنين
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/scheduled-sync',
      headers := jsonb_build_object(
        'Authorization', 'Bearer YOUR_CRON_SECRET',
        'Content-Type', 'application/json'
      )
    ) AS request_id;
  $$
);
```

### الخطوة 4: إضافة Secrets في Supabase

اذهب إلى Supabase Dashboard → Project Settings → Edge Functions → Secrets

أضف:
- `CRON_SECRET`: قم بتوليد secret قوي (مثل: `openssl rand -hex 32`)
- `NEXT_PUBLIC_BASE_URL`: رابط موقعك (مثل: `https://your-domain.com`)

### الخطوة 5: تحديث Environment Variables

في `.env.local` أو Replit Secrets:
- `CRON_SECRET`: نفس القيمة المستخدمة في Supabase
- `NEXT_PUBLIC_BASE_URL`: رابط موقعك

### إدارة Cron Jobs

```sql
-- عرض جميع Cron Jobs
SELECT * FROM cron.job;

-- حذف Cron Job
SELECT cron.unschedule('gmb-sync-hourly');

-- تحديث Cron Job (احذف ثم أنشئ جديد)
SELECT cron.unschedule('gmb-sync-hourly');
SELECT cron.schedule('gmb-sync-hourly', '0 * * * *', $$...$$);
```

---

## الطريقة 2: External Cron Service (الأسهل - مجاني)

### cron-job.org (مجاني تماماً)

1. **إنشاء حساب:**
   - اذهب إلى https://cron-job.org
   - سجل حساب مجاني

2. **إنشاء Cron Job:**
   - URL: `https://your-domain.com/api/gmb/scheduled-sync`
   - Schedule: `Every hour` أو `Custom: 0 * * * *`
   - HTTP Method: `GET`
   - Headers:
     ```
     Authorization: Bearer YOUR_CRON_SECRET
     ```
   - Status: `Active`

3. **إضافة CRON_SECRET في Environment Variables:**
   - في Replit: Secrets → Add `CRON_SECRET`
   - في Vercel: Environment Variables → Add `CRON_SECRET`

---

## الطريقة 3: Replit Scheduled Jobs

إذا كنت تستخدم Replit:

1. اذهب إلى Replit → Secrets
2. أضف:
   - `CRON_SECRET`: قم بتوليد secret
3. في Replit Settings → Scheduled Jobs:
   - Add Job:
     - Name: `GMB Sync`
     - URL: `https://your-replit-url.repl.co/api/gmb/scheduled-sync`
     - Schedule: `0 * * * *` (كل ساعة)
     - Method: `GET`
     - Headers: `Authorization: Bearer YOUR_CRON_SECRET`

---

## مقارنة الطرق

| الطريقة | التكلفة | الصعوبة | الموثوقية |
|---------|---------|---------|-----------|
| Supabase Edge + pg_cron | مجاني | متوسطة | عالية جداً |
| cron-job.org | مجاني | سهلة | عالية |
| Replit Scheduled | مجاني | سهلة | متوسطة |
| Vercel Cron | $20/شهر | سهلة | عالية جداً |

---

## التوصية

**للبدء السريع:** استخدم **cron-job.org** - مجاني وسهل جداً

**للمشاريع الكبيرة:** استخدم **Supabase Edge + pg_cron** - مجاني وقوي وموثوق

---

## اختبار Cron Job

```bash
# اختبار Edge Function مباشرة
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/scheduled-sync \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"

# اختبار API endpoint مباشرة
curl -X GET https://your-domain.com/api/gmb/scheduled-sync \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## ملاحظات الأمان

1. **استخدم CRON_SECRET قوي:**
   ```bash
   openssl rand -hex 32
   ```

2. **لا تشارك CRON_SECRET أبداً**

3. **تحقق من Authorization في كل request**

4. **استخدم HTTPS دائماً**

---

## استكشاف الأخطاء

### المشكلة: Cron Job لا يعمل
- تأكد من أن `CRON_SECRET` موجود في Environment Variables
- تأكد من أن URL صحيح
- تحقق من Logs في Supabase Dashboard → Edge Functions → Logs

### المشكلة: 401 Unauthorized
- تأكد من أن `Authorization` header موجود وصحيح
- تأكد من أن `CRON_SECRET` متطابق في جميع الأماكن

### المشكلة: Cron Job يعمل لكن لا يجد accounts
- تأكد من أن Logic في `/api/gmb/scheduled-sync` صحيح
- تحقق من أن `syncSchedule` موجود في `gmb_accounts.settings`

