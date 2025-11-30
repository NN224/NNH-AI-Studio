# 🟡 MEDIUM PRIORITY: window/document بدون SSR Check

> ⚠️ **قبل البدء:** اقرأ `AI_AGENT_START_HERE.md` أولاً! اقرأ الملف المستهدف كاملاً قبل أي تعديل.

> **الأولوية:** P2 - متوسط
> **الوقت المقدر:** 2 ساعات
> **المجال:** استقرار

---

## 📋 ملخص المشكلة

**Issue ID:** MEDIUM-026
**Severity:** 🟡 MEDIUM - STABILITY
**Impact:** Hydration errors و SSR failures

---

## 🎯 المشكلة بالتفصيل

استخدام `window` أو `document` بدون التحقق من البيئة:

1. في SSR، `window` و `document` غير موجودين
2. يسبب errors عند build
3. يسبب hydration mismatches

---

## 📁 الملفات المتأثرة

```bash
grep -rn "window\.\|document\." components/ --include="*.tsx" | grep -v "typeof window"
```

---

## ✅ الحل المطلوب

### قبل:

```typescript
// ❌ يفشل في SSR
const width = window.innerWidth;
const element = document.getElementById("app");
```

### بعد:

```typescript
// ✅ Safe SSR check
const width = typeof window !== "undefined" ? window.innerWidth : 0;

// ✅ أو استخدم useEffect
useEffect(() => {
  const element = document.getElementById("app");
  // ...
}, []);
```

### إنشاء Utility Functions

```typescript
// lib/utils/ssr.ts

/**
 * Checks if code is running in browser environment.
 */
export const isBrowser = typeof window !== "undefined";

/**
 * Safely gets window property with SSR fallback.
 */
export function getWindowProperty<K extends keyof Window>(
  key: K,
  fallback: Window[K],
): Window[K] {
  if (typeof window === "undefined") return fallback;
  return window[key];
}

/**
 * Safely accesses localStorage with SSR check.
 */
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(key);
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, value);
  },
  removeItem: (key: string): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(key);
  },
};
```

### إنشاء Hook للـ Window Size

```typescript
// hooks/use-window-size.ts
"use client";

import { useState, useEffect } from "react";

interface WindowSize {
  width: number;
  height: number;
}

export function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    function handleResize() {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    // Set initial size
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return size;
}
```

---

## ✅ معايير القبول

- [ ] تم إنشاء `ssr.ts` utilities
- [ ] جميع `window.` و `document.` لها SSR check
- [ ] لا توجد hydration errors
- [ ] Build يعمل بدون errors

---

**Status:** 🔴 NOT STARTED
