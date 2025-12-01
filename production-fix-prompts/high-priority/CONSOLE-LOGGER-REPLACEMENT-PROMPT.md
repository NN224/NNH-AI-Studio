# 🤖 AI Agent Prompt - Complete Console Error/Warn Replacement

## Task

Replace all `console.error` and `console.warn` calls with a centralized logger that integrates with Sentry for error tracking.

---

## Logger Location

`/lib/utils/logger.ts` - Already created with these exports:

| Logger            | Use For                 |
| ----------------- | ----------------------- |
| `logger`          | Default/general logging |
| `gmbLogger`       | GMB-related code        |
| `authLogger`      | Auth-related code       |
| `apiLogger`       | API-related code        |
| `syncLogger`      | Sync-related code       |
| `reviewsLogger`   | Reviews-related code    |
| `postsLogger`     | Posts-related code      |
| `questionsLogger` | Questions-related code  |
| `aiLogger`        | AI-related code         |

---

## Replacement Patterns

### For console.error:

```typescript
// ❌ Before:
console.error("Error message:", error);

// ✅ After:
logger.error(
  "Error message",
  error instanceof Error ? error : new Error(String(error)),
);

// ✅ With context:
logger.error(
  "Error message",
  error instanceof Error ? error : new Error(String(error)),
  {
    userId,
    locationId,
  },
);
```

### For console.warn:

```typescript
// ❌ Before:
console.warn("Warning message:", data);

// ✅ After:
logger.warn("Warning message", { data });

// ⚠️ IMPORTANT: warn() does NOT take an Error object as second argument!
```

---

## CRITICAL Rules

1. **`logger.error()` signature:** `(message: string, error?: Error, context?: object)` - 3 args max
2. **`logger.warn()` signature:** `(message: string, context?: object)` - 2 args only, NO Error!
3. **Always wrap unknown errors:** `error instanceof Error ? error : new Error(String(error))`
4. **Import at TOP of file:** `import { logger } from "@/lib/utils/logger";`
5. **Choose appropriate logger** based on file context (gmbLogger for GMB files, authLogger for auth, etc.)
6. **Remove colons from messages:** Change `"Error:"` to `"Error"` (no trailing colon)

---

## Files to Process

Run this command to get the remaining files:

```bash
grep -rln "console.error\|console.warn" --include="*.tsx" components/ | grep -v node_modules
```

---

## Current Status

| Directory            | Status      | Remaining |
| -------------------- | ----------- | --------- |
| ✅ `lib/`            | Complete    | 0         |
| ✅ `server/actions/` | Complete    | 0         |
| ✅ `app/api/`        | Complete    | 0         |
| ✅ `hooks/`          | Complete    | 0         |
| 🔄 `components/`     | In Progress | ~58 files |

---

## DO NOT TOUCH

- `/lib/utils/logger.ts` - This IS the logger
- `/lib/services/global-error-handlers.ts` - Intentional console.error override for React hydration detection
- Any `console.log` or `console.info` - Only replace `error` and `warn`

---

## Example Transformations

### Example 1: Simple error

```typescript
// Before
} catch (error) {
  console.error("Failed to fetch data:", error);
}

// After
import { logger } from "@/lib/utils/logger";
// ...
} catch (error) {
  logger.error("Failed to fetch data", error instanceof Error ? error : new Error(String(error)));
}
```

### Example 2: GMB-related error

```typescript
// Before
console.error("Error syncing locations:", err);

// After
import { gmbLogger } from "@/lib/utils/logger";
// ...
gmbLogger.error(
  "Error syncing locations",
  err instanceof Error ? err : new Error(String(err)),
);
```

### Example 3: Warning with context

```typescript
// Before
console.warn("User not found:", userId);

// After
import { authLogger } from "@/lib/utils/logger";
// ...
authLogger.warn("User not found", { userId });
```

### Example 4: Auth error

```typescript
// Before
console.error("Sign out error:", error);

// After
import { authLogger } from "@/lib/utils/logger";
// ...
authLogger.error(
  "Sign out error",
  error instanceof Error ? error : new Error(String(error)),
);
```

---

## Verification Steps

After completing all replacements:

1. **Check TypeScript:**

   ```bash
   npx tsc --noEmit 2>&1 | grep -E "error TS"
   ```

2. **Verify no console.error/warn remaining:**

   ```bash
   grep -rln "console.error\|console.warn" --include="*.tsx" components/ | wc -l
   # Should output: 0
   ```

3. **Fix any lint errors in modified files**

---

## Common Mistakes to Avoid

❌ **Wrong:** `logger.warn("Message", error)` - warn doesn't take Error
✅ **Right:** `logger.warn("Message", { error: String(error) })`

❌ **Wrong:** `logger.error("Message:", error, { context })` - 3 args with colon
✅ **Right:** `logger.error("Message", error, { context })` - no colon

❌ **Wrong:** Importing logger inside function
✅ **Right:** Import at top of file with other imports
