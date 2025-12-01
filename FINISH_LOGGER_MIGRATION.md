# 🎯 Finish Logger Migration - app/api/ Routes

## ✅ Status

- ✅ **server/actions/** - 100% Complete
- ✅ **app/api/gmb/** - 100% Complete
- ✅ **app/api/webhooks/** - 100% Complete
- ✅ **app/api/ai/** - 95% Complete
- ✅ **server/services/activity.ts** - 100% Complete
- ⏳ **app/api/** (other routes) - **214 console.error/warn remaining**

---

## 🎯 Your Task

Replace all remaining `console.error` and `console.warn` in `app/api/` with logger calls.

**Remaining:** 214 console statements in 75 files

---

## 📁 Priority Files (Top 20)

Work on these files in order (they contain 60% of remaining console statements):

1. `app/api/settings/route.ts` - 9 console.error
2. `app/api/locations/route.ts` - 8 console.error
3. `app/api/locations/[id]/activity/route.ts` - 7 console.error
4. `app/api/youtube/videos/upload/route.ts` - 6 console.error + 1 console.warn
5. `app/api/upload/image/route.ts` - 6 console.error
6. `app/api/upload/bulk/route.ts` - 6 console.error
7. `app/api/monitoring/alerts/route.ts` - 6 console.error
8. `app/api/locations/labels/route.ts` - 6 console.error
9. `app/api/locations/bulk-sync/route.ts` - 6 console.error
10. `app/api/locations/[id]/route.ts` - 6 console.error
11. `app/api/newsletter/route.ts` - 5 console.error
12. `app/api/locations/competitor-data/route.ts` - 5 console.error
13. `app/api/locations/bulk-publish/route.ts` - 5 console.error
14. `app/api/locations/[id]/branding/route.ts` - 5 console.error + 1 console.warn
15. `app/api/cron/process-questions/route.ts` - 5 console.error
16. `app/api/settings/ai/route.ts` - 4 console.error
17. `app/api/settings/ai/[id]/route.ts` - 4 console.error
18. `app/api/monitoring/metrics/route.ts` - 4 console.error
19. `app/api/locations/stats/route.ts` - 4 console.error
20. `app/api/locations/bulk-label/route.ts` - 4 console.error

---

## 🔧 Replacement Patterns

### Pattern 1: Single-line console.error with message and error

```typescript
// ❌ Before
console.error("[Settings API] Failed to fetch accounts:", accountsError);

// ✅ After
apiLogger.error(
  "Failed to fetch accounts",
  accountsError instanceof Error
    ? accountsError
    : new Error(String(accountsError)),
  { userId: user.id },
);
```

### Pattern 2: Multi-line console.error

```typescript
// ❌ Before
console.error("[Settings API] Failed to fetch client profile:", profileError);

// ✅ After
apiLogger.error(
  "Failed to fetch client profile",
  profileError instanceof Error
    ? profileError
    : new Error(String(profileError)),
  { userId: user.id },
);
```

### Pattern 3: console.error with just message

```typescript
// ❌ Before
console.error("[Settings API] Unexpected error:", error);

// ✅ After
apiLogger.error(
  "Unexpected error",
  error instanceof Error ? error : new Error(String(error)),
  {
    userId: user.id,
  },
);
```

### Pattern 4: console.warn

```typescript
// ❌ Before
console.warn("[Upload] File size exceeds limit", { size, limit });

// ✅ After
apiLogger.warn("File size exceeds limit", { size, limit });
```

---

## ⚠️ Important Rules

### 1. Always add logger import

```typescript
import { apiLogger } from "@/lib/utils/logger";
```

### 2. Remove [Tag] prefixes from messages

```typescript
// ❌ Don't include [Settings API] in message
apiLogger.error("[Settings API] Failed", error);

// ✅ Clean message
apiLogger.error("Failed", error);
```

### 3. Add context when available

```typescript
// ✅ Good - includes context
apiLogger.error("Failed to fetch accounts", error, {
  userId: user.id,
  accountId,
});

// ⚠️ OK - but less useful
apiLogger.error("Failed to fetch accounts", error);
```

### 4. Handle error types properly

```typescript
// ✅ Always check if error is Error instance
error instanceof Error ? error : new Error(String(error));
```

### 5. Keep console.log and console.info

```typescript
// ✅ Leave these unchanged
console.log("[Debug] Processing request");
console.info("[Info] Sync started");
```

---

## 📝 Example: Complete File

### Before:

```typescript
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("accounts").select();

    if (error) {
      console.error("[API] Failed to fetch:", error);
      return NextResponse.json({ error: "Failed" }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[API] Unexpected error:", err);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
```

### After:

```typescript
import { createClient } from "@/lib/supabase/server";
import { apiLogger } from "@/lib/utils/logger";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("accounts").select();

    if (error) {
      apiLogger.error(
        "Failed to fetch accounts",
        error instanceof Error ? error : new Error(String(error)),
      );
      return NextResponse.json({ error: "Failed" }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    apiLogger.error(
      "Unexpected error",
      err instanceof Error ? err : new Error(String(err)),
    );
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
```

---

## 🧪 Verification

After completing each file, verify:

```bash
# Check specific file
grep -n "console.error\|console.warn" app/api/settings/route.ts | grep -v "logger\."

# Should return 0 or only comments
```

---

## ✅ Final Checklist

After completing all files:

- [ ] All 75 files processed
- [ ] Logger import added to each file
- [ ] All console.error replaced with apiLogger.error
- [ ] All console.warn replaced with apiLogger.warn
- [ ] Context added where available (userId, accountId, etc.)
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] No remaining console statements:

```bash
grep -rn "console.error\|console.warn" --include="*.ts" app/api/ | grep -v "logger\." | wc -l
# Should return: 0
```

---

## 🎯 Success Criteria

```bash
# Final verification command
grep -rn "console.error\|console.warn" --include="*.ts" app/api/ | grep -v "logger\."

# Expected result: 0 matches (or only commented lines)
```

---

## 📊 Progress Tracking

Update as you complete files:

### Top 20 Files:

- [ ] app/api/settings/route.ts (9)
- [ ] app/api/locations/route.ts (8)
- [ ] app/api/locations/[id]/activity/route.ts (7)
- [ ] app/api/youtube/videos/upload/route.ts (6+1)
- [ ] app/api/upload/image/route.ts (6)
- [ ] app/api/upload/bulk/route.ts (6)
- [ ] app/api/monitoring/alerts/route.ts (6)
- [ ] app/api/locations/labels/route.ts (6)
- [ ] app/api/locations/bulk-sync/route.ts (6)
- [ ] app/api/locations/[id]/route.ts (6)
- [ ] app/api/newsletter/route.ts (5)
- [ ] app/api/locations/competitor-data/route.ts (5)
- [ ] app/api/locations/bulk-publish/route.ts (5)
- [ ] app/api/locations/[id]/branding/route.ts (5+1)
- [ ] app/api/cron/process-questions/route.ts (5)
- [ ] app/api/settings/ai/route.ts (4)
- [ ] app/api/settings/ai/[id]/route.ts (4)
- [ ] app/api/monitoring/metrics/route.ts (4)
- [ ] app/api/locations/stats/route.ts (4)
- [ ] app/api/locations/bulk-label/route.ts (4)

### Remaining 55 Files:

- [ ] Complete remaining files (see full list with: `grep -rln "console.error\|console.warn" --include="*.ts" app/api/ | grep -v "logger.ts"`)

---

**Estimated Time:** 2-3 hours for all 75 files

**Current Progress:** 0/75 files (0%)

**Start with:** `app/api/settings/route.ts`
