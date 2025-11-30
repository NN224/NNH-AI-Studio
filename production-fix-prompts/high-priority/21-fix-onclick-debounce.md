# 🟠 HIGH PRIORITY: onClick بدون Debounce

> ⚠️ **قبل البدء:** اقرأ `AI_AGENT_START_HERE.md` أولاً! اقرأ الملف المستهدف كاملاً قبل أي تعديل.

> **الأولوية:** P1 - عالي
> **الوقت المقدر:** 4 ساعات
> **المجال:** UX + أداء

---

## 📋 ملخص المشكلة

**Issue ID:** HIGH-021
**Severity:** 🟠 HIGH - UX + PERFORMANCE
**Impact:** Duplicate requests عند النقر المتكرر

---

## 🎯 المشكلة بالتفصيل

معظم الـ onClick handlers لا تستخدم debounce:

1. المستخدم ينقر مرتين بالخطأ
2. يتم إرسال request مرتين
3. قد يسبب duplicate data أو errors

---

## 📁 الملفات المتأثرة (158+ component)

```
components/reviews/ReviewsPageClient.tsx (22 onClick)
components/locations/locations-map-tab.tsx (19 onClick)
components/locations/business-info-editor.tsx (15 onClick)
```

---

## ✅ الحل المطلوب

### Step 1: إنشاء useAsyncAction Hook

```typescript
// hooks/use-async-action.ts
"use client";

import { useState, useCallback, useRef } from "react";

interface UseAsyncActionOptions {
  debounceMs?: number;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useAsyncAction<
  T extends (...args: unknown[]) => Promise<unknown>,
>(action: T, options: UseAsyncActionOptions = {}) {
  const { debounceMs = 300, onSuccess, onError } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const lastCallRef = useRef<number>(0);

  const execute = useCallback(
    async (...args: Parameters<T>) => {
      const now = Date.now();

      // Debounce check
      if (now - lastCallRef.current < debounceMs) {
        return;
      }
      lastCallRef.current = now;

      // Prevent double execution while loading
      if (isLoading) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await action(...args);
        onSuccess?.();
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [action, debounceMs, isLoading, onSuccess, onError],
  );

  return {
    execute,
    isLoading,
    error,
    reset: () => setError(null),
  };
}
```

### Step 2: تحديث Components

```typescript
// components/reviews/ReviewsPageClient.tsx
import { useAsyncAction } from "@/hooks/use-async-action";

function ReviewsPageClient() {
  const { execute: handleReply, isLoading } = useAsyncAction(
    async (reviewId: string, response: string) => {
      await replyToReview(reviewId, response);
    },
    {
      onSuccess: () => toast.success("Reply sent!"),
      onError: (error) => toast.error(error.message),
    }
  );

  return (
    <Button
      onClick={() => handleReply(review.id, responseText)}
      disabled={isLoading}
    >
      {isLoading ? "Sending..." : "Reply"}
    </Button>
  );
}
```

---

## ✅ معايير القبول

- [ ] تم إنشاء `use-async-action.ts` hook
- [ ] جميع الـ buttons مع API calls تستخدم الـ hook
- [ ] الـ buttons تُعطَّل أثناء الـ loading
- [ ] لا يمكن النقر المتكرر

---

**Status:** 🔴 NOT STARTED
