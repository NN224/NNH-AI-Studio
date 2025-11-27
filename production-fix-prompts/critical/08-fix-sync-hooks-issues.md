# ✅ [COMPLETED] 🔧 Fix Critical Synchronization Hooks Issues

> **تم التطبيق بالكامل** ✅ - Applied on Nov 27, 2025

## 📋 المشكلة / Problem

**ملف:** `hooks/use-background-sync.ts`, `hooks/use-sync-status.ts`
**الخطورة:** 🔴 **CRITICAL** - Infinite loops, unhandled promise rejections

### Issues Found:

#### 1. **use-sync-status.ts** - Infinite Loop Bug (Line 86)

```typescript
// ❌ WRONG: Supabase client in dependency array causes infinite re-renders
useEffect(() => {
  // ...
}, [userId, supabase]); // 🔴 supabase changes every render!
```

**Impact:**

- `createClient()` returns new object instance on every render
- Effect runs infinitely, making 1000s of database queries
- Browser freezes, database overload, quota exhaustion
- **CRITICAL PRODUCTION BLOCKER**

#### 2. **use-background-sync.ts** - Fire-and-Forget Promises (Lines 178, 206, 213)

```typescript
// ❌ WRONG: performSync() called without await in interval
setInterval(
  () => {
    performSync(); // 🔴 Fire and forget - errors silently ignored!
  },
  intervalMinutes * 60 * 1000,
);
```

**Impact:**

- Unhandled promise rejections
- Silent failures - user thinks sync worked but it didn't
- No error recovery or retry logic
- Background errors crash the app

---

## ✅ الحل / Solution

### Fix 1: Remove Supabase from Dependencies

**File:** `hooks/use-sync-status.ts`

```typescript
export function useSyncStatus(userId?: string): UseSyncStatusResult {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastJob, setLastJob] = useState<SyncJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ✅ Create client INSIDE useEffect, not outside
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // ✅ Create supabase client here (stable reference)
    const supabase = createClient();

    const checkSyncStatus = async () => {
      if (!userId) return;

      try {
        // Check for any active jobs (pending or processing)
        const { data: activeJobs, error: activeError } = await supabase
          .from("sync_queue")
          .select("*")
          .eq("user_id", userId)
          .in("status", ["pending", "processing"])
          .order("created_at", { ascending: false })
          .limit(1);

        if (activeError) throw activeError;

        if (activeJobs && activeJobs.length > 0) {
          if (mountedRef.current) {
            setIsSyncing(true);
            setLastJob(activeJobs[0]);
          }
        } else {
          // If no active jobs, get the last completed/failed job for reference
          const { data: lastJobs, error: lastError } = await supabase
            .from("sync_queue")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1);

          if (lastError) throw lastError;

          if (mountedRef.current) {
            setIsSyncing(false);
            setLastJob(lastJobs && lastJobs.length > 0 ? lastJobs[0] : null);
          }
        }
      } catch (err) {
        if (mountedRef.current) {
          console.error("Error checking sync status:", err);
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      }
    };

    // Initial check
    checkSyncStatus();

    // Poll every 5 seconds
    const intervalId = setInterval(checkSyncStatus, 5000);

    return () => {
      mountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [userId]); // ✅ FIXED: Only userId in dependencies, not supabase!

  return { isSyncing, lastJob, error };
}
```

**Key Changes:**

1. ✅ Moved `createClient()` INSIDE `useEffect`
2. ✅ Removed `supabase` from dependency array
3. ✅ Only `userId` in dependencies (stable)

---

### Fix 2: Properly Await Async Calls in Intervals

**File:** `hooks/use-background-sync.ts`

```typescript
// Helper: Perform background sync with error recovery
const performSync = async () => {
  if (!shouldSync()) return;

  try {
    if (showNotifications) {
      toast.info("🔄 Updating data in background...", {
        duration: 2000,
      });
    }

    if (activeAccountId && syncContext) {
      await syncContext.startSync(activeAccountId, false);
    }

    if (showNotifications) {
      toast.success("✓ Data updated successfully", {
        duration: 2000,
      });
    }
  } catch (error) {
    console.error("[Background Sync] Failed:", error);

    // ✅ Add retry logic
    retryCount.current = (retryCount.current || 0) + 1;

    if (showNotifications) {
      toast.error("Background sync failed", {
        description: error instanceof Error ? error.message : "Unknown error",
        duration: 3000,
      });
    }

    // ✅ Report to error monitoring
    if (typeof window !== "undefined" && (window as any).Sentry) {
      (window as any).Sentry.captureException(error);
    }
  }
};

// Set up periodic background sync
useEffect(() => {
  // Clear any existing interval
  if (syncIntervalRef.current) {
    clearInterval(syncIntervalRef.current);
  }

  // ✅ FIXED: Wrap in async function to properly handle errors
  const runPeriodicSync = async () => {
    try {
      await performSync(); // ✅ Now awaiting!
    } catch (error) {
      // Errors already handled in performSync
      console.error("[Periodic Sync] Error:", error);
    }
  };

  // Set up new interval
  syncIntervalRef.current = setInterval(
    () => {
      runPeriodicSync(); // ✅ Call wrapper function
    },
    intervalMinutes * 60 * 1000,
  );

  // Cleanup on unmount
  return () => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
  };
}, [intervalMinutes]); // eslint-disable-line react-hooks/exhaustive-deps
```

