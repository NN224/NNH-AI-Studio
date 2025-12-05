# 📋 تقرير مراجعة البنية التحتية (Infrastructure Code Review)

> **تاريخ المراجعة**: 2025-12-05
> **الهدف**: التأكد من أن "الأرضية" التي سنبني عليها صلبة (المتغيرات والجداول)

---

## ✅ ما هو موجود وسليم (What's Working)

### 1. جداول GMB الأساسية

| الجدول          | الحالة  | ملاحظات                                      |
| --------------- | ------- | -------------------------------------------- |
| `gmb_accounts`  | ✅ سليم | معرف بشكل صحيح مع `user_id` FK، فهارس مناسبة |
| `gmb_secrets`   | ✅ سليم | جدول منفصل للـ tokens مع تشفير AES-256-GCM   |
| `gmb_services`  | ✅ سليم | جدول كامل مع RLS و service_role policy       |
| `gmb_locations` | ✅ سليم | ربط صحيح مع `gmb_accounts`                   |

#### تعريف `gmb_accounts`:

```sql
CREATE TABLE gmb_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  account_name TEXT,
  account_id TEXT UNIQUE NOT NULL,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  -- ... المزيد من الأعمدة
);
```

#### تعريف `gmb_secrets` (Token Storage):

```sql
CREATE TABLE gmb_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL UNIQUE REFERENCES gmb_accounts(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,  -- مشفر AES-256-GCM
  refresh_token TEXT,          -- مشفر، قابل للـ NULL
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### تعريف `gmb_services`:

```sql
CREATE TABLE gmb_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES gmb_locations(id) ON DELETE CASCADE,
  gmb_account_id UUID REFERENCES gmb_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  price NUMERIC(10, 2),
  currency TEXT NOT NULL DEFAULT 'USD',
  -- ... المزيد من الأعمدة
);
```

---

### 2. سياسات الأمان (RLS) ✅

#### `gmb_secrets` - Service Role فقط (الأكثر أماناً):

```sql
-- ✅ Service Role له صلاحية كاملة
CREATE POLICY "Service role has full access to gmb_secrets" ON gmb_secrets
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ✅ حظر كامل للمستخدمين العاديين
CREATE POLICY "Block all user access to gmb_secrets" ON gmb_secrets
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- ✅ حظر كامل للمجهولين
CREATE POLICY "Block all anon access to gmb_secrets" ON gmb_secrets
  FOR ALL TO anon USING (false) WITH CHECK (false);
```

#### `gmb_accounts` - المستخدم يرى بياناته فقط:

```sql
CREATE POLICY "Users can manage own GMB accounts" ON gmb_accounts
  FOR ALL USING (auth.uid() = user_id);
```

#### `gmb_services` - المستخدم + Service Role:

```sql
CREATE POLICY "Users can view own services" ON gmb_services
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access to services" ON gmb_services
  FOR ALL TO service_role USING (true) WITH CHECK (true);
```

#### `sync_queue` - Hybrid Access (للمزامنة):

```sql
-- المستخدم يرى ويضيف jobs خاصة به
CREATE POLICY "user_view_insert_queue" ON sync_queue
  FOR ALL USING (auth.uid() = user_id);

-- Service Role يدير كل الـ jobs
CREATE POLICY "service_manage_queue" ON sync_queue
  FOR ALL TO service_role USING (true) WITH CHECK (true);
```

---

### 3. التحقق من المتغيرات (env.ts) ✅ (تم الإصلاح)

```typescript
// lib/config/env.ts - بعد الإصلاح
const envSchema = z.object({
  // Database - using NEXT_PUBLIC_ prefix to match actual env vars ✅
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("Invalid Supabase URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "Missing Supabase anon key"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "Missing Supabase service role key"),

  // Google APIs - مطلوبة
  GOOGLE_CLIENT_ID: z.string().min(1, "Missing Google client ID"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "Missing Google client secret"),
  GOOGLE_REDIRECT_URI: z.string().url("Invalid Google redirect URI"),

  // AI Providers - اختيارية
  GROQ_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),

  // Security - ENCRYPTION_KEY is now REQUIRED ✅
  ENCRYPTION_KEY: z
    .string({
      required_error:
        "ENCRYPTION_KEY is required. Generate with: openssl rand -hex 32",
    })
    .length(64, "Encryption key must be exactly 64 characters")
    .regex(/^[a-fA-F0-9]+$/, "Encryption key must be hex encoded"),
});
```

---

## ⚠️ ما هو مفقود أو خطر (Missing/Risky)

### 1. ✅ FIXED: `ENCRYPTION_KEY` أصبح مطلوباً

**الموقع**: `lib/config/env.ts:41-52`

```typescript
// ✅ تم الإصلاح: المتغير مطلوب الآن
ENCRYPTION_KEY: z
  .string({
    required_error: "ENCRYPTION_KEY is required. Generate with: openssl rand -hex 32",
  })
  .length(64, "Encryption key must be exactly 64 characters")
  .regex(/^[a-fA-F0-9]+$/, "Encryption key must be hex encoded"),
