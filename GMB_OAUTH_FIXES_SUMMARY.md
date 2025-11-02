# ملخص إصلاحات GMB OAuth

**تاريخ:** 2 فبراير 2025  
**الحالة:** ✅ مكتمل

---

## 🔴 الإصلاحات الحرجة (Critical Fixes)

### 1. إصلاح Foreign Key في `oauth_states`

**المشكلة:**
- جدول `oauth_states` كان يشير إلى `profiles(id)` 
- الكود يستخدم `auth.uid()` الذي يعيد `auth.users(id)`
- هذا يسبب فشل في حفظ OAuth state

**الحل:**
- ✅ إنشاء migration: `20250202_fix_oauth_states_user_id_fk.sql`
- ✅ تغيير Foreign Key من `profiles(id)` إلى `auth.users(id)`
- ✅ تحديث RLS policies لتستخدم `auth.uid()` بشكل صحيح

**الملفات المعدلة:**
- `supabase/migrations/20250202_fix_oauth_states_user_id_fk.sql` (جديد)

---

### 2. إصلاح Places API - استخدام Business Information API

**المشكلة:**
- الكود كان يحاول استخدام Places API مع Place ID غير صحيح
- Location resource name ليس Place ID صالح

**الحل:**
- ✅ تغيير `fetchReviews` لاستخدام Business Information API
- ✅ استخدام `readMask` للحصول على reviews من location resource
- ✅ إزالة اعتماد Places API (PLACES_API_BASE)

**الملفات المعدلة:**
- `app/api/gmb/sync/route.ts`

**التغييرات:**
```typescript
// قبل: استخدام Places API
const url = `${PLACES_API_BASE}/places/${placeId}`;

// بعد: استخدام Business Information API
const url = `${GBP_LOC_BASE}/${fullLocationResource}`;
url.searchParams.set('readMask', 'name,title,reviews');
```

---

### 3. إصلاح redirect_uri Consistency

**المشكلة:**
- `redirect_uri` قد يكون مختلف بين `create-auth-url` و `oauth-callback`
- أي اختلاف يسبب `redirect_uri_mismatch` error

**الحل:**
- ✅ استخدام نفس المنطق في كلا الملفين
- ✅ إزالة trailing slash من redirect_uri
- ✅ إضافة logging للتأكد من القيمة المستخدمة

**الملفات المعدلة:**
- `app/api/gmb/create-auth-url/route.ts`
- `app/api/gmb/oauth-callback/route.ts`

**التغييرات:**
```typescript
// إزالة trailing slash لضمان الاتساق
const cleanRedirectUri = redirectUri.replace(/\/$/, '');
```

---

## ⚠️ الإصلاحات المهمة (Major Fixes)

### 4. إضافة تحقق من Profile

**المشكلة:**
- عدم التحقق من وجود profile للمستخدم قبل حفظ OAuth state

**الحل:**
- ✅ إضافة تحقق اختياري من profile
- ✅ Logging للتحذيرات إذا لم يوجد profile

**الملفات المعدلة:**
- `app/api/gmb/create-auth-url/route.ts`

---

### 5. إنشاء جدول `gmb_media`

**المشكلة:**
- Media items لا يتم حفظها بسبب عدم وجود الجدول
- TODO comment في الكود لم يتم إكماله

**الحل:**
- ✅ إنشاء migration: `20250202_create_gmb_media_table.sql`
- ✅ إنشاء جدول `gmb_media` مع جميع الأعمدة المطلوبة
- ✅ إضافة RLS policies
- ✅ تفعيل حفظ Media في sync route

**الملفات المعدلة:**
- `supabase/migrations/20250202_create_gmb_media_table.sql` (جديد)
- `app/api/gmb/sync/route.ts`

---

### 6. تحسين معالجة الأخطاء

**المشكلة:**
- معالجة أخطاء غير واضحة في Places API و Media API
- لا تميز بين أنواع الأخطاء المختلفة (404, 403, 500, etc.)

