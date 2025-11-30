# 🟠 HIGH PRIORITY: Cache Invalidation غير متسق

> ⚠️ **قبل البدء:** اقرأ `AI_AGENT_START_HERE.md` أولاً! اقرأ الملف المستهدف كاملاً قبل أي تعديل.

> **الأولوية:** P1 - عالي
> **الوقت المقدر:** 4 ساعات
> **المجال:** UX + وظيفية

---

## 📋 ملخص المشكلة

**Issue ID:** HIGH-019
**Severity:** 🟠 HIGH - FUNCTIONALITY
**Impact:** Stale data في الـ UI

---

## 🎯 المشكلة بالتفصيل

بعض الـ server actions تستخدم `revalidatePath` وبعضها لا:

1. المستخدم يحدث بيانات لكن لا يرى التغيير
2. يحتاج refresh يدوي
3. تجربة مستخدم سيئة

---

## 📁 الملفات المتأثرة

```
server/actions/reviews-management.ts (12 revalidatePath) ✅
server/actions/posts-management.ts (11 revalidatePath) ✅
server/actions/questions-management.ts (9 revalidatePath) ✅
server/actions/settings.ts (5 revalidatePath) ✅
server/actions/gmb-sync.ts - يحتاج مراجعة
server/actions/locations.ts - يحتاج مراجعة
```

---

## ✅ الحل المطلوب

### Step 1: إنشاء Cache Invalidation Helper

```typescript
// lib/cache/invalidation.ts
import { revalidatePath, revalidateTag } from "next/cache";

export const CACHE_TAGS = {
  locations: "locations",
  reviews: "reviews",
  questions: "questions",
  posts: "posts",
  settings: "settings",
  dashboard: "dashboard",
} as const;

export const CACHE_PATHS = {
  dashboard: "/[locale]/dashboard",
  home: "/[locale]/home",
  locations: "/[locale]/locations",
  reviews: "/[locale]/reviews",
  questions: "/[locale]/questions",
  posts: "/[locale]/posts",
  settings: "/[locale]/settings",
} as const;

/**
 * Invalidates cache for a specific domain.
 */
export function invalidateCache(
  domain: keyof typeof CACHE_TAGS,
  options?: { locationId?: string },
): void {
  // Revalidate tag
  revalidateTag(CACHE_TAGS[domain]);

  // Revalidate paths
  const paths = getPathsForDomain(domain, options);
  paths.forEach((path) => revalidatePath(path));
}

function getPathsForDomain(
  domain: keyof typeof CACHE_TAGS,
  options?: { locationId?: string },
): string[] {
  const paths: string[] = [];

  switch (domain) {
    case "locations":
      paths.push(
        CACHE_PATHS.locations,
        CACHE_PATHS.dashboard,
        CACHE_PATHS.home,
      );
      if (options?.locationId) {
        paths.push(`/[locale]/locations/${options.locationId}`);
      }
      break;
    case "reviews":
      paths.push(CACHE_PATHS.reviews, CACHE_PATHS.dashboard);
      break;
    case "questions":
      paths.push(CACHE_PATHS.questions, CACHE_PATHS.dashboard);
      break;
    case "posts":
      paths.push(CACHE_PATHS.posts, CACHE_PATHS.dashboard);
      break;
    case "settings":
      paths.push(CACHE_PATHS.settings);
      break;
    case "dashboard":
      paths.push(CACHE_PATHS.dashboard, CACHE_PATHS.home);
      break;
  }

  return paths;
}

/**
 * Invalidates all caches after a full sync.
 */
export function invalidateAllCaches(): void {
  Object.keys(CACHE_TAGS).forEach((domain) => {
    invalidateCache(domain as keyof typeof CACHE_TAGS);
  });
}
```

### Step 2: تحديث Server Actions

```typescript
// server/actions/locations.ts
import { invalidateCache } from "@/lib/cache/invalidation";

export async function updateLocation(
  locationId: string,
  data: UpdateLocationInput,
) {
  // ... update logic ...

  // ✅ Invalidate cache after update
  invalidateCache("locations", { locationId });

  return { success: true };
}
```

---

## ✅ معايير القبول

- [ ] تم إنشاء `invalidation.ts` helper
- [ ] جميع server actions تستخدم `invalidateCache`
- [ ] الـ UI يتحدث فوراً بعد التغييرات
- [ ] لا يحتاج المستخدم refresh يدوي

---

**Status:** 🔴 NOT STARTED
