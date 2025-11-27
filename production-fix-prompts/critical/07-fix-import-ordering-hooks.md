# 🔴 CRITICAL FIX: Import Ordering Runtime Errors (3 Files)

## 📋 Problem Summary

**Issue ID:** CRITICAL-007
**Severity:** 🔴 CRITICAL - RUNTIME CRASHES
**Priority:** P0 (Immediate)
**Estimated Time:** 0.5 hours (15 min × 3 files)

---

## 🎯 Problem

React hooks use `useState`/`React.useState` BEFORE importing React.
This causes instant runtime errors.

**Files:**
1. `hooks/use-safe-timer.ts` - Line 121 uses, Line 183 imports
2. `hooks/use-safe-event-listener.ts` - Line 168 uses, Line 196 imports
3. `hooks/use-safe-fetch.ts` - Line 99 uses, Line 114 imports

---

## 🐛 Current Pattern

```typescript
// Line 121
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value); // ❌ CRASH!
  // ...
}

// Line 183 - TOO LATE!
import { useState } from "react";
```

---

## ✅ Fix

```typescript
// ✅ Import FIRST
import { useState, useEffect, useRef } from "react";

// Then use
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value); // ✅ Works
  // ...
}
```

---

## 🔍 Steps

### File 1: use-safe-timer.ts

```bash
# 1. Open file
code hooks/use-safe-timer.ts

# 2. Cut import from line 183
# 3. Paste at TOP of file (line 1 or 2)
# 4. Save
```

### File 2: use-safe-event-listener.ts

```bash
code hooks/use-safe-event-listener.ts
# Same process: move React import to top
```

### File 3: use-safe-fetch.ts

```bash
code hooks/use-safe-fetch.ts
# Same process: move React import to top
```

---

## ✅ Acceptance Criteria

- [ ] All imports at top of each file
- [ ] No code before imports
- [ ] Files compile: `npx tsc --noEmit`
- [ ] Hooks work in dev: `npm run dev`
- [ ] No runtime errors in browser console

---

## 🧪 Test

```bash
# 1. Run build
npm run build

# 2. Check for import errors
npx tsc --noEmit

# 3. Start dev server
npm run dev

# 4. Open browser, check console - should be no errors
```

---

**Status:** 🔴 NOT STARTED
**Time:** 30 minutes (QUICK FIX!)
**Priority:** P0 - BLOCKING
