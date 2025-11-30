# 🟠 HIGH PRIORITY: Promise.all بدون Error Handling

> ⚠️ **قبل البدء:** اقرأ `AI_AGENT_START_HERE.md` أولاً! اقرأ الملف المستهدف كاملاً قبل أي تعديل.

> **الأولوية:** P1 - عالي
> **الوقت المقدر:** 3 ساعات
> **المجال:** استقرار + UX

---

## 📋 ملخص المشكلة

**Issue ID:** HIGH-020
**Severity:** 🟠 HIGH - STABILITY
**Impact:** فقدان بيانات جزئية عند فشل أي promise

---

## 🎯 المشكلة بالتفصيل

استخدام `Promise.all` يفشل بالكامل إذا فشل أي promise واحد:

1. إذا فشل 1 من 5 requests، نفقد الـ 4 الناجحين
2. المستخدم لا يرى أي بيانات
3. يجب استخدام `Promise.allSettled` بدلاً

---

## 📁 الملفات المتأثرة

```
server/services/dashboard.service.ts (5 Promise.all)
components/dashboard/monitoring-dashboard.tsx (3 Promise.all)
components/home/achievement-system.tsx (3 Promise.all)
server/actions/gmb-account.ts (3 Promise.all)
```

---

## ✅ الحل المطلوب

### Step 1: إنشاء Safe Promise Utilities

```typescript
// lib/utils/safe-promise.ts

interface SettledResult<T> {
  status: "fulfilled" | "rejected";
  value?: T;
  reason?: Error;
}

/**
 * Executes promises in parallel and returns all results,
 * even if some fail.
 */
export async function safePromiseAll<T>(
  promises: Promise<T>[],
): Promise<{ results: T[]; errors: Error[] }> {
  const settled = await Promise.allSettled(promises);

  const results: T[] = [];
  const errors: Error[] = [];

  settled.forEach((result) => {
    if (result.status === "fulfilled") {
      results.push(result.value);
    } else {
      errors.push(
        result.reason instanceof Error
          ? result.reason
          : new Error(String(result.reason)),
      );
    }
  });

  return { results, errors };
}

/**
 * Executes named promises and returns results by name.
 */
export async function safePromiseAllNamed<
  T extends Record<string, Promise<unknown>>,
>(
  promises: T,
): Promise<{
  results: { [K in keyof T]?: Awaited<T[K]> };
  errors: { [K in keyof T]?: Error };
}> {
  const entries = Object.entries(promises);
  const settled = await Promise.allSettled(entries.map(([, p]) => p));

  const results: Record<string, unknown> = {};
  const errors: Record<string, Error> = {};

  settled.forEach((result, index) => {
    const key = entries[index][0];
    if (result.status === "fulfilled") {
      results[key] = result.value;
    } else {
      errors[key] =
        result.reason instanceof Error
          ? result.reason
          : new Error(String(result.reason));
    }
  });

  return {
    results: results as { [K in keyof T]?: Awaited<T[K]> },
    errors: errors as { [K in keyof T]?: Error },
  };
}
```

### Step 2: تحديث Dashboard Service

```typescript
// server/services/dashboard.service.ts
import { safePromiseAllNamed } from "@/lib/utils/safe-promise";

export async function getDashboardData(userId: string) {
  const { results, errors } = await safePromiseAllNamed({
    locations: getLocations(userId),
    reviews: getReviews(userId),
    questions: getQuestions(userId),
    posts: getPosts(userId),
    stats: getStats(userId),
  });

  // Log errors but don't fail
  if (Object.keys(errors).length > 0) {
    console.warn("Some dashboard data failed to load:", errors);
  }

  // Return available data
  return {
    locations: results.locations ?? [],
    reviews: results.reviews ?? [],
    questions: results.questions ?? [],
    posts: results.posts ?? [],
    stats: results.stats ?? null,
    hasErrors: Object.keys(errors).length > 0,
  };
}
```

---

## ✅ معايير القبول

- [ ] تم إنشاء `safe-promise.ts` utilities
- [ ] جميع `Promise.all` تستخدم `safePromiseAllNamed`
- [ ] البيانات المتوفرة تُعرض حتى لو فشل بعضها
- [ ] الأخطاء تُسجل للـ debugging

---

**Status:** 🔴 NOT STARTED
