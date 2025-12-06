# 🔴 Fix 401 Unauthorized Error

## المشكلة:
Edge Function ترفض الطلب لأن `TRIGGER_SECRET` env variable ناقص.

---

## ✅ الحل السريع (خيارين):

### Option 1: إضافة TRIGGER_SECRET للـ Edge Functions ⚡ (موصى به)

#### Via Supabase Dashboard:

1. اذهب إلى: https://supabase.com/dashboard/project/rrarhekwhgpgkakqrlyn/settings/functions

2. في **Secrets** section، أضف:

```env
TRIGGER_SECRET=y0a943a6fb8321ab8ed21847771488223cfbb058cb4dfd9ccb0df3a8b9c448cd1
SUPABASE_URL=https://rrarhekwhgpgkakqrlyn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[من Settings → API → service_role key]
```

3. اضغط **Save**

#### Via CLI:

```bash
supabase secrets set \
  TRIGGER_SECRET=y0a943a6fb8321ab8ed21847771488223cfbb058cb4dfd9ccb0df3a8b9c448cd1 \
  SUPABASE_URL=https://rrarhekwhgpgkakqrlyn.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=eyJh...your-key \
  --project-ref rrarhekwhgpgkakqrlyn
```

---

### Option 2: تعديل trigger_sync_worker() لاستخدام Service Role Key

```sql
-- في Supabase SQL Editor
CREATE OR REPLACE FUNCTION trigger_sync_worker()
RETURNS void AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_role_key TEXT;  -- ✅ تغيير
  v_worker_enabled TEXT;
  v_response_id BIGINT;
BEGIN
  v_supabase_url := get_sync_config('supabase_url');
  v_service_role_key := get_sync_config('service_role_key');  -- ✅ جديد
  v_worker_enabled := get_sync_config('worker_enabled');
  
  IF v_worker_enabled IS NULL OR v_worker_enabled != 'true' THEN
    RAISE NOTICE 'Sync worker is disabled';
    RETURN;
  END IF;
  
  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    RAISE WARNING 'supabase_url not configured';
    RETURN;
  END IF;
  
  IF v_service_role_key IS NULL OR v_service_role_key = '' THEN
    RAISE WARNING 'service_role_key not configured';
    RETURN;
  END IF;

  -- ✅ استخدام Authorization header بدلاً من X-Trigger-Secret
  SELECT id INTO v_response_id
  FROM net.http_post(
    url := v_supabase_url || '/functions/v1/gmb-sync-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key  -- ✅ تغيير
    ),
    body := jsonb_build_object(
      'trigger', 'cron',
      'timestamp', NOW()
    )
  );

  RAISE NOTICE 'Sync worker triggered successfully. Request ID: %', v_response_id;
  
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to trigger sync worker: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إضافة service_role_key للـ config
INSERT INTO sync_system_config (key, value, description) 
VALUES ('service_role_key', '', 'Supabase service role key - UPDATE THIS')
ON CONFLICT (key) DO NOTHING;

-- تحديث القيمة (احصل عليها من Settings → API)
UPDATE sync_system_config
SET value = 'eyJh...your-service-role-key-here'
WHERE key = 'service_role_key';
```

---

## 🎯 أي خيار أفضل؟

### Option 1 (TRIGGER_SECRET) ✅ موصى به
**Pros:**
- ✅ أبسط وأسرع
- ✅ أكثر أماناً (secret مخصص)
- ✅ لا يحتاج تعديل database

**Cons:**
- ⏱️ يحتاج وصول لـ Supabase Dashboard

---

### Option 2 (Service Role Key)
**Pros:**
- ✅ يعمل فوراً بدون env vars
- ✅ الكود يستخدمه أصلاً كـ fallback

**Cons:**
- ⚠️ يحتاج حفظ service_role_key في database
- ⚠️ أقل أماناً (key قوي في plaintext)

---

## ⚡ الحل الفوري (الأسرع):

### استخدم Service Role Key مباشرة في SQL:

```sql
-- 1. إضافة القيمة للـ config
UPDATE sync_system_config
SET value = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'  -- ضع service_role_key هنا
WHERE key = 'service_role_key';

-- 2. تطبيق الدالة المحسنة (Option 2 أعلاه)

-- 3. اختبار
SELECT trigger_sync_worker();
```

**للحصول على service_role_key:**
- Dashboard → Settings → API
- انسخ "service_role" (secret key)

---

## ✅ التحقق من النجاح:

```sql
-- بعد التطبيق
SELECT trigger_sync_worker();

-- انتظر 10 ثوانٍ ثم تحقق
SELECT 
  status,
  COUNT(*)
FROM sync_queue
GROUP BY status;
```

**يجب أن ترى:**
```
pending: 0 (or less than before)
processing: 1-2
completed: 1+ ✅
```

---

## 🔍 Check Logs:

```bash
# من Terminal
supabase functions logs gmb-sync-worker --project-ref rrarhekwhgpgkakqrlyn

# يجب أن ترى:
# ✅ 200 OK (بدلاً من 401)
```

---

## 📊 الخلاصة:

**السبب:** `TRIGGER_SECRET` env variable ناقص في Edge Functions

**الحل السريع:**
1. أضف TRIGGER_SECRET في Dashboard (Option 1)
   أو
2. استخدم service_role_key في database (Option 2)

**التوقيت:**
- Option 1: 5 دقائق
- Option 2: دقيقتين

**بعدها:** ✅ 401 error سيختفي و jobs ستُعالج تلقائياً!
