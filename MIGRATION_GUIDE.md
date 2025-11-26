# 🚀 دليل تطبيق Database Migrations

> **تاريخ الإنشاء:** 26 نوفمبر 2025
> **الهدف:** مزامنة Database مع الكود (إضافة جدولين ناقصين)

---

## 📋 ملخص التغييرات

### الجداول المضافة:

1. ✅ `performance_metrics` - تتبع أداء التطبيق
2. ✅ `rate_limit_requests` - تتبع Rate Limiting للـ API

### ملفات الـ Migration:

- `supabase/migrations/1764174400_add_performance_metrics.sql`
- `supabase/migrations/1764174401_add_rate_limit_requests.sql`

---

## 🔧 خطوات التطبيق

### الطريقة 1: عبر Supabase CLI (موصى به)

#### 1. تحقق من تثبيت Supabase CLI

```bash
supabase --version
```

إذا غير مثبت:

```bash
# macOS
brew install supabase/tap/supabase

# أو عبر npm
npm install -g supabase
```

#### 2. تسجيل الدخول لـ Supabase

```bash
supabase login
```

#### 3. ربط المشروع

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

**ملاحظة:** احصل على `YOUR_PROJECT_REF` من:

- Supabase Dashboard → Settings → General → Reference ID
- أو من URL المشروع: `https://YOUR_PROJECT_REF.supabase.co`

#### 4. تطبيق الـ Migrations

```bash
# تطبيق جميع الـ migrations الجديدة
supabase db push

# أو تطبيق migration محدد
supabase db push 1764174400_add_performance_metrics.sql
supabase db push 1764174401_add_rate_limit_requests.sql
```

#### 5. تحديث الـ Types

```bash
# تحديث database.types.ts تلقائياً
supabase gen types typescript --local > lib/types/database.types.ts
```

---

### الطريقة 2: عبر Supabase Dashboard (يدوي)

#### 1. افتح Supabase Dashboard

- اذهب إلى: https://app.supabase.com
- افتح مشروعك: **NNH AI Studio**

#### 2. افتح SQL Editor

- من القائمة الجانبية → **SQL Editor**

#### 3. تطبيق Migration الأول (performance_metrics)

انسخ محتوى الملف:

```bash
cat supabase/migrations/1764174400_add_performance_metrics.sql
```

والصقه في SQL Editor واضغط **Run**

#### 4. تطبيق Migration الثاني (rate_limit_requests)

انسخ محتوى الملف:

```bash
cat supabase/migrations/1764174401_add_rate_limit_requests.sql
```

والصقه في SQL Editor واضغط **Run**

#### 5. تحقق من الجداول

```sql
-- تحقق من وجود performance_metrics
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'performance_metrics'
ORDER BY ordinal_position;

-- تحقق من وجود rate_limit_requests
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'rate_limit_requests'
ORDER BY ordinal_position;
```

---

### الطريقة 3: عبر psql (Advanced)

```bash
# الاتصال بـ Database
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"

# تطبيق الـ migrations
\i supabase/migrations/1764174400_add_performance_metrics.sql
\i supabase/migrations/1764174401_add_rate_limit_requests.sql

# التحقق
\dt performance_metrics
\dt rate_limit_requests

# الخروج
\q
```

---

## ✅ التحقق من نجاح التطبيق

### 1. تحقق من الجداول

```sql
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('performance_metrics', 'rate_limit_requests')
ORDER BY table_name;
```

النتيجة المتوقعة:

```
table_name              | column_count
------------------------+--------------
performance_metrics     |           7
rate_limit_requests     |           6
```

### 2. تحقق من الـ Indexes

```sql
SELECT
  tablename,
  indexname
FROM pg_indexes
WHERE tablename IN ('performance_metrics', 'rate_limit_requests')
ORDER BY tablename, indexname;
```

النتيجة المتوقعة:

- `performance_metrics`: 4 indexes
- `rate_limit_requests`: 4 indexes

### 3. تحقق من RLS Policies

```sql
SELECT
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('performance_metrics', 'rate_limit_requests')
ORDER BY tablename;
```

النتيجة المتوقعة:

- `performance_metrics`: 2 policies (SELECT, INSERT)

---

## 🔄 تحديث الكود بعد التطبيق

### 1. تحديث database.types.ts

```bash
# إذا كنت تستخدم Supabase CLI
supabase gen types typescript --project-ref YOUR_PROJECT_REF > lib/types/database.types.ts

# أو من local
supabase gen types typescript --local > lib/types/database.types.ts
```

### 2. إعادة تشغيل الـ Dev Server

```bash
npm run dev
```

### 3. اختبار الـ Features

#### اختبار Performance Tracking:

```typescript
// lib/performance-tracking.ts يجب أن يعمل الآن
import { performanceTracker } from "@/lib/performance-tracking";

performanceTracker.record("test_metric", 100, { test: true });
await performanceTracker.flush();
```

#### اختبار Rate Limiting:

```typescript
// lib/security/rate-limiter.ts يجب أن يعمل الآن
import { checkRateLimit } from "@/lib/security/rate-limiter";

const result = await checkRateLimit("user_id_123", "/api/test", {
  maxRequests: 10,
  windowMs: 60000,
});
console.log(result); // { success: true, remaining: 9, ... }
```

---

## 🚨 استكشاف الأخطاء

### Error: "relation already exists"

```sql
-- تحقق من وجود الجدول
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'performance_metrics'
);
```

إذا كان موجود:

- الجدول موجود مسبقاً ✅
- لا حاجة لإعادة تطبيق الـ migration

### Error: "permission denied"

تأكد من:

1. أنك متصل كـ `postgres` user
2. لديك صلاحيات إنشاء جداول
3. RLS مفعّل بشكل صحيح

### Error: "syntax error"

تحقق من:

1. نسخ الـ SQL بشكل كامل
2. عدم وجود أحرف خاصة في النص المنسوخ
3. تطبيق كل migration على حدة

---

## 📊 بعد التطبيق

### إحصائيات Database:

- **إجمالي الجداول:** 25 (كان 23)
- **إجمالي الأعمدة:** 619 (كان 606)
- **إجمالي الـ Indexes:** 305+ (كان 297+)
- **إجمالي الـ RLS Policies:** 99 (كان 97)

### الملفات المحدّثة:

- ✅ `DATABASE_COMPLETE_SCHEMA_SQL.md` (1,396 سطر)
- ✅ `DATABASE_TYPESCRIPT_INTERFACES.md` (1,613 سطر)
- ✅ `DATABASE_CODE_MAPPING.md` (1,183 سطر)
- ✅ `supabase/migrations/1764174400_add_performance_metrics.sql` (جديد)
- ✅ `supabase/migrations/1764174401_add_rate_limit_requests.sql` (جديد)

---

## 📞 الدعم

إذا واجهت أي مشكلة:

1. تحقق من Supabase Logs في Dashboard
2. راجع هذا الدليل خطوة بخطوة
3. تأكد من صلاحيات الـ Database

---

**آخر تحديث:** 26 نوفمبر 2025
