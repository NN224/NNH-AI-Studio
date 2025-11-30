# 🟠 HIGH PRIORITY: Request Timeout مفقود

> **الأولوية:** P1 - عالي
> **الوقت المقدر:** 3 ساعات
> **المجال:** استقرار

---

## 📋 ملخص المشكلة

**Issue ID:** HIGH-017
**Severity:** 🟠 HIGH - STABILITY
**Impact:** Requests قد تعلق للأبد

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

- [ ] جميع external API calls تستخدم timeout
- [ ] Default timeout = 30 seconds
- [ ] Retry logic للـ transient failures
- [ ] Proper error handling للـ timeouts

---

**Status:** 🔴 NOT STARTED
