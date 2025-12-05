# 🔵 Low Priority: React Hooks Dependencies

> **Priority:** P3 - Nice to have
> **Count:** ~41 instances
> **Impact:** Potential stale closures, missing updates, infinite loops

---

## Overview

React hooks dependency warnings indicate:

- Missing dependencies (may cause stale data)
- Extra dependencies (may cause unnecessary re-renders)
- Potential infinite loops

The ESLint rule `react-hooks/exhaustive-deps` helps catch these issues.

---

## 📊 Files with Hook Dependency Warnings

| File                                         | Count | Status                |
| -------------------------------------------- | ----- | --------------------- |
| `components/locations/locations-map-tab.tsx` | 4     | ⚠️ May be intentional |
| `hooks/use-realtime.ts`                      | 3     | ⚠️ May be intentional |
| `hooks/use-background-sync.ts`               | 3     | ⚠️ May be intentional |
| Various component files                      | ~31   | ⏳ Need review        |

---

## ✅ Solutions

### Solution 1: Add Missing Dependencies

```typescript
// ❌ BEFORE - Missing dependency
useEffect(() => {
  fetchData(locationId);
}, []); // Warning: 'locationId' is missing

// ✅ AFTER - Add the dependency
useEffect(() => {
  fetchData(locationId);
}, [locationId]);
```

### Solution 2: Use useCallback for Functions

```typescript
// ❌ BEFORE - Function causes infinite loop
useEffect(() => {
  const handleData = () => {
    setData(processData(rawData));
  };
  handleData();
}, [rawData]); // Warning if processData changes

// ✅ AFTER - Memoize the function
const handleData = useCallback(() => {
  setData(processData(rawData));
}, [rawData]);

useEffect(() => {
  handleData();
}, [handleData]);
```

### Solution 3: Use Refs for Non-Reactive Values

```typescript
// ❌ BEFORE - Callback prop causes re-runs
useEffect(() => {
  const unsubscribe = subscribe(onMessage);
  return () => unsubscribe();
}, [onMessage]); // Re-subscribes every time onMessage changes

// ✅ AFTER - Use ref for callback
const onMessageRef = useRef(onMessage);
onMessageRef.current = onMessage;

useEffect(() => {
  const unsubscribe = subscribe((msg) => onMessageRef.current(msg));
  return () => unsubscribe();
}, []); // Only runs once
```

### Solution 4: Intentional Empty Dependencies

When you intentionally want something to run once:

```typescript
// ❌ BEFORE - ESLint warning
useEffect(() => {
  initializeOnce();
}, []); // Warning: initializeOnce should be in deps

// ✅ AFTER - Disable rule with comment
useEffect(() => {
  initializeOnce();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // Intentionally run once on mount
```

---

## 🛠️ Common Patterns

### Pattern 1: Fetching Data on ID Change

```typescript
// ✅ CORRECT Pattern
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  let cancelled = false;

  async function loadData() {
    setLoading(true);
    try {
      const result = await fetchData(locationId);
      if (!cancelled) {
        setData(result);
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  }

  loadData();

  return () => {
    cancelled = true;
  };
}, [locationId]); // Only locationId needed
```

### Pattern 2: Event Listeners

```typescript
// ✅ CORRECT Pattern
useEffect(() => {
  function handleResize() {
    setWidth(window.innerWidth);
  }

  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, []); // Empty deps is correct - handler is defined inside
```

### Pattern 3: Subscriptions with Callbacks

```typescript
// ✅ CORRECT Pattern using useRef
const callbackRef = useRef(onUpdate);

useLayoutEffect(() => {
  callbackRef.current = onUpdate;
});

useEffect(() => {
  const unsubscribe = subscribe((data) => {
    callbackRef.current(data);
  });

  return () => unsubscribe();
}, []); // Empty deps is intentional
```

### Pattern 4: Debounced Values

```typescript
// ✅ CORRECT Pattern
const [debouncedValue, setDebouncedValue] = useState(value);

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedValue(value);
  }, delay);

  return () => clearTimeout(timer);
}, [value, delay]); // Both needed
```

---

## 📋 Files with Intentional ESLint Disables

These files have been reviewed and the disables are intentional:

| File                                                  | Reason                         |
| ----------------------------------------------------- | ------------------------------ |
| `components/locations/locations-map-tab.tsx`          | Avoids infinite map re-renders |
| `hooks/use-realtime.ts`                               | Supabase subscription setup    |
| `hooks/use-background-sync.ts`                        | Performance optimization       |
| `components/ai/ai-assistant.tsx`                      | Run once on mount              |
| `components/locations/location-attributes-dialog.tsx` | Dialog open state              |

---

## 🔍 How to Analyze Each Warning

1. **Identify the warning location:**

   ```bash
   npm run lint 2>&1 | grep "exhaustive-deps"
   ```

2. **Ask these questions:**
   - Is the dependency missing intentionally?
   - Would adding it cause infinite loops?
   - Should the callback be memoized?
   - Is this a one-time setup?

3. **Choose the right fix:**
   - Add dependency → if it should trigger re-run
   - useCallback/useMemo → if function/object is needed
   - useRef → if value shouldn't trigger re-run
   - eslint-disable → if intentionally ignoring

---

## ⚠️ Common Mistakes to Avoid

### Mistake 1: Adding Unstable References

```typescript
// ❌ BAD - Object created every render
useEffect(() => {
  doSomething(options);
}, [options]); // If options = { key: value } inline, infinite loop!

// ✅ GOOD - Memoize the object
const options = useMemo(() => ({ key: value }), [value]);
useEffect(() => {
  doSomething(options);
}, [options]);
```

### Mistake 2: Disabling Without Understanding

```typescript
// ❌ BAD - Silencing without understanding
useEffect(() => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  fetchData(id);
}, []); // Bug: won't refetch when id changes!

// ✅ GOOD - Understand and fix
useEffect(() => {
  fetchData(id);
}, [id]); // Refetches when id changes
```

### Mistake 3: Including State Setters

```typescript
// ❌ Unnecessary - setState is stable
useEffect(() => {
  setValue(computeValue(input));
}, [input, setValue]); // setValue never changes

// ✅ GOOD - Only include what matters
useEffect(() => {
  setValue(computeValue(input));
}, [input]);
```

---

## ✅ Acceptance Criteria

- [ ] All genuine missing dependencies added
- [ ] Callbacks properly memoized where needed
- [ ] Refs used for non-reactive values
- [ ] Intentional disables have comments explaining why
- [ ] No infinite loops
- [ ] Build passes without errors

---

## 📋 Checklist

### Review These Files

- [ ] `components/locations/locations-map-tab.tsx` - Verify map behavior
- [ ] `hooks/use-realtime.ts` - Verify subscription behavior
- [ ] `hooks/use-background-sync.ts` - Verify sync behavior
- [ ] All other files with `exhaustive-deps` warnings

### For Each Warning

- [ ] Understand what the hook does
- [ ] Determine if dependency is needed
- [ ] Apply appropriate fix
- [ ] Test the behavior

---

_Estimated Fix Time: 1-2 hours_
