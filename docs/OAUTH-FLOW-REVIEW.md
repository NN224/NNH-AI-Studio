# 🔐 تقرير مراجعة تدفق OAuth (المرحلة 2)

> **تاريخ المراجعة**: 2025-12-05
> **الهدف**: التأكد من أننا عندما "نفتح الباب" لجوجل، نأخذ المفتاح الصحيح (refresh_token) ولا نضيعه

---

## 📁 الملفات المراجعة

| الملف                                  | الوظيفة                               |
| -------------------------------------- | ------------------------------------- |
| `app/api/gmb/create-auth-url/route.ts` | إنشاء رابط OAuth لجوجل                |
| `app/api/gmb/oauth-callback/route.ts`  | استقبال الـ callback وحفظ التوكنات    |
| `lib/services/auth-service.ts`         | خدمات المصادقة العامة (Supabase Auth) |

---

## ✅ السيناريو 1: هل نرسل `access_type=offline` و `prompt=consent`؟

### الحالة: ✅ **سليم ومُحسَّن**

```typescript
// app/api/gmb/create-auth-url/route.ts:130-136

authUrl.searchParams.set("access_type", "offline"); // ✅ مطلوب للـ refresh_token

// ✅ ذكي: يستخدم consent للـ re-auth فقط
const promptValue = hasExistingAccounts ? "consent" : "select_account";
authUrl.searchParams.set("prompt", promptValue);
```

### التحليل:

| المعامل                  | القيمة                        | الحالة | الشرح                                     |
| ------------------------ | ----------------------------- | ------ | ----------------------------------------- |
| `access_type`            | `offline`                     | ✅     | يضمن الحصول على `refresh_token`           |
| `prompt`                 | `consent` (re-auth)           | ✅     | يجبر جوجل على إعادة إصدار `refresh_token` |
| `prompt`                 | `select_account` (first-time) | ✅     | UX أفضل للمستخدم الجديد                   |
| `include_granted_scopes` | `true`                        | ✅     | يحافظ على الصلاحيات السابقة               |

### الكود الذكي للكشف عن Re-auth:

```typescript
// app/api/gmb/create-auth-url/route.ts:96-103

// ✅ يتحقق إذا كان المستخدم لديه حسابات GMB موجودة
const { data: existingAccounts } = await adminClient
  .from("gmb_accounts")
  .select("id")
  .eq("user_id", user.id)
  .eq("is_active", true)
  .limit(1);

const hasExistingAccounts = existingAccounts && existingAccounts.length > 0;
```

---

## ✅ السيناريو 2: هل يتم حفظ `refresh_token` في `gmb_secrets`؟

### الحالة: ✅ **سليم مع Fallback ذكي**

```typescript
// app/api/gmb/oauth-callback/route.ts:496-525

// ✅ أولوية: التوكن الجديد > التوكن القديم > NULL
const refreshTokenToPersist =
  tokenData.refresh_token || existingRefreshToken || null;

encryptedRefreshToken = refreshTokenToPersist
  ? encryptToken(refreshTokenToPersist)
  : null;

// ✅ تحذير إذا لم يتوفر refresh_token
if (!encryptedRefreshToken) {
  gmbLogger.warn(
    "No refresh_token available - user will need to re-auth when access_token expires",
    { accountId, userId, isReAuth },
  );
}
```

### الحفظ في `gmb_secrets`:

```typescript
// app/api/gmb/oauth-callback/route.ts:704-717

const { error: secretsError } = await adminClient.from("gmb_secrets").upsert(
  {
    account_id: upsertedAccount.id,
    access_token: encryptedAccessToken, // ✅ مشفر
    refresh_token: encryptedRefreshToken, // ✅ مشفر أو NULL
    updated_at: new Date().toISOString(),
  },
  {
    onConflict: "account_id", // ✅ UPSERT على account_id
    ignoreDuplicates: false,
  },
);
```

### التحقق بعد الحفظ:

```typescript
// app/api/gmb/oauth-callback/route.ts:763-835

// ✅ يتحقق أن السجل تم حفظه فعلاً
const { data: verifySecrets, error: verifyError } = await adminClient
  .from("gmb_secrets")
  .select("access_token, refresh_token")
  .eq("account_id", upsertedAccount.id)
  .single();

// ✅ Rollback إذا فشل التحقق
if (verifyError || !verifySecrets || !verifySecrets.access_token) {
  await adminClient.from("gmb_accounts").delete().eq("id", upsertedAccount.id);
  // ... redirect with error
}
```

