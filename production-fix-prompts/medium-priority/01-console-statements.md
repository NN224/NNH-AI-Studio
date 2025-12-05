# 🟠 Medium Priority: Console Statements

> **Priority:** P2 - Important but not urgent
> **Count:** ~84 instances
> **Impact:** Performance, security (info leakage), code cleanliness

---

## Overview

Console statements in production code can:

- Expose sensitive information in browser console
- Impact performance (especially console.log in loops)
- Make logs noisy and harder to debug in production
- Indicate incomplete error handling

---

## 📊 Files with Most Console Statements

| File                                             | Count | Priority       |
| ------------------------------------------------ | ----- | -------------- |
| `lib/hooks/useOAuthCallbackHandler.ts`           | 10    | 🔴 High        |
| `lib/hooks/useAccountsManagement.ts`             | 10    | 🔴 High        |
| `app/api/features/profile/[locationId]/route.ts` | 7     | 🔴 High        |
| `lib/services/pending-actions-service.ts`        | 3     | 🟠 Medium      |
| `lib/utils/logger.ts`                            | 2     | ⚪ Intentional |
| `lib/services/analytics-realtime-service.ts`     | 2     | 🟠 Medium      |
| `lib/services/ai-question-answer-service.ts`     | 2     | 🟠 Medium      |
| `lib/monitoring/metrics.ts`                      | 2     | 🟡 Low         |
| `lib/monitoring/dashboard-performance.ts`        | 2     | 🟡 Low         |
| `components/features/business-hours-display.tsx` | 2     | 🟡 Low         |
| `app/api/locations/[id]/activity/route.ts`       | 2     | 🟡 Low         |
| `app/[locale]/admin/auth/page.tsx`               | 2     | 🟡 Low         |

---

## ✅ Solution: Replace with Proper Logger

### Step 1: Import the Logger

```typescript
// Use the existing logger from lib/utils/logger.ts
import {
  apiLogger,
  authLogger,
  gmbLogger,
  reviewsLogger,
} from "@/lib/utils/logger";

// Or for components/hooks
import { createLogger } from "@/lib/utils/logger";
const logger = createLogger("ComponentName");
```

### Step 2: Replace Console Calls

```typescript
// ❌ BEFORE
console.log("Fetching data...", { userId, locationId });
console.error("Failed to fetch:", error);

// ✅ AFTER
logger.debug("Fetching data", { userId, locationId });
logger.error("Failed to fetch", { error: error.message });
```

---

## 🛠️ File-by-File Fixes

### 1. `lib/hooks/useOAuthCallbackHandler.ts` (10 console.log)

```typescript
// ❌ CURRENT
console.log("OAuth callback started");
console.log("Processing tokens:", { hasAccessToken: !!tokens.access_token });
console.error("OAuth error:", error);

// ✅ FIX
import { authLogger } from "@/lib/utils/logger";

authLogger.info("OAuth callback started");
// Note: Avoid logging token existence in production - shown here for dev debugging only
if (process.env.NODE_ENV === "development") {
  authLogger.debug("Processing tokens", { tokenReceived: true });
}
authLogger.error("OAuth error", { error: error.message, code: error.code });
```

### 2. `lib/hooks/useAccountsManagement.ts` (10 console.log)

```typescript
// ❌ CURRENT
console.log("Fetching accounts...");
console.log("Found accounts:", accounts.length);
console.error("Failed to load accounts:", error);

// ✅ FIX
import { gmbLogger } from "@/lib/utils/logger";

gmbLogger.debug("Fetching accounts");
gmbLogger.info("Found accounts", { count: accounts.length });
gmbLogger.error("Failed to load accounts", { error: error.message });
```

### 3. `app/api/features/profile/[locationId]/route.ts` (7 console.log)

```typescript
// ❌ CURRENT
console.log("[Profile API] Updating location:", locationId);
console.error("[Profile API] Error:", error);

// ✅ FIX
import { apiLogger } from "@/lib/utils/logger";

apiLogger.info("Updating location", { locationId, action: "profile_update" });
apiLogger.error("Profile update failed", {
  locationId,
  error: error.message,
  stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
});
```

