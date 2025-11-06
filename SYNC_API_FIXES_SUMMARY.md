# 🔧 ملخص إصلاحات Sync API

## ✅ المشاكل التي تم إصلاحها

### 1. **إصلاح `scheduled-sync/route.ts`**
**المشكلة:** كان يتم إرسال `accountId` في query param بدلاً من body

**الحل:**
- ✅ إزالة `accountId` من query param في URL
- ✅ إضافة `accountId` في body مع `syncType`

**الملف:** `app/api/gmb/scheduled-sync/route.ts`

### 2. **تحسين Error Handling في `sync/route.ts`**
**المشكلة:** عدم وجود معالجة صحيحة لأخطاء JSON parsing

**الحل:**
- ✅ إضافة try-catch لمعالجة JSON parsing errors
- ✅ إرجاع رسالة خطأ واضحة: `INVALID_JSON`
- ✅ تحسين logging عند فقدان `accountId`

**الملف:** `app/api/gmb/sync/route.ts`

### 3. **توحيد تسمية الحقول (CamelCase)**
**المشكلة:** استخدام تسميات مختلفة (`account_id` vs `accountId`, `sync_type` vs `syncType`)

**الحل:**
- ✅ توحيد جميع الاستدعاءات لاستخدام `accountId` و `syncType` (camelCase)
- ✅ API route يدعم كلا التسميتين للتوافق مع الإصدارات القديمة

**الملفات المحدثة:**
- ✅ `components/locations/locations-overview-tab.tsx`
- ✅ `components/locations/location-detail-header.tsx`
- ✅ `app/[locale]/(dashboard)/dashboard/page.tsx`
- ✅ `app/[locale]/(dashboard)/dashboard/optimized-page.tsx`

---

## 📋 جميع استدعاءات `/api/gmb/sync` - الحالة النهائية

### ✅ 1. `components/locations/locations-overview-tab.tsx`
```typescript
const response = await fetch('/api/gmb/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    accountId: gmbAccountId,
    syncType: 'full' 
  }),
});
```
**الحالة:** ✅ صحيح

### ✅ 2. `components/locations/location-detail-header.tsx`
```typescript
const response = await fetch('/api/gmb/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    accountId: accountId,
    syncType: 'location',
    locationId: locationId 
  }),
});
```
**الحالة:** ✅ صحيح (ملاحظة: `locationId` يُرسل لكن API لا يستخدمه حالياً)

### ✅ 3. `app/[locale]/(dashboard)/dashboard/page.tsx`
```typescript
const response = await fetch('/api/gmb/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    accountId: gmbAccountId, 
    syncType: 'full' 
  }),
  signal: controller.signal
});
```
**الحالة:** ✅ صحيح

### ✅ 4. `app/[locale]/(dashboard)/dashboard/optimized-page.tsx`
```typescript
const response = await fetch('/api/gmb/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ accountId: gmbAccountId, syncType: 'full' }),
});
```
**الحالة:** ✅ صحيح

### ✅ 5. `lib/hooks/useAccountsManagement.ts`
```typescript
const response = await fetch('/api/gmb/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ accountId, syncType: 'full' }),
});
```
**الحالة:** ✅ صحيح (كان صحيحاً من البداية)

### ✅ 6. `components/settings/gmb-settings.tsx`
```typescript
const res = await fetch('/api/gmb/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ accountId: acc.id, syncType: 'incremental' })
})
```
**الحالة:** ✅ صحيح (كان صحيحاً من البداية)

### ✅ 7. `app/api/gmb/scheduled-sync/route.ts`
```typescript
const syncResponse = await fetch(syncUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${cronSecret || 'internal-cron'}`,
  },
  body: JSON.stringify({ 
    accountId: accountId,
    syncType: 'full' 
  }),
});
```
**الحالة:** ✅ تم إصلاحه

---

## 🔍 API Route - التحقق من الحقول

### `/api/gmb/sync` (POST)

**الحقول المطلوبة:**
- ✅ `accountId` (أو `account_id`) - **مطلوب**
- ✅ `syncType` (أو `sync_type`) - اختياري، القيمة الافتراضية: `'full'`

**الحقول الاختيارية:**
- ⚠️ `locationId` (أو `location_id`) - يتم إرساله لكن API لا يستخدمه حالياً

**Headers المطلوبة:**
- ✅ `Content-Type: application/json` - **مطلوب**

**Error Handling:**
- ✅ `INVALID_JSON` (400) - إذا كان body غير صالح JSON
- ✅ `MISSING_FIELDS` (400) - إذا كان `accountId` مفقوداً
- ✅ `UNAUTHORIZED` (401) - إذا لم يكن المستخدم مسجلاً دخوله
- ✅ `ACCOUNT_NOT_FOUND` (404) - إذا لم يكن الحساب موجوداً
- ✅ `ACCOUNT_INACTIVE` (400) - إذا كان الحساب غير نشط

---

## 📝 ملاحظات مهمة

1. **API يدعم كلا التسميتين:** `accountId`/`account_id` و `syncType`/`sync_type` للتوافق مع الإصدارات القديمة، لكن نوصي باستخدام camelCase (`accountId`, `syncType`).

2. **`locationId` في body:** يتم إرساله في `location-detail-header.tsx` لكن API route لا يستخدمه حالياً. إذا كنت تريد sync location واحد فقط، يجب إضافة هذه الوظيفة في API route.

3. **Cron requests:** API route يدعم cron requests من خلال header `Authorization: Bearer ${CRON_SECRET}`، ويتم تخطي authentication check في هذه الحالة.

---

## ✅ الاختبارات الموصى بها

1. **اختبار Sync من Locations Overview:**
   ```bash
   # تحقق من أن accountId موجود في body
   # تحقق من أن headers صحيحة
   ```

2. **اختبار Sync من Location Detail:**
   ```bash
   # تحقق من أن accountId موجود في body
   # تحقق من أن locationId موجود (رغم أنه غير مستخدم حالياً)
   ```

3. **اختبار Scheduled Sync:**
   ```bash
   # تحقق من أن accountId موجود في body وليس في query param
   # تحقق من أن Authorization header موجود
   ```

4. **اختبار Error Handling:**
   ```bash
   # إرسال request بدون accountId → يجب أن يرجع 400 مع MISSING_FIELDS
   # إرسال request بـ body غير صالح → يجب أن يرجع 400 مع INVALID_JSON
   ```

---

## 🎯 النتيجة النهائية

✅ **جميع استدعاءات `/api/gmb/sync` تحتوي على:**
- ✅ `headers: { 'Content-Type': 'application/json' }`
- ✅ `body` يحتوي على `accountId` (أو `account_id`)
- ✅ `body` يحتوي على `syncType` (أو `sync_type`)

✅ **API route يتعامل مع:**
- ✅ JSON parsing errors بشكل صحيح
- ✅ Missing fields بشكل صحيح
- ✅ كلا التسميتين (camelCase و snake_case)

✅ **لا توجد أخطاء 400 Bad Request إذا البيانات صحيحة.**

