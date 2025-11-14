# Supabase Migrations المطلوبة

## ⚠️ مهم جداً - يجب تنفيذها الآن!

هناك ثلاث migrations يجب تنفيذها في Supabase SQL Editor لإصلاح الأخطاء الحالية:

---

## 1️⃣ Features Tab - Change History (الأولوية: عالية جداً)

**الملف:**
```
supabase/migrations/20251114_features_tab_improvements.sql
```

**الغرض:**
- إنشاء جدول `business_profile_history`
- إنشاء دوال التتبع والاسترجاع
- إنشاء Trigger تلقائي

**الخطوات:**
1. اذهب إلى Supabase Dashboard → SQL Editor
2. انسخ محتويات الملف
3. اضغط Run

---

## 2️⃣ Missing Views and Tables (الأولوية: حرجة جداً - تؤثر على Vercel)

**الملف:**
```
supabase/migrations/20251114_create_missing_views_and_tables.sql
```

**الغرض:**
- إنشاء المشاهد المفقودة: `mv_location_stats`, `v_health_score_distribution`
- إنشاء جدول `health_check_results`
- إضافة RLS policies

**الخطوات:**
1. اذهب إلى Supabase Dashboard → SQL Editor
2. انسخ محتويات الملف
3. اضغط Run
4. تحقق من عدم وجود أخطاء

---

## 3️⃣ Business Profile History (إذا كنت بحاجة إلى نسخة احتياطية)

**الملف:**
```
supabase/migrations/20251114_create_business_profile_history.sql
```

**ملاحظة:** هذا مشابه لـ Features Tab migration لكن بصيغة مبسطة.

---

## ✅ كيفية التحقق من نجاح التنفيذ

بعد تنفيذ كل migration، تحقق من:

```sql
-- للتحقق من الجداول
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- للتحقق من المشاهد
SELECT schemaname, matviewname FROM pg_matviews 
WHERE schemaname = 'public';

-- للتحقق من الـ views
SELECT table_name FROM information_schema.views 
WHERE table_schema = 'public';
```

---

## 📌 ملاحظات هامة

⚠️ **لا تنسَ:**
- تنفيذ Migration #2 قبل أي شيء (يحل مشاكل Vercel الحالية)
- التحقق من عدم وجود أخطاء أثناء التنفيذ
- إذا حدث خطأ، قم بـ rollback والمحاولة مرة أخرى

🔒 **الأمان:**
- جميع الجداول بها RLS enabled
- جميع العمليات تتحقق من ملكية المستخدم

---

## 🚀 بعد التنفيذ

Vercel سيعيد البناء تلقائياً بعد إصلاح Supabase! 

إذا استمرت المشاكل، تأكد من:
1. تنفيذ Migration #2 بنجاح
2. عدم وجود أخطاء في Supabase SQL Editor
3. إعادة تحديث الصفحة في Vercel Dashboard
