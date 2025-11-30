# 🟠 High Priority: Remove Console.log Statements

> ⚠️ **قبل البدء:** اقرأ `AI_AGENT_START_HERE.md` أولاً! اقرأ الملف المستهدف كاملاً قبل أي تعديل.

## Problem Summary

100+ console.log statements found in production code. These expose internal information, slow down the app, and clutter browser console.

## Severity: 🟠 High Priority

- **Impact**: Information leakage, performance
- **Effort**: 2 hours
- **Risk**: Medium - security concern

## Affected Files (Examples)

```
app/[locale]/(dashboard)/automation/page.tsx:128
app/[locale]/(dashboard)/features/error.tsx:25
app/[locale]/(dashboard)/features/page.tsx:113
app/[locale]/(dashboard)/locations/[id]/page.tsx:56,79,110
app/[locale]/(dashboard)/locations/page.tsx:172,375
app/[locale]/(dashboard)/questions/error.tsx:24
app/[locale]/(dashboard)/questions/page.tsx:73
app/[locale]/(dashboard)/reviews/ai-cockpit/ai-cockpit-client.tsx:41
app/[locale]/(dashboard)/reviews/ai-cockpit/error.tsx:11
app/[locale]/(dashboard)/reviews/ai-cockpit/page.tsx:16
app/[locale]/(dashboard)/reviews/error.tsx:12
```

## Step-by-Step Fix

### Step 1: Find all console.log statements

```bash
npm run lint 2>&1 | grep "no-console"
```

### Step 2: For each console.log, decide:

1. **Remove it** - if it's debug code
2. **Replace with console.error** - if it's an error
3. **Replace with Sentry** - if it needs tracking
4. **Keep console.warn/error** - ESLint allows these

### Step 3: Fix patterns

```typescript
// Before
console.log("Debug:", data); // ❌ Not allowed

// After - Option 1: Remove
// (deleted)

// After - Option 2: Use allowed methods
console.error("Error:", error); // ✅ Allowed
console.warn("Warning:", warning); // ✅ Allowed

// After - Option 3: Use Sentry
import * as Sentry from "@sentry/nextjs";
Sentry.captureMessage("Important event", { extra: { data } });
```

## Acceptance Criteria

- [ ] No console.log in production code
- [ ] Errors use console.error or Sentry
- [ ] Warnings use console.warn
- [ ] `npm run lint` shows no "no-console" warnings

## Verification

```bash
npm run lint 2>&1 | grep -c "no-console"
# Should be 0
```

## Status: ⏳ Pending