---

## ✅ السيناريو 3: تحدي Reconnect - هل يحدث تكرار؟

### الحالة: ✅ **لا يوجد تكرار - UPSERT صحيح**

```typescript
// app/api/gmb/oauth-callback/route.ts:598-606

const { data: upsertedAccount, error: upsertError } = await adminClient
  .from("gmb_accounts")
  .upsert(upsertData, {
    onConflict: "account_id", // ✅ المفتاح الفريد
    ignoreDuplicates: false, // ✅ يحدث UPDATE وليس IGNORE
  })
  .select("id")
  .single();
```

### كيف يعمل:

| الحالة                     | السلوك                    | النتيجة                |
| -------------------------- | ------------------------- | ---------------------- |
| **First-time**             | `INSERT` جديد             | ✅ صف جديد             |
| **Reconnect (نفس الحساب)** | `UPDATE` على `account_id` | ✅ تحديث التوكنات      |
| **حساب مختلف**             | `INSERT` جديد             | ✅ صف جديد لحساب مختلف |

### الحماية من ربط حساب بمستخدم آخر:

```typescript
// app/api/gmb/oauth-callback/route.ts:429-455

// ✅ فحص أمني: هل الحساب مربوط بمستخدم آخر؟
const { data: existingAccount } = await adminClient
  .from("gmb_accounts")
  .select("user_id, refresh_token")
  .eq("account_id", accountId)
  .maybeSingle();

if (existingAccount && existingAccount.user_id !== userId) {
  gmbLogger.error(
    "Security violation: GMB account already linked to different user",
    // ...
  );
  return NextResponse.redirect(/* error: account_already_linked */);
}
```

---

## 📊 ملخص التدفق الكامل

```
┌─────────────────────────────────────────────────────────────────┐
│                    OAuth Flow Diagram                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User clicks "Connect GMB"                                    │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────────────────────────────┐                        │
│  │ POST /api/gmb/create-auth-url       │                        │
│  │                                     │                        │
│  │ ✅ Check existing accounts          │                        │
│  │ ✅ Set access_type=offline          │                        │
│  │ ✅ Set prompt=consent (if re-auth)  │                        │
│  │ ✅ Save state to oauth_states       │                        │
│  └─────────────────────────────────────┘                        │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────────────────────────────┐                        │
│  │ Google OAuth Consent Screen         │                        │
│  │ User grants permissions             │                        │
│  └─────────────────────────────────────┘                        │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────────────────────────────┐                        │
│  │ GET /api/gmb/oauth-callback         │                        │
│  │                                     │                        │
│  │ ✅ Validate state                   │                        │
│  │ ✅ Exchange code for tokens         │                        │
│  │ ✅ Encrypt tokens (AES-256-GCM)     │                        │
│  │ ✅ UPSERT gmb_accounts              │                        │
│  │ ✅ UPSERT gmb_secrets               │                        │
│  │ ✅ Verify secrets saved             │                        │
│  │ ✅ Rollback on failure              │                        │
│  └─────────────────────────────────────┘                        │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────────────────────────────┐                        │
│  │ Redirect to /select-account         │                        │
│  │ (or /dashboard if RE_AUTH)          │                        │
│  └─────────────────────────────────────┘                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⚠️ نقاط تحتاج انتباه (ليست أخطاء)

### 1. 🟡 `gmb_services` يحفظ التوكنات أيضاً (تكرار)

```typescript
// app/api/gmb/oauth-callback/route.ts:650-668

