# 🎯 Task: Complete Sentry Logger Integration for API Routes

## 📋 Context

You have successfully completed the logger integration for all `server/actions/*.ts` files. Now you need to complete the remaining API routes.

## ✅ What's Already Done

- ✅ `lib/utils/logger.ts` created with full Sentry integration
- ✅ All 18 files in `server/actions/` completed (0 console.error/warn remaining)
- ✅ Pre-configured loggers available: `gmbLogger`, `authLogger`, `apiLogger`, `syncLogger`, `reviewsLogger`, `postsLogger`, `questionsLogger`

## 🎯 Your Task

Replace all `console.error` and `console.warn` in `app/api/` directory with the logger utility.

**Remaining:** 413 console statements in ~50 files

## 📁 Priority Order

### Phase 1: GMB API Routes (Highest Priority)

Work on these files in order:

1. `app/api/gmb/oauth-callback/route.ts`
2. `app/api/gmb/sync-v2/route.ts`
3. `app/api/gmb/enqueue-sync/route.ts`
4. `app/api/gmb/scheduled-sync/route.ts`
5. All other `app/api/gmb/**/*.ts` files

### Phase 2: Webhooks

1. `app/api/webhooks/gmb-notifications/route.ts`
2. All other `app/api/webhooks/**/*.ts` files

### Phase 3: Other API Routes

1. `app/api/ai/**/*.ts`
2. `app/api/auth/**/*.ts`
3. `app/api/upload/**/*.ts`
4. All remaining `app/api/**/*.ts` files

## 🔧 Replacement Rules

### Rule 1: Import the Logger

Add at the top of each file:

```typescript
import { apiLogger } from "@/lib/utils/logger";
// Or use specific logger:
// import { gmbLogger } from '@/lib/utils/logger';
// import { authLogger } from '@/lib/utils/logger';
```

### Rule 2: Replace console.error

**Pattern 1: Error with object**

```typescript
// ❌ Before
console.error("[OAuth] Token exchange failed:", error);

// ✅ After
apiLogger.error(
  "Token exchange failed",
  error instanceof Error ? error : new Error(String(error)),
);
```

**Pattern 2: Error with context**

```typescript
// ❌ Before
console.error("[OAuth] Failed to save account:", error, { userId, accountId });

// ✅ After
apiLogger.error(
  "Failed to save account",
  error instanceof Error ? error : new Error(String(error)),
  { userId, accountId },
);
```

**Pattern 3: Error without error object**

```typescript
// ❌ Before
console.error("[OAuth] Invalid state parameter");

// ✅ After
apiLogger.error(
  "Invalid state parameter",
  new Error("Invalid state parameter"),
);
```

**Pattern 4: Error with response data**

```typescript
// ❌ Before
console.error("[OAuth] API error:", errorData);

// ✅ After
apiLogger.error("API error", new Error("API request failed"), { errorData });
```

### Rule 3: Replace console.warn

```typescript
// ❌ Before
console.warn("[OAuth] Token expiring soon", { expiresIn });

// ✅ After
apiLogger.warn("Token expiring soon", { expiresIn });
```

### Rule 4: Keep console.log and console.info

```typescript
// ✅ Leave these unchanged
console.log("[Debug] Processing request");
console.info("[Info] Sync started");
```

## ⚠️ Important Guidelines

1. **Always check error type:**

   ```typescript
   error instanceof Error ? error : new Error(String(error));
   ```

2. **Add useful context:**

   ```typescript
   apiLogger.error("Failed", error, { userId, accountId, locationId });
   ```

3. **Use appropriate logger:**
   - `apiLogger` - for general API routes
   - `gmbLogger` - for GMB-specific routes (`app/api/gmb/**`)
   - `authLogger` - for auth routes (`app/api/auth/**`)
   - `syncLogger` - for sync operations

4. **Remove prefix tags from messages:**

   ```typescript
   // ❌ Don't include [OAuth] in message
   apiLogger.error("[OAuth] Failed", error);

   // ✅ Clean message, context in data
   apiLogger.error("Failed", error, { module: "oauth" });
   ```

