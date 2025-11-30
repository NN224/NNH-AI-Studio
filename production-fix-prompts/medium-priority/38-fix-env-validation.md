# 🟡 Medium Priority: Environment Variable Validation

## Problem Summary

125 process.env usages found across 57 files. No validation at startup means missing env vars cause runtime errors instead of clear startup failures.

## Severity: 🟡 Medium Priority

- **Impact**: Unclear errors, debugging difficulty
- **Effort**: 2 hours
- **Risk**: Low-Medium

## Affected Files (Top 10)

```
app/api/features/profile/[locationId]/route.ts (10 env vars)
app/api/ai/chat/enhanced/route.ts (8 env vars)
app/api/diagnostics/ai-health/route.ts (8 env vars)
app/api/dashboard/overview/route.ts (7 env vars)
app/api/webhooks/gmb-notifications/route.ts (6 env vars)
app/api/youtube/oauth-callback/route.ts (6 env vars)
app/api/email/send/route.ts (5 env vars)
app/api/email/sendgrid/route.ts (5 env vars)
app/api/ai/generate/route.ts (4 env vars)
app/api/gmb/oauth-callback/route.ts (4 env vars)
```

## Current Code (Bad)

```typescript
// ❌ No validation - fails at runtime
const apiKey = process.env.OPENAI_API_KEY;
await openai.chat({ apiKey }); // Crashes if undefined
```

## Required Fix

```typescript
// lib/env.ts - Validate at startup
import { z } from "zod";

const envSchema = z.object({
  // Required
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // OAuth
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),

  // AI Providers (at least one required)
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),

  // Optional
  SENTRY_DSN: z.string().optional(),
  CRON_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    console.error(result.error.format());
    throw new Error("Invalid environment variables");
  }

  // Check at least one AI provider
  const env = result.data;
  if (!env.OPENAI_API_KEY && !env.ANTHROPIC_API_KEY && !env.GOOGLE_AI_API_KEY) {
    throw new Error("At least one AI provider API key is required");
  }

  return env;
}

export const env = validateEnv();
```

## Step-by-Step Fix

### Step 1: Create env validation file

Create `lib/env.ts` with Zod schema

### Step 2: Import in app entry

```typescript
// app/layout.tsx
import "@/lib/env"; // Validates on startup
```

### Step 3: Use validated env

```typescript
// Before
const key = process.env.OPENAI_API_KEY;

// After
import { env } from "@/lib/env";
const key = env.OPENAI_API_KEY;
```

### Step 4: Add type safety

```typescript
// env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    // ... all env vars
  }
}
```

## Acceptance Criteria

- [ ] Env validation file created
- [ ] All required env vars validated at startup
- [ ] Clear error messages for missing vars
- [ ] Type safety for env vars
- [ ] App fails fast on missing required vars

## Verification

```bash
# Remove a required env var and start app
# Should see clear error message, not runtime crash
npm run dev
```

## Status: ⏳ Pending
