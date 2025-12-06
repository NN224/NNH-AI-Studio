# 🟡 Medium Priority: Unused Variables

> **Priority:** P2 - Important but not urgent
> **Count:** ~321 instances
> **Impact:** Code bloat, potential bugs, maintainability

---

## Overview

Unused variables can indicate:

- Incomplete implementations
- Copy-paste errors
- Dead code that should be removed
- Missing functionality

---

## 📊 Files with Most Unused Variables

| File                                                 | Count | Priority  |
| ---------------------------------------------------- | ----- | --------- |
| `components/settings/gmb-settings.tsx`               | 30    | 🔴 High   |
| `components/locations/location-types.tsx`            | 15    | 🔴 High   |
| `components/analytics/custom-report-builder.tsx`     | 10    | 🔴 High   |
| `lib/services/ml-sentiment-service.ts`               | 7     | 🟠 Medium |
| `app/[locale]/(marketing)/page.tsx`                  | 7     | 🟠 Medium |
| `components/approvals/approvals-dashboard.tsx`       | 6     | 🟠 Medium |
| `lib/services/ml-questions-service.ts`               | 5     | 🟠 Medium |
| `components/settings/ai-automation-tab.tsx`          | 5     | 🟡 Low    |
| `components/reviews/auto-reply-settings-panel.tsx`   | 5     | 🟡 Low    |
| `components/locations/locations-overview-tab.tsx`    | 5     | 🟡 Low    |
| `components/insights/insights-dashboard.tsx`         | 5     | 🟡 Low    |
| `components/analytics/performance-metrics-chart.tsx` | 5     | 🟡 Low    |
| `app/api/locations/optimized/route.ts`               | 5     | 🟡 Low    |

---

## ✅ Solutions

### Solution 1: Remove Unused Variables

The simplest fix - delete what's not used:

```typescript
// ❌ BEFORE
const { data, error, isLoading, refetch } = useQuery(...);
// Only using 'data' and 'error'

// ✅ AFTER
const { data, error } = useQuery(...);
```

### Solution 2: Prefix with Underscore

For intentionally unused variables (e.g., callbacks):

```typescript
// ❌ BEFORE - ESLint error
function handleClick(event, index) {
  // Only using 'event'
  console.log(event.target);
}

// ✅ AFTER - Allowed by ESLint config
function handleClick(event, _index) {
  console.log(event.target);
}
```

### Solution 3: Use the Variable

Sometimes the variable should be used but isn't:

```typescript
// ❌ BEFORE
const loading = isLoading || isPending;
// 'loading' defined but never used - probably a bug!

// ✅ AFTER
const loading = isLoading || isPending;
if (loading) return <Spinner />;
```

---

## 🛠️ File-by-File Fixes

### 1. `components/settings/gmb-settings.tsx` (30 unused)

This file likely has many unused imports and destructured values:

```typescript
// ❌ Common pattern
import { useState, useEffect, useCallback, useMemo } from "react";
// Only using useState and useEffect

const {
  accounts,
  locations,
  isLoading,
  error,
  refetch,
  disconnect,
  reconnect,
} = useGMBConnection();
// Only using accounts and isLoading

// ✅ FIX
import { useState, useEffect } from "react";

const { accounts, isLoading } = useGMBConnection();
```

### 2. `components/locations/location-types.tsx` (15 unused)

Type definitions file with unused types:

```typescript
// ❌ BEFORE
export interface LocationData {
  id: string;
  name: string;
  // ...
}

export interface LocationMetrics {
  views: number;
  // ...
}

export interface LocationAction {
  type: string;
  // ...
}
// Some of these might not be exported/used

// ✅ FIX
// 1. Check if types are used elsewhere
grep -rn "LocationMetrics" --include="*.ts" --include="*.tsx"

// 2. Remove if not used, or add export if needed
```

### 3. `components/analytics/custom-report-builder.tsx` (10 unused)

```typescript
// ❌ BEFORE
const [metrics, setMetrics] = useState<string[]>([]);
const [dimensions, setDimensions] = useState<string[]>([]);
const [filters, setFilters] = useState<Filter[]>([]);
const [dateRange, setDateRange] = useState<DateRange | null>(null);
const [sortBy, setSortBy] = useState<string>("");
// Not all state is being used

// ✅ FIX
// Either use the state or remove it
// If it's for future features, add TODO comment:
// TODO: Implement sorting feature
// const [sortBy, setSortBy] = useState<string>('');
```

