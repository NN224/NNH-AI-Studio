# 🟡 MEDIUM PRIORITY: useState([]) بدون Type

> ⚠️ **قبل البدء:** اقرأ `AI_AGENT_START_HERE.md` أولاً! اقرأ الملف المستهدف كاملاً قبل أي تعديل.

> **الأولوية:** P2 - متوسط
> **الوقت المقدر:** 2 ساعات
> **المجال:** صيانة

---

## 📋 ملخص المشكلة

**Issue ID:** MEDIUM-022
**Severity:** 🟡 MEDIUM - MAINTAINABILITY
**Impact:** Type errors عند إضافة عناصر للـ array

---

## 🎯 المشكلة بالتفصيل

استخدام `useState([])` بدون تحديد النوع:

1. TypeScript يستنتج `never[]`
2. يسبب type errors عند `push` أو `setItems`
3. يحتاج type assertion في كل مكان

---

## 📁 الملفات المتأثرة (57+ component)

```
components/locations/edit-location-dialog.tsx (4 useState([]))
components/dashboard/gmb-posts-section.tsx (3 useState([]))
components/analytics/analytics-filters.tsx (2 useState([]))
```

---

## ✅ الحل المطلوب

### قبل:

```typescript
const [items, setItems] = useState([]);
// TypeScript: items is never[]
```

### بعد:

```typescript
interface Item {
  id: string;
  name: string;
}

const [items, setItems] = useState<Item[]>([]);
// TypeScript: items is Item[]
```

---

## 🔍 خطوات التنفيذ

```bash
# ابحث عن جميع useState([])
grep -rn "useState(\[\])" components/ --include="*.tsx"

# لكل واحد:
# 1. حدد نوع الـ array items
# 2. أضف generic type
```

---

## ✅ معايير القبول

- [ ] جميع `useState([])` تحتوي على generic type
- [ ] لا توجد `never[]` في الكود
- [ ] لا توجد أخطاء TypeScript

---

**Status:** 🔴 NOT STARTED