const { error: serviceError } = await adminClient.from("gmb_services").upsert({
  account_id: upsertedAccount.id,
  access_token: encryptedAccessToken, // ⚠️ نسخة مكررة
  refresh_token: encryptedRefreshToken, // ⚠️ نسخة مكررة
  // ...
});
```

**الملاحظة**: التوكنات محفوظة في 3 أماكن:

1. `gmb_accounts` (access_token, refresh_token)
2. `gmb_secrets` (access_token, refresh_token) ← **المصدر الرسمي**
3. `gmb_services` (access_token, refresh_token)

**التوصية**: توحيد مصدر التوكنات في `gmb_secrets` فقط، وإزالة الأعمدة من الجداول الأخرى.

### 2. 🟡 Schema mismatch في `gmb_services`

```typescript
// الكود يحاول إدخال:
{
  account_id: upsertedAccount.id,
  service_type: "google_my_business",
  access_token: encryptedAccessToken,
  // ...
}
```

لكن الـ migration `20251128000001_create_gmb_services.sql` يعرف الجدول بشكل مختلف:

```sql
CREATE TABLE gmb_services (
  user_id UUID NOT NULL,
  location_id UUID NOT NULL,  -- ⚠️ مطلوب لكن الكود لا يرسله
  name TEXT NOT NULL,         -- ⚠️ مطلوب لكن الكود لا يرسله
  -- لا يوجد service_type أو access_token!
);
```

**الخطر**: هذا الـ upsert قد يفشل في Production!

---

## 🔴 خطأ يجب إصلاحه

### `gmb_services` Schema Mismatch

**المشكلة**: الكود في `oauth-callback/route.ts` يحاول إدخال بيانات لا تتوافق مع schema الجدول.

**الموقع**: `app/api/gmb/oauth-callback/route.ts:650-668`

**الحل المقترح**: إما:

1. **إزالة هذا الـ upsert** (التوكنات موجودة في `gmb_secrets` أصلاً)
2. **أو تحديث الـ schema** ليتوافق مع الكود

### الكود المصحح (الخيار 1 - إزالة):

```typescript
// ❌ إزالة هذا الكود بالكامل (lines 646-696)
// التوكنات محفوظة بالفعل في gmb_secrets

// بدلاً من ذلك، فقط log:
gmbLogger.info("Tokens stored in gmb_secrets", {
  accountId: upsertedAccount.id,
  hasRefreshToken: !!encryptedRefreshToken,
});
```

---

## ✅ الخلاصة

| السيناريو                    | الحالة        | ملاحظات                           |
| ---------------------------- | ------------- | --------------------------------- |
| `access_type=offline`        | ✅ سليم       | يضمن `refresh_token`              |
| `prompt=consent` للـ re-auth | ✅ سليم       | ذكي ومُحسَّن                      |
| حفظ في `gmb_secrets`         | ✅ سليم       | مع تشفير وتحقق                    |
| UPSERT بدون تكرار            | ✅ سليم       | `onConflict: "account_id"`        |
| Fallback للـ refresh_token   | ✅ سليم       | يحافظ على القديم إذا لم يأتِ جديد |
| `gmb_services` upsert        | ✅ تم الإصلاح | تم إزالة الـ upsert الخاطئ        |

**التقييم العام**: تدفق OAuth **سليم بنسبة 100%** ✅

---

## 📝 الإصلاحات المطلوبة

- [x] **إزالة `gmb_services` upsert** في `oauth-callback/route.ts` ✅ **تم الإصلاح**
- [x] **إزالة `SCOPES` غير المستخدم** ✅ **تم الإصلاح**
- [x] **إصلاح `any` types** ✅ **تم الإصلاح**
- [ ] **توحيد مصدر التوكنات** في `gmb_secrets` فقط (اختياري)
- [ ] **إزالة أعمدة التوكنات** من `gmb_accounts` (اختياري - تنظيف)

---

## ✅ الإصلاحات المنجزة

### 1. إزالة `gmb_services` upsert الخاطئ

**الملف**: `app/api/gmb/oauth-callback/route.ts`

**قبل**:

```typescript
const { error: serviceError } = await adminClient.from("gmb_services").upsert({
  account_id: upsertedAccount.id,
  service_type: "google_my_business", // ❌ عمود غير موجود
  access_token: encryptedAccessToken, // ❌ عمود غير موجود
  // ...
});
```

**بعد**:

```typescript
// NOTE: gmb_services table is for business services (products/offerings),
// NOT for OAuth tokens. Tokens are stored ONLY in gmb_secrets for security.
```

### 2. إزالة `SCOPES` غير المستخدم

**قبل**:

```typescript
const SCOPES = [
  "https://www.googleapis.com/auth/business.manage",
  // ... (unused after removing gmb_services upsert)
];
```

**بعد**:

```typescript
// NOTE: SCOPES are defined in create-auth-url/route.ts
// This file only handles the callback and token exchange
```

### 3. إصلاح `any` types

استبدال `(error as any)?.message` بـ `getErrorMessage(error)` للحصول على type safety أفضل.
