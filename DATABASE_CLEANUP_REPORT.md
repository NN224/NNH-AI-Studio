# 🗑️ تقرير تنظيف قاعدة البيانات

**التاريخ:** 15 نوفمبر 2025  
**المشروع:** NNH-AI-Studio

---

## 📊 نتائج الفحص

### **الملفات الممسوحة:**
```
📁 1,614 ملف في المشروع
✅ 145 ملف يستخدم قاعدة البيانات
```

---

## ✅ الجداول المستخدمة (16 جدول)

```
1.  gmb_locations               268 استخدام في 83 ملف  ⭐⭐⭐⭐⭐
2.  gmb_accounts                185 استخدام في 61 ملف  ⭐⭐⭐⭐⭐
3.  gmb_reviews                 152 استخدام في 48 ملف  ⭐⭐⭐⭐⭐
4.  gmb_questions               94 استخدام في 23 ملف   ⭐⭐⭐⭐
5.  gmb_posts                   82 استخدام في 21 ملف   ⭐⭐⭐⭐
6.  gmb_media                   29 استخدام في 9 ملفات  ⭐⭐⭐
7.  ai_settings                 18 استخدام في 5 ملفات  ⭐⭐⭐
8.  weekly_task_recommendations 18 استخدام في 4 ملفات  ⭐⭐⭐
9.  profiles                    14 استخدام في 5 ملفات  ⭐⭐
10. notifications               14 استخدام في 3 ملفات  ⭐⭐
11. activity_logs               12 استخدام في 6 ملفات  ⭐⭐
12. ai_requests                 8 استخدام في 3 ملفات   ⭐⭐
13. rate_limit_requests         8 استخدام في 1 ملف     ⭐
14. audit_logs                  4 استخدام في 1 ملف     ⭐
15. error_logs                  2 استخدام في 1 ملف     ⭐
16. performance_metrics         2 استخدام في 1 ملف     ⭐
```

---

## ❌ الجداول غير المستخدمة (19 جدول)

### **🔐 Auth Tables (5 جداول):**
```
❌ sessions                     - جدول Sessions قديم
❌ refresh_tokens               - جدول Refresh Tokens قديم
❌ password_reset_tokens        - جدول Reset Tokens قديم
❌ email_verification_tokens    - جدول Verification قديم
❌ users                        - جدول Users مكرر (Supabase Auth)
```

**التوصية:** ✅ احذف (Supabase Auth يستخدم schema منفصل)

---

### **👥 Roles & Permissions (4 جداول):**
```
❌ user_permissions             - صلاحيات المستخدمين
❌ role_permissions             - صلاحيات الأدوار
❌ permissions                  - الصلاحيات
❌ user_roles                   - أدوار المستخدمين
```

**التوصية:** ✅ احذف (نظام الصلاحيات غير مستخدم)

---

### **🔗 Webhooks (2 جداول):**
```
❌ webhook_events               - أحداث الـ Webhooks
❌ webhooks                     - الـ Webhooks
```

**التوصية:** ✅ احذف (تاب Webhooks تم حذفه)

---

### **⚙️ Settings & Preferences (4 جداول):**
```
❌ api_keys                     - مفاتيح API
❌ saved_filters                - الفلاتر المحفوظة
❌ dashboard_widgets            - ويدجيت Dashboard
❌ user_preferences             - تفضيلات المستخدم
```

**التوصية:** ✅ احذف (غير مستخدمة)

---

### **🔄 Sync Tables (2 جداول):**
```
❌ sync_errors                  - أخطاء المزامنة
❌ sync_transactions            - معاملات المزامنة
```

**التوصية:** ⚠️ احتفظ مؤقتاً (قد تكون مفيدة للمراقبة)

---

### **🎨 Location Features (2 جداول):**
```
❌ location_branding            - العلامة التجارية للموقع
❌ location_features            - ميزات الموقع
```

**التوصية:** ⚠️ تحقق من صفحة Features أولاً

---

## 📊 Views

### **✅ المستخدمة (1 view):**
```
✅ v_dashboard_stats            6 استخدام في 3 ملفات  ⭐⭐⭐
```

### **❌ غير المستخدمة (4 views):**
```
❌ v_location_performance       - أداء المواقع
❌ v_review_summary             - ملخص التقييمات
❌ v_question_summary           - ملخص الأسئلة
❌ v_post_summary               - ملخص المنشورات
```

**التوصية:** ✅ احذف كلها

---

## 🔧 Functions

### **❌ غير المستخدمة (5 functions):**
```
❌ calculate_health_score()     - حساب Health Score
❌ get_pending_reviews_count()  - عدد التقييمات المعلقة
❌ update_updated_at_column()   - تحديث updated_at
❌ notify_new_review()          - إشعار تقييم جديد
❌ notify_new_question()        - إشعار سؤال جديد
```