5. **Don't delete console.error - replace it:**
   The logger already includes console.error internally for development.

6. **Handle HTTP errors properly:**

   ```typescript
   // ❌ Before
   console.error("Request failed:", response.status);

   // ✅ After
   apiLogger.error("Request failed", new Error(`HTTP ${response.status}`), {
     status: response.status,
     url: response.url,
   });
   ```

## 📝 Example: Complete File Transformation

**Before:**

```typescript
// app/api/gmb/oauth-callback/route.ts
export async function GET(request: NextRequest) {
  try {
    const code = searchParams.get('code');

    if (!code) {
      console.error('[OAuth] Missing authorization code');
      return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    }

    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, { ... });

    if (!tokenResponse.ok) {
      console.error('[OAuth] Token exchange failed:', tokenResponse.status);
      return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }

  } catch (error) {
    console.error('[OAuth] Unexpected error:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
```

**After:**

```typescript
// app/api/gmb/oauth-callback/route.ts
import { gmbLogger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const code = searchParams.get('code');

    if (!code) {
      gmbLogger.error('Missing authorization code', new Error('Missing authorization code'));
      return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    }

    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, { ... });

    if (!tokenResponse.ok) {
      gmbLogger.error(
        'Token exchange failed',
        new Error(`HTTP ${tokenResponse.status}`),
        { status: tokenResponse.status }
      );
      return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }

  } catch (error) {
    gmbLogger.error(
      'Unexpected error in OAuth callback',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
```

## 🧪 Verification Commands

After completing each phase, run:

```bash
# Check remaining console.error/warn in app/api
grep -rn "console.error\|console.warn" --include="*.ts" app/api/ | grep -v "logger\." | wc -l

# Check specific folder (e.g., gmb)
grep -rn "console.error\|console.warn" --include="*.ts" app/api/gmb/ | grep -v "logger\."

# List all files that still need work
grep -rln "console.error\|console.warn" --include="*.ts" app/api/ | grep -v "logger\.ts"

# Verify no TypeScript errors
npx tsc --noEmit

# Verify no ESLint errors
npm run lint
```

## 📋 Progress Tracking

Update this as you complete each phase:

- [ ] Phase 1: GMB API Routes (app/api/gmb/\*_/_)
  - [x] oauth-callback/route.ts
  - [x] sync-v2/route.ts
  - [x] enqueue-sync/route.ts
  - [x] scheduled-sync/route.ts
  - [x] Other GMB routes
- [x] Phase 2: Webhooks (app/api/webhooks/\*_/_.ts)
- [x] Phase 3: AI Routes (app/api/ai/\*_/_.ts)
- [ ] Phase 4: Auth Routes (app/api/auth/\*_/_.ts)
- [ ] Phase 5: Upload Routes (app/api/upload/\*_/_.ts)
- [ ] Phase 6: Remaining Routes

## ✅ Final Checklist

When done, verify:

- [ ] No `console.error` outside logger.ts in app/api/
- [ ] No `console.warn` outside logger.ts in app/api/
- [ ] All imports are correct
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Context added to important errors (userId, accountId, etc.)

## 🎯 Success Criteria

Final command should return 0:

```bash
grep -rn "console.error\|console.warn" --include="*.ts" app/api/ | grep -v "logger\." | wc -l
```

## 🚀 Quick Start

1. Open first file: `app/api/gmb/oauth-callback/route.ts`
2. Add import: `import { gmbLogger } from '@/lib/utils/logger';`
3. Find all `console.error` and `console.warn`
4. Replace using patterns above
5. Test with: `npx tsc --noEmit`
6. Move to next file

---

**Start with:** `app/api/gmb/oauth-callback/route.ts`

**Expected time:** 2-3 hours for all API routes

**Current progress:** 35% complete (server/actions done)

**Remaining:** 413 console statements in ~50 files
