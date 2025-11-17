# 🚨 **PRODUCTION EMERGENCY FIX**

**التاريخ:** 2025-11-17 05:00 AM  
**الحالة:** 🔴 CRITICAL - Production Errors

---

## 🔴 **المشاكل الحرجة:**

### **1. /settings → 500 Error**
```
ReferenceError: GMBNotificationsSetup is not defined
```

**الحل المطبق:**
```
✅ تعطيل GMBNotificationsSetup مؤقتاً
✅ Committed & Pushed
⏳ انتظار Vercel Deploy
```

### **2. Account not found (في Production)**
```
[Reviews] Sync error: Error: Account not found
[Media API] Google fetch error: Account not found
locationId: '8a606c17-5706-4d89-ac5a-8fd651b24c33'
```

**السبب:**
- ✅ الـ SQL fix طُبق على **Local/Staging DB**
- ❌ لكن **Production DB** لسه ما تطبق عليه!

**الحل المطلوب:**
```sql
-- نفذ في Production Supabase Dashboard:
-- FIX_ACCOUNT_NOT_FOUND.sql
```

### **3. Missing column: reply_to_positive**
```
column auto_reply_settings.reply_to_positive does not exist
```

**الحل المطلوب:**
```sql
-- نفذ في Production Supabase Dashboard:
-- FIX_MISSING_TABLES.sql (النسخة المحدثة)
```

---

## 🔧 **الإصلاحات المطلوبة على Production DB:**

### **1. إصلاح Account Issue:**

```sql
-- FIX_ACCOUNT_NOT_FOUND.sql
-- Query 6: إصلاح Orphaned Locations
WITH first_active_account AS (
  SELECT id 
  FROM gmb_accounts 
  WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d' 
  AND is_active = true 
  ORDER BY created_at DESC 
  LIMIT 1
)
UPDATE gmb_locations
SET gmb_account_id = (SELECT id FROM first_active_account)
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d'
AND (
  gmb_account_id IS NULL 
  OR gmb_account_id NOT IN (SELECT id FROM gmb_accounts)
)
RETURNING id, location_name, gmb_account_id;
```

### **2. إصلاح auto_reply_settings table:**

```sql
-- إضافة الـ columns الناقصة
ALTER TABLE public.auto_reply_settings 
ADD COLUMN IF NOT EXISTS reply_to_positive BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS reply_to_neutral BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reply_to_negative BOOLEAN DEFAULT true;
```

### **3. تطبيق Migrations:**

```sql
-- A. Fix replied_reviews count
-- من: supabase/migrations/20251116_fix_replied_reviews_count.sql

-- B. Add logo_url & category
-- من: supabase/migrations/20251116_add_logo_and_category.sql
```

---

## 📋 **الخطوات العاجلة:**

```
1. ✅ تعطيل GMBNotificationsSetup (Done)
2. ⏳ انتظار Vercel Deploy
3. 🔴 نفذ SQL fixes على Production DB:
   - FIX_ACCOUNT_NOT_FOUND.sql
   - ALTER TABLE auto_reply_settings (أعلاه)
   - Migrations
4. ✅ تحقق من الأخطاء اختفت
5. 🔄 جرب Sync جديد
```

---

## 🎯 **النتيجة المتوقعة:**

### **بعد Deploy:**
```
✅ /settings → 200 OK
✅ Account found
✅ auto_reply_settings columns موجودة
✅ Sync يشتغل
```

---

## ⚠️ **ملاحظة مهمة:**

**الفرق بين Local و Production:**

| Item | Local/Staging | Production |
|------|--------------|------------|
| Account Fix | ✅ Done | ❌ Not Applied |
| auto_reply_settings | ⚠️ Partial | ❌ Missing Columns |
| Migrations | ⏳ Pending | ❌ Not Applied |
| GMBNotificationsSetup | ✅ Disabled | ⏳ Deploying |

---

## 🚀 **الخطوة التالية:**

```
1. انتظر Vercel Deploy ينتهي
2. نفذ SQL fixes على Production DB
3. تحقق من الأخطاء
4. أرسل تحديث
```

---

**URGENT: نفذ SQL fixes على Production DB الآن! 🚨**

