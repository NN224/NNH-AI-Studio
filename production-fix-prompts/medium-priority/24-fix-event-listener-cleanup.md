# 🟡 MEDIUM PRIORITY: Event Listeners بدون Cleanup

> **الأولوية:** P2 - متوسط
> **الوقت المقدر:** 3 ساعات
> **المجال:** أداء + استقرار

---

## 📋 ملخص المشكلة

**Issue ID:** MEDIUM-024
**Severity:** 🟡 MEDIUM - PERFORMANCE
**Impact:** Memory leaks عند unmount

---

## 🎯 المشكلة بالتفصيل

بعض الـ components تضيف event listeners بدون cleanup:

1. الـ listeners تبقى بعد unmount
2. تسبب memory leaks
3. قد تسبب errors إذا حاولت تحديث unmounted component

---

## 📁 الملفات المتأثرة

```bash
# ابحث عن addEventListener بدون removeEventListener
grep -rn "addEventListener" components/ --include="*.tsx"
```

---

## ✅ الحل المطلوب

### قبل:

```typescript
useEffect(() => {
  window.addEventListener("resize", handleResize);
  // ❌ لا يوجد cleanup!
}, []);
```

### بعد:

```typescript
useEffect(() => {
  window.addEventListener("resize", handleResize);

  // ✅ Cleanup function
  return () => {
    window.removeEventListener("resize", handleResize);
  };
}, [handleResize]);
```

### إنشاء Custom Hook

```typescript
// hooks/use-event-listener.ts
"use client";

import { useEffect, useRef } from "react";

export function useEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: (event: WindowEventMap[K]) => void,
  element: Window | HTMLElement | null = typeof window !== "undefined"
    ? window
    : null,
) {
  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!element) return;

    const eventListener = (event: WindowEventMap[K]) => {
      savedHandler.current(event);
    };

    element.addEventListener(eventName, eventListener as EventListener);

    return () => {
      element.removeEventListener(eventName, eventListener as EventListener);
    };
  }, [eventName, element]);
}
```

### استخدام الـ Hook

```typescript
function MyComponent() {
  const handleResize = useCallback(() => {
    console.log("Window resized");
  }, []);

  useEventListener("resize", handleResize);

  return <div>...</div>;
}
```

---

## ✅ معايير القبول

- [ ] تم إنشاء `use-event-listener.ts` hook
- [ ] جميع `addEventListener` لها cleanup
- [ ] لا توجد memory leaks

---

**Status:** 🔴 NOT STARTED