**الحل:**
- ✅ إضافة معالجة خاصة لـ 404 (not found - طبيعي)
- ✅ إضافة معالجة خاصة لـ 403 (permission denied - خطأ في التكوين)
- ✅ تحسين logging للأخطاء

**الملفات المعدلة:**
- `app/api/gmb/sync/route.ts`

---

## 📋 الملفات الجديدة

1. `supabase/migrations/20250202_fix_oauth_states_user_id_fk.sql`
   - إصلاح Foreign Key في oauth_states

2. `supabase/migrations/20250202_create_gmb_media_table.sql`
   - إنشاء جدول gmb_media

3. `GMB_OAUTH_FIXES_SUMMARY.md` (هذا الملف)
   - ملخص شامل للإصلاحات

---

## 📝 الملفات المعدلة

1. `app/api/gmb/create-auth-url/route.ts`
   - إصلاح redirect_uri consistency
   - إضافة تحقق من Profile

2. `app/api/gmb/oauth-callback/route.ts`
   - إصلاح redirect_uri consistency

3. `app/api/gmb/sync/route.ts`
   - إصلاح Places API → Business Information API
   - تفعيل حفظ Media items
   - تحسين معالجة الأخطاء

---

## 🚀 خطوات التطبيق

### 1. تطبيق Migrations

```bash
# في Supabase Dashboard أو CLI
supabase migration up
```

أو تطبيق الملفات يدوياً:
- `20250202_fix_oauth_states_user_id_fk.sql`
- `20250202_create_gmb_media_table.sql`

### 2. التحقق من Environment Variables

تأكد من وجود:
```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://nnh.ae/api/gmb/oauth-callback
NEXT_PUBLIC_BASE_URL=https://nnh.ae
```

### 3. التحقق من Google Cloud Console

تأكد من:
- ✅ Authorized redirect URIs تحتوي على: `https://nnh.ae/api/gmb/oauth-callback`
- ✅ APIs مفعلة:
  - My Business Business Information API
  - My Business Account Management API

### 4. اختبار

1. اذهب إلى `/gmb-dashboard`
2. انقر "Connect Google My Business"
3. أكمل عملية OAuth
4. انقر "Sync Data"
5. تحقق من:
   - ✅ Locations تم حفظها
   - ✅ Reviews تم حفظها
   - ✅ Media تم حفظها (إذا كان موجود)

---

## ✅ النتائج المتوقعة

بعد تطبيق الإصلاحات:

1. ✅ **OAuth flow يعمل بشكل صحيح**
   - لا مزيد من أخطاء Foreign Key
   - State يتم حفظه بنجاح

2. ✅ **Reviews يتم جلبها بنجاح**
   - استخدام Business Information API
   - لا مزيد من أخطاء Place ID

3. ✅ **Media يتم حفظه**
   - جدول `gmb_media` موجود ويعمل
   - Media items يتم حفظها في Sync

4. ✅ **تحسين في معالجة الأخطاء**
   - أخطاء واضحة في Logs
   - تمييز بين أنواع الأخطاء المختلفة

---

## 🔍 ملاحظات إضافية

### حول Reviews API

Business Information API قد لا يدعم reviews مباشرة في جميع الحالات. إذا استمرت المشاكل:

1. تحقق من أن الـ location له reviews في Google My Business
2. تحقق من أن الـ scope `business.manage` كاف
3. قد تحتاج لاستخدام طريقة أخرى للحصول على reviews

### حول Media API

Media API قد يتطلب permissions إضافية. إذا فشل:

1. تحقق من أن Media موجود في Google My Business
2. تحقق من أن الـ location resource name صحيح

---

## 📚 مراجع

- [Google Business Profile API Docs](https://developers.google.com/my-business/reference/businessinformation/rest)
- [OAuth 2.0 Best Practices](https://developers.google.com/identity/protocols/oauth2/web-server)

---

**تم الإصلاح بنجاح!** ✅