### 4. `lib/services/pending-actions-service.ts` (3 console.log)

```typescript
// ❌ CURRENT
console.log("Processing pending action:", action.id);
console.error("Action failed:", error);

// ✅ FIX
import { createLogger } from "@/lib/utils/logger";
const pendingActionsLogger = createLogger("PendingActions");

pendingActionsLogger.debug("Processing pending action", {
  actionId: action.id,
  type: action.type,
});
pendingActionsLogger.error("Action failed", {
  actionId: action.id,
  error: error.message,
});
```

---

## 📝 Logger Usage Patterns

### For API Routes

```typescript
import { apiLogger } from "@/lib/utils/logger";

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();

  apiLogger.info("GET request received", {
    path: request.url,
    requestId,
  });

  try {
    // ... handle request
    apiLogger.info("GET request completed", { requestId, statusCode: 200 });
  } catch (error) {
    apiLogger.error("GET request failed", {
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
```

### For Hooks

```typescript
import { createLogger } from "@/lib/utils/logger";

const hookLogger = createLogger("useMyHook");

export function useMyHook() {
  const [state, setState] = useState(null);

  useEffect(() => {
    hookLogger.debug("Hook initialized");

    return () => {
      hookLogger.debug("Hook cleanup");
    };
  }, []);

  // ...
}
```

### For Components (Development Only)

```typescript
import { createLogger } from "@/lib/utils/logger";

const componentLogger = createLogger("MyComponent");

export function MyComponent() {
  // Only log in development
  if (process.env.NODE_ENV === "development") {
    componentLogger.debug("Component rendered", { props: someProps });
  }

  // ...
}
```

---

## ⚠️ Special Cases

### Allowed Console Usage

These files intentionally use console:

1. **`lib/utils/logger.ts`** - The logger itself uses console internally
2. **Error boundaries** - May need console.error for error reporting
3. **Development-only code** - Wrapped in `if (process.env.NODE_ENV === 'development')`

### Converting console.warn/error

```typescript
// Keep console.warn → logger.warn
// Keep console.error → logger.error

// These are allowed by ESLint config but should still use logger
```

---

## 🔧 Quick Fix Script

Create a temporary script to find all console statements:

```bash
# Find all console.log statements
grep -rn "console\.log" app/ lib/ components/ hooks/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".test."

# Find all console statements
grep -rn "console\." app/ lib/ components/ hooks/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".test."
```

---

## ✅ Acceptance Criteria

- [ ] No `console.log` in production code
- [ ] All logging uses `@/lib/utils/logger`
- [ ] Sensitive data not logged (tokens, passwords, etc.)
- [ ] Log levels used appropriately:
  - `debug` - Development info
  - `info` - Important events
  - `warn` - Potential issues
  - `error` - Actual errors
- [ ] ESLint `no-console` rule passes (warnings only for console.warn/error)

---

## 📋 Checklist

- [ ] `lib/hooks/useOAuthCallbackHandler.ts` (10 → 0)
- [ ] `lib/hooks/useAccountsManagement.ts` (10 → 0)
- [ ] `app/api/features/profile/[locationId]/route.ts` (7 → 0)
- [ ] `lib/services/pending-actions-service.ts` (3 → 0)
- [ ] `lib/services/analytics-realtime-service.ts` (2 → 0)
- [ ] `lib/services/ai-question-answer-service.ts` (2 → 0)
- [ ] `lib/monitoring/metrics.ts` (2 → 0)
- [ ] `lib/monitoring/dashboard-performance.ts` (2 → 0)
- [ ] `components/features/business-hours-display.tsx` (2 → 0)
- [ ] `app/api/locations/[id]/activity/route.ts` (2 → 0)
- [ ] `app/[locale]/admin/auth/page.tsx` (2 → 0)
- [ ] All other files with console statements

---

_Estimated Fix Time: 2-3 hours_
