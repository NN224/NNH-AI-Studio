# 🟡 MEDIUM PRIORITY: ESLint Errors المتبقية

> ⚠️ **قبل البدء:** اقرأ `AI_AGENT_START_HERE.md` أولاً! اقرأ الملف المستهدف كاملاً قبل أي تعديل.

> **الأولوية:** P2 - متوسط
> **الوقت المقدر:** 2 ساعات
> **المجال:** جودة الكود

---

## 📋 ملخص المشكلة

**Issue ID:** MEDIUM-035
**Severity:** 🟡 MEDIUM - CODE QUALITY
**Impact:** 22 ESLint error متبقية

---

## 🎯 المشاكل المتبقية

### 1. Empty Block Statements (8 errors)

```
app/[locale]/(dashboard)/analytics/error.tsx
app/[locale]/(dashboard)/automation/error.tsx
app/[locale]/(dashboard)/features/error.tsx
app/[locale]/(dashboard)/media/error.tsx
app/[locale]/(dashboard)/questions/error.tsx
app/[locale]/(dashboard)/reviews/ai-cockpit/error.tsx
app/[locale]/(dashboard)/reviews/error.tsx
app/api/log-errors/route.ts
```

**المشكلة:**

```typescript
} catch (error) {
  // ❌ Empty block
}
```

**الحل:**

```typescript
} catch (error) {
  // Intentionally empty - error already handled by error boundary
  void error;
}
```

### 2. Storybook Imports (4 errors)

```
stories/Button.stories.ts
stories/Header.stories.ts
stories/Page.stories.ts
```

**المشكلة:**

```typescript
import type { Meta } from "@storybook/react";
// ❌ Should use @storybook/nextjs
```

**الحل:**

```typescript
import type { Meta } from "@storybook/nextjs";
```

### 3. Empty Interface (1 error)

```
components/locations/locations-error-boundary.tsx
```

**المشكلة:**

```typescript
interface Props extends ErrorBoundaryProps {}
// ❌ Empty interface
```

**الحل:**

```typescript
type Props = ErrorBoundaryProps;
```

### 4. @ts-ignore (1 error)

```
lib/utils/pdf-export.ts
```

**المشكلة:**

```typescript
// @ts-ignore
// ❌ Should use @ts-expect-error
```

**الحل:**

```typescript
// @ts-expect-error - Reason for ignoring
```

### 5. Useless Escapes (8 errors)

```
lib/utils/sanitize.ts
```

**المشكلة:**

```typescript
const regex = /\(\)\./;
// ❌ Unnecessary escapes
```

**الحل:**

```typescript
const regex = /[().]/;
// أو
const regex = new RegExp("\\(\\)\\.");
```

---

## ✅ معايير القبول

- [ ] لا توجد ESLint errors
- [ ] `npm run lint` يمر بدون errors
- [ ] فقط warnings مقبولة

---

**Status:** 🔴 NOT STARTED
