# 🟡 MEDIUM PRIORITY: Memory Leaks من setTimeout/setInterval

> ⚠️ **قبل البدء:** اقرأ `AI_AGENT_START_HERE.md` أولاً! اقرأ الملف المستهدف كاملاً قبل أي تعديل.

> **الأولوية:** P2 - متوسط
> **الوقت المقدر:** 3 ساعات
> **المجال:** أداء + استقرار

---

## 📋 ملخص المشكلة

**Issue ID:** MEDIUM-025
**Severity:** 🟡 MEDIUM - PERFORMANCE
**Impact:** Memory leaks عند unmount

---

## 🎯 المشكلة بالتفصيل

استخدام `setTimeout`/`setInterval` بدون cleanup:

1. الـ timers تستمر بعد unmount
2. تحاول تحديث state على unmounted component
3. تسبب memory leaks و React warnings

---

## 📁 الملفات المتأثرة

```
components/home/first-sync-overlay.tsx
components/sync/sync-progress-overlay.tsx
components/dashboard/auto-refresh.tsx
```

---

## ✅ الحل المطلوب

### قبل:

```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    setData(newData);
  }, 5000);
  // ❌ لا يوجد cleanup!
}, []);
```

### بعد:

```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    setData(newData);
  }, 5000);

  // ✅ Cleanup
  return () => clearTimeout(timer);
}, []);
```

### إنشاء Custom Hooks

```typescript
// hooks/use-timeout.ts
"use client";

import { useEffect, useRef, useCallback } from "react";

export function useTimeout(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const timer = setTimeout(() => savedCallback.current(), delay);
    return () => clearTimeout(timer);
  }, [delay]);
}

// hooks/use-interval.ts
export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const timer = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(timer);
  }, [delay]);
}
```

### استخدام الـ Hooks

```typescript
function AutoRefresh() {
  const [data, setData] = useState(null);

  const fetchData = useCallback(async () => {
    const result = await getData();
    setData(result);
  }, []);

  // ✅ Auto cleanup
  useInterval(fetchData, 30000);

  return <div>{data}</div>;
}
```

---

## 🔍 خطوات التنفيذ

```bash
# ابحث عن setTimeout/setInterval
grep -rn "setTimeout\|setInterval" components/ --include="*.tsx"

# تحقق من وجود clearTimeout/clearInterval
grep -rn "clearTimeout\|clearInterval" components/ --include="*.tsx"
```

---

## ✅ معايير القبول

- [ ] تم إنشاء `use-timeout.ts` و `use-interval.ts`
- [ ] جميع `setTimeout` لها `clearTimeout` في cleanup
- [ ] جميع `setInterval` لها `clearInterval` في cleanup
- [ ] لا توجد React warnings عن unmounted components

---

**Status:** 🔴 NOT STARTED
