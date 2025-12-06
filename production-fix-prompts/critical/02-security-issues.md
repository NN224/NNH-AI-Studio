# 🚨 Critical: Security Issues

> **Priority:** P0 - Must Fix Before Production
> **Category:** Security & Best Practices

---

## 1. XSS Risk - dangerouslySetInnerHTML

### Issue

Using `dangerouslySetInnerHTML` without proper sanitization can lead to XSS attacks.

### File

`components/seo/landing-seo.tsx`

### Current Code (RISKY)

```tsx
<div dangerouslySetInnerHTML={{ __html: content }} />
```

### ✅ Solution

Use a sanitization library like DOMPurify:

```tsx
import DOMPurify from "dompurify";

// Sanitize before rendering
<div
  dangerouslySetInnerHTML={{
    __html: DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ["p", "br", "strong", "em", "a", "ul", "ol", "li"],
      ALLOWED_ATTR: ["href", "target", "rel"],
    }),
  }}
/>;
```

### Installation

```bash
npm install dompurify
npm install -D @types/dompurify
```

---

## 2. Environment Variables Without Validation

### Issue

Environment variables are used without validation, which can cause runtime errors.

### Affected Files (Top 10)

| File                                             | Unvalidated Env Vars |
| ------------------------------------------------ | -------------------- |
| `lib/ai/fallback-provider.ts`                    | 16                   |
| `app/api/features/profile/[locationId]/route.ts` | 10                   |
| `lib/ai/provider.ts`                             | 10                   |
| `app/api/ai/chat/enhanced/route.ts`              | 10                   |
| `app/api/diagnostics/ai-health/route.ts`         | 8                    |
| `app/api/dashboard/overview/route.ts`            | 7                    |

### ✅ Solution: Create Environment Validation

**Step 1: Create `lib/config/env.ts`**

```typescript
import { z } from "zod";

const envSchema = z.object({
  // Database
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Google APIs
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.string().url(),

  // AI Providers (optional)
  GROQ_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  TOGETHER_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  // Security - use regex for proper format validation
  CSRF_SECRET: z
    .string()
    .min(32)
    .regex(/^[a-zA-Z0-9+/=]+$/, "Must be base64 encoded"),
  ENCRYPTION_KEY: z
    .string()
    .length(64)
    .regex(/^[a-fA-F0-9]+$/, "Must be 32 bytes hex encoded (64 chars)"),

  // Redis (optional for rate limiting)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
});

// Validate at startup
export const env = envSchema.parse(process.env);

// Type-safe environment access
export type Env = z.infer<typeof envSchema>;
```

**Step 2: Use validated env throughout the app**

```typescript
import { env } from "@/lib/config/env";

// Instead of:
const apiKey = process.env.OPENAI_API_KEY;

// Use:
const apiKey = env.OPENAI_API_KEY;
```

---

## 3. Empty Catch Blocks

### Issue

Empty catch blocks swallow errors silently, making debugging impossible.

### Affected Files

| File                                     | Empty Catches |
| ---------------------------------------- | ------------- |
| `app/api/diagnostics/gmb-api/route.ts`   | 7             |
| `app/api/diagnostics/ai-health/route.ts` | 4             |
| `server/actions/questions-management.ts` | 4             |
| `server/actions/reviews-management.ts`   | 4             |

### ✅ Solution

Add proper error logging:

```typescript
// ❌ BAD: Empty catch
try {
  await someOperation();
} catch {
  // Silently swallowed
}

// ✅ GOOD: Log and handle errors
import { apiLogger } from "@/lib/utils/logger";

try {
  await someOperation();
} catch (error) {
  apiLogger.error("Operation failed", { error, context: "someOperation" });
  // Re-throw if needed, or return graceful fallback
}
```

---

## 4. Throw Errors Without Handling

### Issue

Throwing errors without proper try-catch blocks can crash the application.

### Affected Files (Top 10)

| File                                            | Unhandled Throws |
| ----------------------------------------------- | ---------------- |
| `app/api/diagnostics/oauth-advanced/route.ts`   | 6                |
| `app/[locale]/(dashboard)/locations/actions.ts` | 5                |
| `app/api/ai/chat/stream/route.ts`               | 4                |
| `app/api/ai/generate/route.ts`                  | 4                |

### ✅ Solution: Wrap in Try-Catch

```typescript
// ❌ BAD: Unhandled throw
export async function GET() {
  const data = await fetchData();
  if (!data) {
    throw new Error("No data found");
  }
  return NextResponse.json(data);
}

// ✅ GOOD: Proper error handling
export async function GET() {
  try {
    const data = await fetchData();
    if (!data) {
      return NextResponse.json({ error: "No data found" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error) {
    apiLogger.error("GET request failed", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

---

## 5. Unsafe Type Casting

### Issue

Using `as unknown as Type` bypasses TypeScript's type checking.

### Affected Files

| File                                      | Unsafe Casts |
| ----------------------------------------- | ------------ |
| `server/actions/reviews.ts`               | 2            |
| `app/[locale]/home/page.tsx`              | 1            |
| `app/api/ai/actions/batch-reply/route.ts` | 1            |
| `hooks/use-products.ts`                   | 1            |
| `hooks/use-services.ts`                   | 1            |
| `lib/security/tenant-isolation.ts`        | 1            |

### ✅ Solution: Use Proper Type Guards

```typescript
// ❌ BAD: Unsafe casting
const data = response as unknown as MyType;

// ✅ GOOD: Type guard with Zod
import { z } from "zod";

const MyTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  // ... other fields
});

type MyType = z.infer<typeof MyTypeSchema>;

const result = MyTypeSchema.safeParse(response);
if (result.success) {
  const data: MyType = result.data;
  // Use data safely
} else {
  console.error("Invalid data:", result.error);
}
```

---

## 📋 Checklist

- [ ] Install DOMPurify and sanitize all `dangerouslySetInnerHTML` usage
- [ ] Create environment validation with Zod
- [ ] Add error logging to empty catch blocks
- [ ] Wrap throw statements in try-catch
- [ ] Replace unsafe type casts with type guards

---

## ⚠️ Security Impact

| Issue                           | Risk Level | Impact          |
| ------------------------------- | ---------- | --------------- |
| XSS via dangerouslySetInnerHTML | 🔴 High    | User data theft |
| Unvalidated env vars            | 🟠 Medium  | Runtime crashes |
| Empty catch blocks              | 🟡 Low     | Silent failures |
| Unhandled throws                | 🟠 Medium  | App crashes     |
| Unsafe type casts               | 🟡 Low     | Type mismatches |

---

_Fix Time: ~2-4 hours total_
