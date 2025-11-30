# 🟡 Medium Priority: localStorage SSR Safety

> ⚠️ **قبل البدء:** اقرأ `AI_AGENT_START_HERE.md` أولاً! اقرأ الملف المستهدف كاملاً قبل أي تعديل.

## Problem Summary

77 localStorage calls found. Direct localStorage access in Next.js can cause hydration errors because localStorage doesn't exist on the server.

## Severity: 🟡 Medium Priority

- **Impact**: Hydration errors, SSR failures
- **Effort**: 2 hours
- **Risk**: Low-Medium

## Affected Files

```
lib/dashboard-preferences.ts (7 calls)
components/dashboard/advanced-filters.tsx (3 calls)
components/home/enhanced-onboarding.tsx (3 calls)
components/ai-command-center/prompts/custom-prompts-manager.tsx (2 calls)
components/home/smart-ai-suggestions.tsx (2 calls)
components/onboarding/GuidedTour.tsx (2 calls)
components/settings/gmb-settings.tsx (2 calls)
lib/api-client.ts (2 calls)
components/settings/app-settings-tab.tsx (1 call)
lib/utils/gmb-events.ts (1 call)
```

## Current Code (Bad)

```typescript
// ❌ Will crash on server
const value = localStorage.getItem("key");

// ❌ Will cause hydration mismatch
const [data, setData] = useState(localStorage.getItem("key"));
```

## Required Fix

```typescript
// ✅ Safe localStorage access
const value =
  typeof window !== "undefined" ? localStorage.getItem("key") : null;

// ✅ Safe useState with localStorage
const [data, setData] = useState<string | null>(null);

useEffect(() => {
  setData(localStorage.getItem("key"));
}, []);
```

## Step-by-Step Fix

### Step 1: Create safe localStorage utility

```typescript
// lib/utils/storage.ts
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  setItem: (key: string, value: string): void => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(key, value);
    } catch {
      console.warn("localStorage not available");
    }
  },

  removeItem: (key: string): void => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  },
};
```

### Step 2: Create useLocalStorage hook

```typescript
// hooks/use-local-storage.ts
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const item = localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch {
      // Use initial value
    }
    setIsLoaded(true);
  }, [key]);

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch {
      console.warn("Failed to save to localStorage");
    }
  };

  return [storedValue, setValue, isLoaded] as const;
}
```

### Step 3: Replace direct calls

```typescript
// Before
const theme = localStorage.getItem("theme");

// After
import { safeLocalStorage } from "@/lib/utils/storage";
const theme = safeLocalStorage.getItem("theme");

// Or with hook
const [theme, setTheme, isLoaded] = useLocalStorage("theme", "light");
```

## Acceptance Criteria

- [ ] Safe localStorage utility created
- [ ] useLocalStorage hook created
- [ ] All direct localStorage calls replaced
- [ ] No hydration errors
- [ ] SSR works correctly

## Verification

```bash
# Check for direct localStorage calls
grep -rn "localStorage\." --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v "safeLocalStorage"
```

## Status: ⏳ Pending
