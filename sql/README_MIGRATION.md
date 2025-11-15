# 🗄️ Database Migration Guide

## المشكلة التي تم حلها

عند محاولة تشغيل `dashboard-production-tables.sql` ظهرت أخطاء لأن الجداول موجودة بالفعل:

```
Error: Failed to run sql query: ERROR: 42710: policy "Users can view their own notifications" for table "notifications" already exists
```

## ✅ الحل

تم إنشاء ملف migration آمن: **`dashboard-production-tables-safe.sql`**

هذا الملف:
- ✅ يتحقق من وجود الجداول قبل إنشائها
- ✅ يضيف الأعمدة المفقودة فقط
- ✅ يحذف ويعيد إنشاء الـ policies بأمان
- ✅ يحدث الـ functions والـ triggers
- ✅ لا يسبب أخطاء إذا كانت الجداول موجودة

---

## 📋 الجداول الموجودة في قاعدة البيانات

حسب ملف `Supabase Snippet Public Schema Inventory.csv`:

| الجدول | الحالة | ملاحظات |
|--------|--------|----------|
| `notifications` | ✅ موجود | سيتم تحديث الـ policies فقط |
| `rate_limit_requests` | ✅ موجود | سيتم إضافة أعمدة إضافية |
| `performance_metrics` | ✅ موجود | سيتم تحديث الـ policies فقط |
| `error_logs` | ✅ موجود | سيتم إضافة أعمدة إضافية |

---

## 🚀 كيفية تشغيل الـ Migration

### الطريقة 1: عبر Supabase Dashboard (موصى بها)

1. افتح Supabase Dashboard
2. اذهب إلى **SQL Editor**
3. انسخ محتوى ملف `dashboard-production-tables-safe.sql`
4. الصق في SQL Editor
5. اضغط **Run**

### الطريقة 2: عبر Supabase CLI

```bash
cd /Users/nabel/Documents/GitHub/NNH-AI-Studio
supabase db execute -f sql/dashboard-production-tables-safe.sql
```

### الطريقة 3: عبر psql

```bash
psql -h your-db-host -U your-user -d your-db -f sql/dashboard-production-tables-safe.sql
```

---

## ✅ ما سيتم تحديثه

### 1. جدول `notifications`
- ✅ إضافة عمود `updated_at` (إذا لم يكن موجوداً)
- ✅ تحديث RLS policies
- ✅ إضافة trigger للـ `updated_at`

### 2. جدول `rate_limit_requests`
- ✅ إضافة عمود `endpoint` (إذا لم يكن موجوداً)
- ✅ إضافة عمود `ip_address` (إذا لم يكن موجوداً)
- ✅ إضافة عمود `user_agent` (إذا لم يكن موجوداً)
- ✅ إنشاء indexes

### 3. جدول `performance_metrics`
- ✅ تحديث RLS policies
- ✅ إنشاء indexes

### 4. جدول `error_logs`
- ✅ إضافة عمود `resolved_at` (إذا لم يكن موجوداً)
- ✅ إضافة عمود `resolved_by` (إذا لم يكن موجوداً)
- ✅ إعادة تسمية `timestamp` إلى `created_at`
- ✅ تحديث RLS policies
- ✅ إنشاء indexes

### 5. Functions (دوال)
- ✅ `create_notification()` - إنشاء إشعار
- ✅ `log_error()` - تسجيل خطأ
- ✅ `track_performance()` - تتبع أداء
- ✅ `cleanup_rate_limit_requests()` - تنظيف طلبات rate limit
- ✅ `cleanup_performance_metrics()` - تنظيف مقاييس الأداء
- ✅ `cleanup_error_logs()` - تنظيف سجلات الأخطاء

### 6. Triggers (مشغلات)
- ✅ `trigger_notify_new_review` - إشعار عند مراجعة جديدة
- ✅ `trigger_notify_new_question` - إشعار عند سؤال جديد

### 7. Views (عروض)
- ✅ `v_performance_summary` - ملخص مقاييس الأداء
- ✅ `v_error_summary` - ملخص الأخطاء
- ✅ `v_notification_summary` - ملخص الإشعارات

---

## 🔍 التحقق من نجاح الـ Migration

بعد تشغيل الـ migration، تحقق من النتائج:

