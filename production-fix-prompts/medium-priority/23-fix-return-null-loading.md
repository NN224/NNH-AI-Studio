# 🟡 MEDIUM PRIORITY: return null بدون Loading State

> **الأولوية:** P2 - متوسط
> **الوقت المقدر:** 3 ساعات
> **المجال:** UX

---

## 📋 ملخص المشكلة

**Issue ID:** MEDIUM-023
**Severity:** 🟡 MEDIUM - UX
**Impact:** Flash في الـ UI عند تحميل البيانات

---

## 🎯 المشكلة بالتفصيل

بعض الـ components ترجع `null` عند عدم توفر البيانات:

1. يسبب "flash" في الـ UI
2. المستخدم لا يعرف أن البيانات تُحمَّل
3. تجربة مستخدم سيئة

---

## 📁 الملفات المتأثرة (61+ component)

```
components/locations/locations-map-tab.tsx (6 return null)
components/gmb/GMBConnectionControls.tsx (3 return null)
components/sync/sync-banner.tsx (3 return null)
```

---

## ✅ الحل المطلوب

### قبل:

```typescript
function LocationsMap({ locations }) {
  if (!locations) return null; // ❌ Flash!

  return <Map locations={locations} />;
}
```

### بعد:

```typescript
function LocationsMap({ locations, isLoading }) {
  if (isLoading) {
    return <MapSkeleton />; // ✅ Loading state
  }

  if (!locations || locations.length === 0) {
    return <EmptyState message="No locations found" />; // ✅ Empty state
  }

  return <Map locations={locations} />;
}
```

### إنشاء Skeleton Components

```typescript
// components/ui/skeletons.tsx
export function MapSkeleton() {
  return (
    <div className="animate-pulse bg-gray-200 rounded-lg h-96 w-full" />
  );
}

export function CardSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-4 border rounded-lg">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="animate-pulse h-12 bg-gray-200 rounded" />
      ))}
    </div>
  );
}
```

---

## ✅ معايير القبول

- [ ] تم إنشاء skeleton components
- [ ] جميع `return null` استُبدلت بـ loading/empty states
- [ ] لا يوجد flash في الـ UI

---

**Status:** 🔴 NOT STARTED