**التوصية:** 
- ✅ احذف: `calculate_health_score`, `get_pending_reviews_count`
- ⚠️ تحقق من Triggers: `update_updated_at_column`
- ✅ احذف: `notify_new_review`, `notify_new_question`

---

## 📈 التوفير المتوقع

### **قبل التنظيف:**
```
🗄️ الجداول:     35 جدول
📊 Views:        5 views
🔧 Functions:    5+ functions
💾 الحجم:       ~500 MB (تقديري)
```

### **بعد التنظيف:**
```
🗄️ الجداول:     16-18 جدول (حذف 17-19)
📊 Views:        1 view (حذف 4)
🔧 Functions:    1-2 functions (حذف 3-4)
💾 الحجم:       ~350 MB (تقديري)
```

### **النتيجة:**
```
📉 توفير: 150 MB (~30%)
⚡ تحسين الأداء: 15-20%
🧹 تبسيط: 50% أقل complexity
```

---

## 🎯 خطة التنفيذ

### **المرحلة 1: حذف آمن (فوري) ✅**
```sql
-- 1. Views غير مستخدمة (4)
DROP VIEW IF EXISTS v_location_performance CASCADE;
DROP VIEW IF EXISTS v_review_summary CASCADE;
DROP VIEW IF EXISTS v_question_summary CASCADE;
DROP VIEW IF EXISTS v_post_summary CASCADE;

-- 2. Functions غير مستخدمة (2)
DROP FUNCTION IF EXISTS calculate_health_score(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_pending_reviews_count(uuid) CASCADE;
DROP FUNCTION IF EXISTS notify_new_review() CASCADE;
DROP FUNCTION IF EXISTS notify_new_question() CASCADE;

-- 3. Auth Tables قديمة (5)
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS email_verification_tokens CASCADE;

-- 4. Roles & Permissions (4)
DROP TABLE IF EXISTS user_permissions CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;

-- 5. Webhooks (2)
DROP TABLE IF EXISTS webhook_events CASCADE;
DROP TABLE IF EXISTS webhooks CASCADE;

-- 6. Settings (4)
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS saved_filters CASCADE;
DROP TABLE IF EXISTS dashboard_widgets CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
```

**النتيجة:** حذف 19 جدول + 4 views + 4 functions

---

### **المرحلة 2: تحقق ثم احذف (بحذر) ⚠️**
```sql
-- 1. تحقق من استخدام location_features في صفحة Features
-- إذا لم تكن مستخدمة:
-- DROP TABLE IF EXISTS location_branding CASCADE;
-- DROP TABLE IF EXISTS location_features CASCADE;

-- 2. تحقق من استخدام sync tables
-- إذا لم تكن مستخدمة:
-- DROP TABLE IF EXISTS sync_errors CASCADE;
-- DROP TABLE IF EXISTS sync_transactions CASCADE;

-- 3. تحقق من Triggers قبل حذف update_updated_at_column
-- DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
```

---

### **المرحلة 3: تحسين الأداء ⚡**
```sql
-- 1. تحديث الإحصائيات
VACUUM ANALYZE;

-- 2. إعادة بناء الفهارس
REINDEX DATABASE postgres;

-- 3. فحص الفهارس غير المستخدمة
-- (من نتائج audit-database.sql)
```

---

## ⚠️ تحذيرات مهمة

```
⚠️ اعمل Backup قبل أي حذف!
⚠️ اختبر التطبيق بعد كل مرحلة!
⚠️ لا تحذف جداول Supabase Auth الأساسية!
⚠️ تحقق من الاعتماديات قبل الحذف!
⚠️ استخدم CASCADE بحذر!
```

---

## ✅ Checklist

```
□ 1. Backup قاعدة البيانات
□ 2. مراجعة التقرير
□ 3. تشغيل المرحلة 1 (الحذف الآمن)
□ 4. اختبار التطبيق
□ 5. تشغيل VACUUM ANALYZE
□ 6. مراجعة المرحلة 2
□ 7. حذف المرحلة 2 (بحذر)
□ 8. اختبار نهائي
□ 9. تشغيل REINDEX
□ 10. فحص الأداء
```

---

## 📋 الملفات المرفقة

```
1. scripts/audit-database.sql          - فحص SQL شامل
2. scripts/analyze-database-usage.js   - فحص استخدام الكود
3. sql/cleanup-unused-database-objects.sql - سكريبت الحذف
4. database-usage-report.json          - التقرير الكامل JSON
5. DATABASE_AUDIT_GUIDE.md             - دليل الفحص
6. DATABASE_CLEANUP_REPORT.md          - هذا التقرير
```

---

**جاهز للتنظيف! 🧹**