```sql
-- تحقق من الـ policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('notifications', 'performance_metrics', 'error_logs');

-- تحقق من الـ functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('create_notification', 'log_error', 'track_performance');

-- تحقق من الـ triggers
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name IN ('trigger_notify_new_review', 'trigger_notify_new_question');

-- تحقق من الـ views
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name IN ('v_performance_summary', 'v_error_summary', 'v_notification_summary');
```

---

## 🧪 اختبار الميزات الجديدة

### 1. اختبار إنشاء إشعار

```sql
SELECT create_notification(
  auth.uid(),
  'system',
  'Test Notification',
  'This is a test notification',
  '/dashboard',
  '{"test": true}'::jsonb
);
```

### 2. اختبار تسجيل خطأ

```sql
SELECT log_error(
  auth.uid(),
  'Test error message',
  'Stack trace here',
  '{"context": "test"}'::jsonb,
  1
);
```

### 3. اختبار تتبع الأداء

```sql
SELECT track_performance(
  auth.uid(),
  'dashboard_load_time',
  1234.56,
  '{"page": "dashboard"}'::jsonb
);
```

### 4. اختبار الـ views

```sql
-- ملخص الأداء
SELECT * FROM v_performance_summary WHERE user_id = auth.uid();

-- ملخص الأخطاء
SELECT * FROM v_error_summary WHERE user_id = auth.uid();

-- ملخص الإشعارات
SELECT * FROM v_notification_summary WHERE user_id = auth.uid();
```

---

## 🔄 Rollback (إذا لزم الأمر)

إذا أردت التراجع عن التغييرات:

```sql
-- حذف الـ triggers
DROP TRIGGER IF EXISTS trigger_notify_new_review ON gmb_reviews;
DROP TRIGGER IF EXISTS trigger_notify_new_question ON gmb_questions;

-- حذف الـ functions
DROP FUNCTION IF EXISTS notify_new_review();
DROP FUNCTION IF EXISTS notify_new_question();
DROP FUNCTION IF EXISTS create_notification(UUID, TEXT, TEXT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS log_error(UUID, TEXT, TEXT, JSONB, INTEGER);
DROP FUNCTION IF EXISTS track_performance(UUID, TEXT, NUMERIC, JSONB);
DROP FUNCTION IF EXISTS cleanup_rate_limit_requests();
DROP FUNCTION IF EXISTS cleanup_performance_metrics();
DROP FUNCTION IF EXISTS cleanup_error_logs();

-- حذف الـ views
DROP VIEW IF EXISTS v_performance_summary;
DROP VIEW IF EXISTS v_error_summary;
DROP VIEW IF EXISTS v_notification_summary;

-- حذف الـ policies (اختياري)
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view their own metrics" ON performance_metrics;
DROP POLICY IF EXISTS "Users can insert their own metrics" ON performance_metrics;
DROP POLICY IF EXISTS "Users can view their own error logs" ON error_logs;
DROP POLICY IF EXISTS "Users can insert their own error logs" ON error_logs;
```

---

## 📝 ملاحظات مهمة

### الأمان
- ✅ جميع الـ functions تستخدم `SECURITY DEFINER`
- ✅ RLS policies مفعلة على جميع الجداول
- ✅ المستخدمون يمكنهم رؤية بياناتهم فقط

### الأداء
- ✅ Indexes مضافة على الأعمدة المهمة
- ✅ Cleanup functions للبيانات القديمة
- ✅ Views محسنة للاستعلامات السريعة

### الصيانة
- يُنصح بتشغيل cleanup functions بشكل دوري:
  - `cleanup_rate_limit_requests()` - كل ساعة
  - `cleanup_performance_metrics()` - كل يوم
  - `cleanup_error_logs()` - كل أسبوع

---

## 🎯 الخطوات التالية

بعد تشغيل الـ migration بنجاح:

1. ✅ اختبر الميزات الجديدة في Dashboard
2. ✅ تحقق من الإشعارات الفورية
3. ✅ راقب الأداء عبر `v_performance_summary`
4. ✅ تابع الأخطاء عبر `v_error_summary`
5. ✅ استخدم الـ Advanced Filters
6. ✅ استكشف AI Insights Panel

---

## 🆘 المساعدة

إذا واجهت أي مشاكل:

1. راجع رسالة الخطأ
2. تحقق من الـ Supabase logs
3. راجع ملف `DASHBOARD_DEVELOPER_GUIDE.md`
4. تحقق من الـ RLS policies

---

**آخر تحديث:** Current Session  
**الحالة:** ✅ جاهز للاستخدام  
**الملف الآمن:** `dashboard-production-tables-safe.sql`

