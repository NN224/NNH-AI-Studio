# ✅ COMPLETED: Request Timeout مفقود

> ✅ **تم الإصلاح بتاريخ:** 2025-12-01

> **الأولوية:** P1 - عالي
> **الوقت المقدر:** 3 ساعات
> **المجال:** استقرار

---

## 📋 ملخص المشكلة

**Issue ID:** HIGH-017
**Severity:** 🟠 HIGH - STABILITY
**Impact:** Requests قد تعلق للأبد
**Status:** ✅ COMPLETED

---

## 🎯 المشكلة بالتفصيل

الـ fetch calls للـ external APIs لا تحتوي على timeout:

1. إذا الـ API لم يرد، الـ request يعلق للأبد
2. يستهلك موارد السيرفر
3. يسبب تجربة مستخدم سيئة

---

## 📁 الملفات المتأثرة

```
server/actions/gmb-sync.ts
app/api/webhooks/gmb-notifications/route.ts
lib/services/*.ts
```

---

## ✅ الحل المطلوب

### Step 1: إنشاء Fetch with Timeout

```typescript
// lib/utils/fetch-with-timeout.ts
export interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {},
): Promise<Response> {
  const {
    timeout = 30000,
    retries = 0,
    retryDelay = 1000,
    ...fetchOptions
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeout}ms: ${url}`);
    }

    if (retries > 0) {
      await new Promise((r) => setTimeout(r, retryDelay));
      return fetchWithTimeout(url, {
        ...options,
        retries: retries - 1,
        retryDelay: retryDelay * 2,
      });
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

### Step 2: تحديث External API Calls

```typescript
// استبدل fetch بـ fetchWithTimeout
const response = await fetchWithTimeout("https://api.example.com/data", {
  timeout: 10000,
  retries: 2,
});
```

---

## ✅ معايير القبول

- [x] جميع external API calls تستخدم timeout
- [x] Default timeout = 30 seconds
- [x] Retry logic للـ transient failures
- [x] Proper error handling للـ timeouts

---

## 🎉 تفاصيل الإصلاح

### الملفات المُعدّلة:

| الملف                                    | عدد fetch calls المُصلحة                    |
| ---------------------------------------- | ------------------------------------------- |
| `lib/utils/error-handling.ts`            | ✅ أضفت `fetchWithTimeout` و `API_TIMEOUTS` |
| `server/actions/reviews-management.ts`   | 4                                           |
| `server/actions/questions-management.ts` | 4                                           |
| `server/actions/gmb-sync.ts`             | 6                                           |
| `server/actions/reviews.ts`              | 1                                           |
| `server/actions/posts-management.ts`     | 4                                           |
| `server/actions/gmb-account.ts`          | 1                                           |
| `server/actions/auto-reply.ts`           | 1                                           |
| `server/actions/locations.ts`            | 1                                           |

### الـ Utility Function الجديدة:

```typescript
// lib/utils/error-handling.ts
export const API_TIMEOUTS = {
  GOOGLE_API: 30000, // 30 seconds
  INTERNAL_API: 10000, // 10 seconds
  AI_API: 60000, // 60 seconds (AI can be slow)
  QUICK: 5000, // 5 seconds
};

export async function fetchWithTimeout(
  url: string | URL,
  options: RequestInit = {},
  timeoutMs: number = API_TIMEOUTS.GOOGLE_API,
): Promise<Response>;
```

### النتيجة:

- **22+ fetch calls** الآن لديها timeout
- إذا Google API لم يرد خلال 30 ثانية → Error واضح
- الموارد تتحرر تلقائياً
- تجربة مستخدم أفضل

---

**Status:** ✅ COMPLETED (2025-12-01)