---

## 📝 Common Unused Variable Patterns

### Pattern 1: Unused Imports

```typescript
// ❌ BEFORE
import { Button, Input, Select, Checkbox, Radio } from "@/components/ui";
// Only using Button and Input

// ✅ AFTER
import { Button, Input } from "@/components/ui";
```

### Pattern 2: Unused Destructured Props

```typescript
// ❌ BEFORE
function MyComponent({ title, description, icon, onClick, disabled }) {
  return <button onClick={onClick}>{title}</button>;
}

// ✅ AFTER
function MyComponent({ title, onClick }: { title: string; onClick: () => void }) {
  return <button onClick={onClick}>{title}</button>;
}

// Or if props are intentionally unused (for future):
function MyComponent({
  title,
  onClick,
  description: _description, // Marked as intentionally unused
  ...rest
}) {
  return <button onClick={onClick} {...rest}>{title}</button>;
}
```

### Pattern 3: Unused Array Destructuring

```typescript
// ❌ BEFORE
const [first, second, third] = array;
// Only using 'first'

// ✅ AFTER
const [first] = array;

// Or if you need specific index:
const first = array[0];
const third = array[2]; // Skip second
```

### Pattern 4: Unused Catch Variables

```typescript
// ❌ BEFORE
try {
  await someOperation();
} catch (error) {
  // error not used
  return { success: false };
}

// ✅ AFTER - Option 1: Use the error
try {
  await someOperation();
} catch (error) {
  logger.error("Operation failed", { error: error.message });
  return { success: false, error: error.message };
}

// ✅ AFTER - Option 2: Mark as unused
try {
  await someOperation();
} catch (_error) {
  return { success: false };
}

// ✅ AFTER - Option 3: Omit variable (ES2019+)
try {
  await someOperation();
} catch {
  return { success: false };
}
```

### Pattern 5: Unused Function Parameters

```typescript
// ❌ BEFORE
array.map((item, index, array) => {
  return item.name;
});

// ✅ AFTER
array.map((item) => item.name);

// Or if you need index but not array:
array.map((item, index) => `${index}: ${item.name}`);

// Or if callback requires signature but you don't need params:
array.forEach((_item, index) => {
  console.log(`Processing item ${index}`);
});
```

---

## 🔧 Quick Fix Command

ESLint can auto-fix some unused imports:

```bash
# This might remove some unused imports
npm run lint -- --fix
```

For manual fixes, find all unused variables:

```bash
npm run lint 2>&1 | grep "no-unused-vars"
```

---

## ✅ Acceptance Criteria

- [ ] No unused imports
- [ ] No unused variables (except those prefixed with `_`)
- [ ] No unused function parameters (except those prefixed with `_`)
- [ ] All intentionally unused variables are prefixed with `_`
- [ ] ESLint `no-unused-vars` rule passes (warnings only)

---

## 📋 Checklist by Category

### High Priority Files

- [ ] `components/settings/gmb-settings.tsx` (30)
- [ ] `components/locations/location-types.tsx` (15)
- [ ] `components/analytics/custom-report-builder.tsx` (10)

### Medium Priority Files

- [ ] `lib/services/ml-sentiment-service.ts` (7)
- [ ] `app/[locale]/(marketing)/page.tsx` (7)
- [ ] `components/approvals/approvals-dashboard.tsx` (6)
- [ ] `lib/services/ml-questions-service.ts` (5)

### Low Priority Files

- [ ] All files with ≤5 unused variables

---

## ⚠️ Notes

1. **Don't remove exports prematurely** - Check if the export is used in other files first
2. **Consider future use** - If something is planned for future, add a TODO comment
3. **Check for side effects** - Some variables might be used for side effects:
   ```typescript
   const _timer = setTimeout(cleanup, 5000); // Intentionally unused but needed
   ```
4. **Test after removal** - Always run build after removing variables

---

_Estimated Fix Time: 2-4 hours_
