# ⚡ البداية السريعة - تطبيق Database Migrations

> **وقت التنفيذ:** 5-10 دقائق

---

## 🎯 الهدف

إضافة جدولين ناقصين للـ Database:

1. `performance_metrics` - تتبع أداء التطبيق
2. `rate_limit_requests` - تتبع Rate Limiting

---

## 📋 طريقة التنفيذ (اختر واحدة)

### ⭐ الطريقة 1: التلقائية (موصى به) - 5 دقائق

```bash
# شغل الـ script التلقائي
./apply-migrations.sh
```

سيقوم الـ script بـ:

- ✅ التحقق من المتطلبات
- ✅ تطبيق الـ migrations
- ✅ التحقق من نجاح التطبيق
- ✅ تحديث database.types.ts

---

### 🔧 الطريقة 2: يدوية عبر Supabase Dashboard - 10 دقائق

#### الخطوة 1: افتح Supabase Dashboard

```
https://app.supabase.com/project/YOUR_PROJECT/sql
```

#### الخطوة 2: انسخ والصق SQL الأول

```bash
# انسخ محتوى هذا الملف
cat supabase/migrations/1764174400_add_performance_metrics.sql
```

- الصقه في SQL Editor
- اضغط **Run**
- انتظر رسالة "Success ✓"

#### الخطوة 3: انسخ والصق SQL الثاني

```bash
# انسخ محتوى هذا الملف
cat supabase/migrations/1764174401_add_rate_limit_requests.sql
```

- الصقه في SQL Editor
- اضغط **Run**
- انتظر رسالة "Success ✓"

#### الخطوة 4: تحقق من النجاح

شغل هذا الاستعلام في SQL Editor:

```sql
SELECT table_name,
       (SELECT COUNT(*) FROM information_schema.columns
        WHERE table_name = t.table_name) as columns
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('performance_metrics', 'rate_limit_requests');
```

**النتيجة المتوقعة:**

```
table_name              | columns
------------------------+---------
performance_metrics     |       7
rate_limit_requests     |       6
```

إذا ظهرت النتيجة → **نجحت العملية! ✅**

---

## ✅ التحقق النهائي

### 1. تحقق من الجداول في Dashboard

اذهب إلى:

```
Dashboard → Table Editor → القائمة الجانبية
```

يجب أن ترى:

- ✅ `performance_metrics`
- ✅ `rate_limit_requests`

### 2. اختبر في الكود

```bash
# أعد تشغيل Dev Server
npm run dev
```

افتح المتصفح وشوف Console:

- لا يجب أن تظهر أخطاء Database
- `lib/performance-tracking.ts` يجب أن يعمل
- `lib/security/rate-limiter.ts` يجب أن يعمل

---

## 🚨 إذا حدثت مشاكل

### Problem 1: "relation already exists"

**الحل:** الجدول موجود مسبقاً ✅ - تجاهل الخطأ

### Problem 2: "permission denied"

**الحل:** تأكد أنك تستخدم حساب Admin في Supabase

### Problem 3: Script لا يعمل

**الحل:** استخدم الطريقة 2 (يدوية عبر Dashboard)

---

## 📚 مستندات إضافية

للتفاصيل الكاملة، راجع:

- `MIGRATION_GUIDE.md` - دليل مفصل خطوة بخطوة
- `DATABASE_COMPLETE_SCHEMA_SQL.md` - Schema الكامل
- `DATABASE_TYPESCRIPT_INTERFACES.md` - TypeScript Interfaces

---

## ✨ بعد الانتهاء

```bash
# تحديث database types (اختياري)
supabase gen types typescript --local > lib/types/database.types.ts

# أعد تشغيل Dev Server
npm run dev

# اختبر Features الجديدة
# - Performance tracking: lib/performance-tracking.ts
# - Rate limiting: lib/security/rate-limiter.ts
```

---

**آخر تحديث:** 26 نوفمبر 2025
**وقت التنفيذ المتوقع:** 5-10 دقائق
**الصعوبة:** ⭐ سهل