```

**النتيجة**:

- التطبيق يفشل عند البدء إذا لم يكن المفتاح موجوداً ✅
- رسالة خطأ واضحة مع تعليمات التوليد ✅
- لا مزيد من Silent Failures ✅

---

### 2. ✅ FIXED: تم توحيد أسماء المتغيرات

| في `env.ts` (بعد الإصلاح)          | في `server.ts`                  | في `.env.example`               |
| ---------------------------------- | ------------------------------- | ------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL` ✅      | `NEXT_PUBLIC_SUPABASE_URL`      | `NEXT_PUBLIC_SUPABASE_URL`      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅ | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

**الموقع**:

- `lib/config/env.ts:15-17`
- `lib/supabase/server.ts:19-20`

**النتيجة**:

- التحقق يستخدم نفس الأسماء المستخدمة في الكود ✅
- لا مزيد من التضارب ✅

---

### 3. 🟡 WARNING: `GOOGLE_REDIRECT_URI` مفقود من ملفات المثال

**المشكلة**: `env.ts` يتطلب هذا المتغير:

```typescript
GOOGLE_REDIRECT_URI: z.string().url("Invalid Google redirect URI"),
```

لكنه **غير موجود** في:

- `.env.example` ❌
- `.env.local.example` ❌

**الحل**: إضافة للملفات:

```bash
# Google OAuth Redirect
GOOGLE_REDIRECT_URI="https://yourdomain.com/api/gmb/oauth-callback"
```

---

### 4. 🟡 WARNING: جدول متغيرات البيئة

| المتغير                         | مطلوب في الكود     | موجود في `.env.example` | الحالة          |
| ------------------------------- | ------------------ | ----------------------- | --------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | ✅                 | ✅                      | سليم            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅                 | ✅                      | سليم            |
| `SUPABASE_SERVICE_ROLE_KEY`     | ✅                 | ✅                      | سليم            |
| `GOOGLE_CLIENT_ID`              | ✅                 | ✅                      | سليم            |
| `GOOGLE_CLIENT_SECRET`          | ✅                 | ✅                      | سليم            |
| `GOOGLE_REDIRECT_URI`           | ✅                 | ❌                      | **مفقود**       |
| `ENCRYPTION_KEY`                | ✅ (للتشفير)       | ✅                      | سليم            |
| `CRON_SECRET`                   | ✅ (للـ cron jobs) | ✅                      | سليم            |
| `CSRF_SECRET`                   | اختياري            | ❌                      | مفقود (غير حرج) |

---

## 📝 قائمة الإصلاحات المطلوبة

### أولوية عالية (يجب إصلاحها قبل Production):

- [x] **1. جعل `ENCRYPTION_KEY` مطلوباً في `env.ts`** ✅ تم الإصلاح
- [x] **2. توحيد أسماء متغيرات Supabase** (`NEXT_PUBLIC_*`) ✅ تم الإصلاح
- [ ] **3. إضافة `GOOGLE_REDIRECT_URI` لملفات `.env.example`**

### أولوية متوسطة:

- [ ] **4. إضافة `CSRF_SECRET` لملفات المثال**
- [x] **5. توثيق كيفية توليد `ENCRYPTION_KEY`** ✅ مضاف في رسالة الخطأ:
  ```bash
  # توليد مفتاح تشفير آمن
  openssl rand -hex 32
  ```

---

## ✅ ملخص الحالة

| الفئة               | الحالة            | النسبة |
| ------------------- | ----------------- | ------ |
| جداول GMB           | ✅ سليمة          | 100%   |
| سياسات RLS          | ✅ مفعلة وآمنة    | 100%   |
| Service Role Access | ✅ معرف بشكل صحيح | 100%   |
| التحقق من المتغيرات | ✅ تم الإصلاح     | 95%    |
| ملفات المثال        | ⚠️ ناقصة          | 80%    |

**التقييم العام**: البنية التحتية **صلبة بنسبة 95%** بعد إصلاح `env.ts`. ✅

---

## 🔗 الملفات المرتبطة

- `lib/config/env.ts` - التحقق من المتغيرات
- `lib/supabase/server.ts` - إنشاء Supabase clients
- `lib/security/encryption.ts` - تشفير الـ tokens
- `supabase/migrations/20250101000000_init_full_schema.sql` - Schema الأساسي
- `supabase/migrations/20251128000001_create_gmb_services.sql` - جدول الخدمات
- `supabase/migrations/20251201000000_harden_rls_policies.sql` - تقوية RLS
