# 🟡 MEDIUM PRIORITY: غياب Memoization

> **الأولوية:** P2 - متوسط
> **الوقت المقدر:** 3 ساعات
> **المجال:** أداء

---

## 📋 ملخص المشكلة

**Issue ID:** MEDIUM-028
**Severity:** 🟡 MEDIUM - PERFORMANCE
**Impact:** Re-renders غير ضرورية

---

## 🎯 المشكلة بالتفصيل

عدم استخدام `useMemo`, `useCallback`, `React.memo`:

1. Components تُعاد render بدون سبب
2. Expensive calculations تُعاد في كل render
3. أداء سيء خاصة مع lists كبيرة

---

## 📁 الملفات المتأثرة

```
components/locations/locations-overview-tab.tsx
components/reviews/reviews-list.tsx
components/dashboard/*.tsx
```

---

## ✅ الحل المطلوب

### useMemo للـ Expensive Calculations

```typescript
// قبل
function LocationsList({ locations, filter }) {
  // ❌ يُحسب في كل render
  const filteredLocations = locations.filter((loc) =>
    loc.name.includes(filter),
  );
}

// بعد
function LocationsList({ locations, filter }) {
  // ✅ يُحسب فقط عند تغير dependencies
  const filteredLocations = useMemo(
    () => locations.filter((loc) => loc.name.includes(filter)),
    [locations, filter],
  );
}
```

### useCallback للـ Event Handlers

```typescript
// قبل
function ReviewCard({ review, onReply }) {
  // ❌ Function جديدة في كل render
  const handleReply = () => {
    onReply(review.id);
  };
}

// بعد
function ReviewCard({ review, onReply }) {
  // ✅ نفس الـ function reference
  const handleReply = useCallback(() => {
    onReply(review.id);
  }, [review.id, onReply]);
}
```

### React.memo للـ Components

```typescript
// قبل
function LocationCard({ location }) {
  return <div>{location.name}</div>;
}

// بعد
const LocationCard = memo(function LocationCard({ location }) {
  return <div>{location.name}</div>;
});

// مع custom comparison
const LocationCard = memo(
  function LocationCard({ location }) {
    return <div>{location.name}</div>;
  },
  (prevProps, nextProps) => {
    return prevProps.location.id === nextProps.location.id;
  }
);
```

### إنشاء Memoized List Component

```typescript
// components/ui/memoized-list.tsx
import { memo, useMemo } from "react";

interface MemoizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string;
  filter?: (item: T) => boolean;
  sort?: (a: T, b: T) => number;
}

function MemoizedListInner<T>({
  items,
  renderItem,
  keyExtractor,
  filter,
  sort,
}: MemoizedListProps<T>) {
  const processedItems = useMemo(() => {
    let result = [...items];
    if (filter) result = result.filter(filter);
    if (sort) result = result.sort(sort);
    return result;
  }, [items, filter, sort]);

  return (
    <>
      {processedItems.map((item, index) => (
        <div key={keyExtractor(item)}>{renderItem(item, index)}</div>
      ))}
    </>
  );
}

export const MemoizedList = memo(MemoizedListInner) as typeof MemoizedListInner;
```

---

## ✅ معايير القبول

- [ ] Expensive calculations تستخدم `useMemo`
- [ ] Event handlers تستخدم `useCallback`
- [ ] List items تستخدم `React.memo`
- [ ] React DevTools لا تُظهر unnecessary re-renders

---

**Status:** 🔴 NOT STARTED
