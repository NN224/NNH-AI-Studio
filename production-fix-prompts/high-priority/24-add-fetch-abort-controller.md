# 🟠 High Priority: Add AbortController to Fetch Requests

## Problem Summary

111 fetch calls found in components without AbortController. When components unmount, pending requests continue and may cause memory leaks or state updates on unmounted components.

## Severity: 🟠 High Priority

- **Impact**: Memory leaks, React warnings
- **Effort**: 4-5 hours
- **Risk**: Medium - affects stability

## Affected Files (Top 10)

```
components/locations/locations-overview-tab.tsx (8 fetches)
components/dashboard/gmb-posts-section.tsx (7 fetches)
components/dashboard/BusinessHeader.tsx (5 fetches)
components/locations/location-attributes-dialog.tsx (5 fetches)
components/locations/locations-map-tab.tsx (5 fetches)
components/dashboard/monitoring-dashboard.tsx (4 fetches)
components/locations/bulk-label-dialog.tsx (3 fetches)
components/locations/location-detail-header.tsx (3 fetches)
components/locations/location-qa-section.tsx (3 fetches)
components/reviews/ReviewsPageClient.tsx (3 fetches)
```

## Current Code (Bad)

```typescript
useEffect(() => {
  const fetchData = async () => {
    const res = await fetch("/api/data"); // ❌ No abort
    const data = await res.json();
    setData(data); // ❌ May update unmounted component
  };
  fetchData();
}, []);
```

## Required Fix

```typescript
useEffect(() => {
  const controller = new AbortController();

  const fetchData = async () => {
    try {
      const res = await fetch("/api/data", { signal: controller.signal });
      const data = await res.json();
      setData(data);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return; // Request was cancelled, ignore
      }
      console.error("Fetch error:", error);
    }
  };

  fetchData();

  return () => controller.abort(); // ✅ Cancel on unmount
}, []);
```

## Step-by-Step Fix

### Step 1: Find all fetch calls in useEffect

```bash
grep -rn "fetch(" --include="*.tsx" components/ | head -50
```

### Step 2: For each fetch in useEffect:

1. Create AbortController at start of effect
2. Pass signal to fetch options
3. Handle AbortError in catch
4. Return cleanup function that calls abort()

### Step 3: Create reusable hook (optional)

```typescript
// hooks/use-fetch.ts
export function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(url, { signal: controller.signal })
      .then((res) => res.json())
      .then(setData)
      .catch((err) => {
        if (err.name !== "AbortError") setError(err);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [url]);

  return { data, loading, error };
}
```

## Acceptance Criteria

- [ ] All fetch calls in useEffect have AbortController
- [ ] Cleanup functions abort pending requests
- [ ] No "Can't perform state update on unmounted component" warnings
- [ ] AbortError is properly handled

## Verification

```bash
# Check for fetch without signal
grep -rn "fetch(" --include="*.tsx" components/ | grep -v "signal"
```

## Status: ⏳ Pending
