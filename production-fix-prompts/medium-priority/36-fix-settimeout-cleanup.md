# 🟡 Medium Priority: setTimeout/setInterval Cleanup

## Problem Summary

46 setTimeout/setInterval calls found in components. Many may not be properly cleaned up on component unmount, causing memory leaks.

## Severity: 🟡 Medium Priority

- **Impact**: Memory leaks, unexpected behavior
- **Effort**: 2-3 hours
- **Risk**: Low-Medium

## Affected Files (Top 10)

```
components/home/first-sync-overlay.tsx (3 timers)
components/onboarding/WelcomeBack.tsx (3 timers)
components/analytics/realtime-metrics-display.tsx (2 timers)
components/auth/google-oauth-script.tsx (2 timers)
components/dashboard/export-share-bar.tsx (2 timers)
components/dashboard/realtime-updates-indicator.tsx (2 timers)
components/error-boundary/component-error-boundary.tsx (2 timers)
components/home/achievement-system.tsx (2 timers)
components/onboarding/GuidedTour.tsx (2 timers)
components/onboarding/SuccessCelebration.tsx (2 timers)
```

## Current Code (Bad)

```typescript
useEffect(() => {
  setTimeout(() => {
    setVisible(true);
  }, 1000); // ❌ No cleanup
}, []);
```

## Required Fix

```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    setVisible(true);
  }, 1000);

  return () => clearTimeout(timer); // ✅ Cleanup
}, []);
```

## Step-by-Step Fix

### Step 1: Find all setTimeout/setInterval

```bash
grep -rn "setTimeout\|setInterval" --include="*.tsx" components/
```

### Step 2: For each timer in useEffect:

1. Store timer ID in variable
2. Return cleanup function
3. Clear timer on unmount

### Step 3: Fix patterns

#### setTimeout

```typescript
// Before
useEffect(() => {
  setTimeout(() => doSomething(), 1000);
}, []);

// After
useEffect(() => {
  const timer = setTimeout(() => doSomething(), 1000);
  return () => clearTimeout(timer);
}, []);
```

#### setInterval

```typescript
// Before
useEffect(() => {
  setInterval(() => fetchData(), 5000);
}, []);

// After
useEffect(() => {
  const interval = setInterval(() => fetchData(), 5000);
  return () => clearInterval(interval);
}, []);
```

#### Multiple timers

```typescript
useEffect(() => {
  const timers: NodeJS.Timeout[] = [];

  timers.push(setTimeout(() => step1(), 1000));
  timers.push(setTimeout(() => step2(), 2000));

  return () => timers.forEach(clearTimeout);
}, []);
```

## Acceptance Criteria

- [ ] All setTimeout in useEffect have cleanup
- [ ] All setInterval in useEffect have cleanup
- [ ] No memory leak warnings in React DevTools
- [ ] Timers don't fire after unmount

## Verification

```bash
# Check for setTimeout without cleanup (manual review needed)
grep -B5 -A5 "setTimeout" --include="*.tsx" components/ | grep -v "clearTimeout"
```

## Status: ⏳ Pending
