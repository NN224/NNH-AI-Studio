# دليل سريع لإعداد Cron Jobs

## الخيار الأسهل: cron-job.org (5 دقائق) ✅

### الخطوات:

1. **سجل حساب في cron-job.org:**
   - https://cron-job.org
   - حساب مجاني

2. **أنشئ Cron Job:**
   - URL: `https://your-domain.com/api/gmb/scheduled-sync`
   - Schedule: `Every hour` (أو اختر Custom)
   - Method: `GET`
   - Headers:
     ```
     Authorization: Bearer YOUR_SECRET_HERE
     ```

3. **أضف CRON_SECRET في Replit:**
   - Replit → Secrets → Add Secret
   - Key: `CRON_SECRET`
   - Value: (أي نص عشوائي طويل مثل: `my-secret-key-123456`)

4. **تم!** 🎉
   - سيتم استدعاء API كل ساعة تلقائياً

---

## الخيار الأفضل: Supabase Edge Function (15 دقيقة) ⭐

### الخطوات:

1. **Install Supabase CLI:**
   ```bash
   npm install -g supabase
   ```

2. **Login:**
   ```bash
   supabase login
   ```

3. **Link Project:**
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   (Project REF موجود في Supabase Dashboard → Settings → General)

4. **Deploy Function:**
   ```bash
   supabase functions deploy scheduled-sync
   ```

5. **إعداد Secrets في Supabase:**
   - Dashboard → Project Settings → Edge Functions → Secrets
   - أضف:
     - `CRON_SECRET`: (مثل: `openssl rand -hex 32`)
     - `NEXT_PUBLIC_BASE_URL`: (رابط موقعك)

6. **تشغيل SQL في Supabase SQL Editor:**
   - افتح `sql/setup_supabase_cron.sql`
   - استبدل `YOUR_PROJECT_REF` و `YOUR_CRON_SECRET`
   - نفذ السكريبت

7. **تم!** 🎉

---

## إيجاد PROJECT_REF في Supabase

1. اذهب إلى Supabase Dashboard
2. Settings → General
3. Project Reference (مثل: `rrarhekwhgpgkakqrlyn`)

---

## توليد CRON_SECRET

```bash
# في Terminal
openssl rand -hex 32
```

أو استخدم أي نص عشوائي طويل (مثل: `my-gmb-cron-secret-2024-nnh`)

---

## اختبار

```bash
# اختبار مباشر
curl -X GET https://your-domain.com/api/gmb/scheduled-sync \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

إذا رأيت JSON response = نجح! ✅

---

## ملاحظات

- ⚠️ لا تشارك `CRON_SECRET` أبداً
- ✅ استخدم HTTPS دائماً
- ✅ تأكد من أن `CRON_SECRET` متطابق في جميع الأماكن

---

## المساعدة

إذا واجهت مشاكل:
1. تحقق من Logs في Supabase Dashboard → Edge Functions
2. تحقق من Replit Logs
3. تأكد من أن URL صحيح
4. تأكد من أن `CRON_SECRET` موجود وصحيح