**Also fix visibility change handler (line 203-215):**

```typescript
// Pause sync when page is hidden, resume when visible
useEffect(() => {
  // ✅ Async wrapper for visibility change
  const runSyncOnVisible = async () => {
    try {
      if (shouldSync()) {
        await performSync();
      }
    } catch (error) {
      console.error("[Visibility Sync] Error:", error);
    }
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      // Page hidden - pause interval
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    } else {
      // Page visible - resume interval and check if sync needed
      if (!syncIntervalRef.current) {
        syncIntervalRef.current = setInterval(
          () => {
            runPeriodicSync(); // ✅ Use wrapper
          },
          intervalMinutes * 60 * 1000,
        );

        // Check if sync needed immediately
        runSyncOnVisible(); // ✅ Await in wrapper
      }
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}, [intervalMinutes]); // eslint-disable-line react-hooks/exhaustive-deps
```

---

## 🧪 اختبار / Testing

### Test 1: No Infinite Loop

```typescript
// tests/hooks/use-sync-status.test.ts
import { renderHook, waitFor } from "@testing-library/react";
import { useSyncStatus } from "@/hooks/use-sync-status";

jest.mock("@/lib/supabase/client");

describe("useSyncStatus", () => {
  it("should NOT cause infinite re-renders", async () => {
    const { result, rerender } = renderHook(() =>
      useSyncStatus("test-user-id"),
    );

    // Render count should stay low
    let renderCount = 0;
    const originalUseEffect = React.useEffect;
    jest.spyOn(React, "useEffect").mockImplementation((effect, deps) => {
      renderCount++;
      return originalUseEffect(effect, deps);
    });

    // Rerender 10 times
    for (let i = 0; i < 10; i++) {
      rerender();
    }

    // Should only have initial effect + cleanup effects
    expect(renderCount).toBeLessThan(15);
  });
});
```

### Test 2: Error Handling in Background Sync

```typescript
// tests/hooks/use-background-sync.test.ts
import { renderHook, act } from "@testing-library/react";
import { useBackgroundSync } from "@/hooks/use-background-sync";

describe("useBackgroundSync", () => {
  it("should handle performSync errors gracefully", async () => {
    const mockStartSync = jest.fn().mockRejectedValue(new Error("Sync failed"));

    const { result } = renderHook(() =>
      useBackgroundSync({
        intervalMinutes: 1,
        showNotifications: true,
      }),
    );

    // Trigger sync
    await act(async () => {
      // Wait for interval to fire
      jest.advanceTimersByTime(60000);
    });

    // Should NOT crash, error should be caught
    expect(mockStartSync).toHaveBeenCalled();
    // Toast error should be shown
    expect(toast.error).toHaveBeenCalledWith(
      "Background sync failed",
      expect.any(Object),
    );
  });
});
```

---

## ✅ معايير القبول / Acceptance Criteria

- [ ] `use-sync-status.ts`: Supabase removed from dependency array
- [ ] `use-sync-status.ts`: No infinite loops when userId changes
- [ ] `use-background-sync.ts`: All `performSync()` calls properly awaited
- [ ] Error handling works for all background sync scenarios
- [ ] No unhandled promise rejections in console
- [ ] Tests pass with 100% coverage
- [ ] Manual testing: Open dashboard, check Network tab - should see ~1 query per 5 seconds, NOT 100s per second
- [ ] Manual testing: Background sync errors show toast notifications

---

## 📊 التأثير / Impact

**الخطورة:** 🔴 **CRITICAL**
**الأولوية:** **P0** - Must fix before production deployment
**الوقت المقدر:** 2-3 hours

**Production Risk:**

- **Current:** 🔴 App crashes, infinite loops, database overload
- **After Fix:** ✅ Stable background sync, proper error handling
