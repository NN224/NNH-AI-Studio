# 🚀 تعليمات تطبيق Migration

## ⚠️ المشكلة

قاعدة البيانات الإنتاجية لديها migration history مختلف عن الملفات المحلية.

---

## ✅ الحل: تطبيق SQL يدوياً

### **الخطوة 1: افتح Supabase Dashboard**

```
1. اذهب إلى: https://supabase.com/dashboard
2. اختر مشروعك
3. من القائمة الجانبية، اضغط على: SQL Editor
```

---

### **الخطوة 2: افتح ملف SQL**

```
افتح الملف:
APPLY_THIS_SQL.sql
```

في مجلد المشروع:
```
/Users/nabel/Documents/GitHub/NNH-AI-Studio/APPLY_THIS_SQL.sql
```

---

### **الخطوة 3: انسخ والصق**

```
1. انسخ محتويات الملف بالكامل (Cmd+A, Cmd+C)
2. الصقه في SQL Editor في Supabase Dashboard
3. اضغط "Run" أو Cmd+Enter
```

---

### **الخطوة 4: تحقق من النجاح**

يجب أن ترى رسالة:

```
✅ Success. No rows returned
```

أو

```
✅ Completed successfully
```

---

## 🔍 التحقق من التطبيق

### **تحقق من الأعمدة الجديدة:**

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notifications'
AND column_name IN (
  'notification_type',
  'location_id',
  'location_name',
  'review_name',
  'question_name',
  'answer_name',
  'media_name',
  'raw_data'
);
```

يجب أن ترى 8 أعمدة جديدة.

---

### **تحقق من الـ Indexes:**

```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'notifications'
AND indexname LIKE 'idx_notifications_%';
```

يجب أن ترى 4 indexes جديدة.

---

### **تحقق من الـ Functions:**

```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN (
  'cleanup_old_notifications',
  'get_unread_notifications_by_type'
);
```

يجب أن ترى 2 functions.

---

## 🎯 بعد التطبيق

### **1. أعد تشغيل التطبيق:**

```bash
cd /Users/nabel/Documents/GitHub/NNH-AI-Studio
npm run dev
```

---

### **2. اذهب إلى Settings:**

```
Dashboard → Settings → Notifications
```

---

### **3. كوّن GMB Notifications:**

في قسم **"إشعارات نشاطي التجاري في الوقت الفعلي"**:

1. أدخل Topic name:
   ```
   projects/nnh-marketing-475218/topics/gmb-notifications
   ```

2. اختر أنواع الإشعارات

3. اضغط **"Save Notification Settings"**

---

### **4. اختبر النظام:**

**اختبار يدوي:**
```
Google Cloud Console → Pub/Sub → Topics → gmb-notifications → Publish Message
```

**اختبار حقيقي:**
```
اطلب من شخص ترك تقييم على نشاطك التجاري
```

---

## ❓ إذا واجهت مشاكل

### **خطأ: relation "notifications" does not exist**

الجدول غير موجود. تحقق من أن المشروع صحيح.

---

### **خطأ: column already exists**

هذا طبيعي! الـ SQL يستخدم `IF NOT EXISTS` لتجنب الأخطاء.

---

### **خطأ: permission denied**

تأكد من أنك مسجل دخول كـ Owner أو Admin.

---

## ✅ Checklist

- [ ] فتحت Supabase Dashboard
- [ ] فتحت SQL Editor
- [ ] نسخت محتويات `APPLY_THIS_SQL.sql`
- [ ] لصقت في SQL Editor
- [ ] ضغطت Run
- [ ] رأيت رسالة نجاح
- [ ] تحققت من الأعمدة الجديدة
- [ ] أعدت تشغيل التطبيق
- [ ] كوّنت GMB Notifications في Settings
- [ ] اختبرت النظام

---

## 🎉 النتيجة

بعد تطبيق الـ migration بنجاح:

- ✅ جدول `notifications` محدّث
- ✅ 8 أعمدة جديدة
- ✅ 4 indexes جديدة
- ✅ 2 functions جديدة
- ✅ RLS policies محدّثة
- ✅ View جديد للإحصائيات

**الحالة:** ✅ جاهز للاستخدام!

---

**التاريخ:** 16 نوفمبر 2025  
**الملف:** `APPLY_THIS_SQL.sql`

