# 🔴 CRITICAL FIX: RLS Bypass في API Routes

> ⚠️ **قبل البدء:** اقرأ `AI_AGENT_START_HERE.md` أولاً! اقرأ الملف المستهدف كاملاً قبل أي تعديل.

> **الأولوية:** P0 - حرج
> **الوقت المقدر:** 4 ساعات
> **المجال:** أمان

---

## 📋 ملخص المشكلة

**Issue ID:** CRITICAL-014
**Severity:** 🔴 CRITICAL - DATA BREACH RISK
**Impact:** تجاوز أمان قاعدة البيانات

---

## 🎯 المشكلة بالتفصيل

بعض الـ API routes تستخدم `createAdminClient()` بدون مبرر:

1. الـ Admin client يتجاوز Row Level Security (RLS)
2. يمكن الوصول لبيانات مستخدمين آخرين
3. يمكن تعديل/حذف بيانات بدون صلاحية

---

## 📁 الملفات المتأثرة

```
app/api/gmb/sync-v2/route.ts          # مبرر (internal)
app/api/gmb/oauth-callback/route.ts   # مبرر (no session)
app/api/locations/route.ts            # ❌ يجب مراجعة
app/api/reviews/route.ts              # ❌ يجب مراجعة
app/api/questions/route.ts            # ❌ يجب مراجعة
```

---

## 🐛 الكود الحالي (المعطوب)

```typescript
// ❌ مثال على استخدام خاطئ
// app/api/locations/route.ts
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  // ❌ يستخدم admin client بدون سبب!
  const supabase = createAdminClient();

  // ❌ يمكن الوصول لجميع المواقع بدون RLS!
  const { data } = await supabase.from("gmb_locations").select("*");

  return Response.json(data);
}
```

**لماذا هذا خطير:**

- المستخدم A يمكنه رؤية بيانات المستخدم B
- يمكن تعديل بيانات الآخرين
- يمكن حذف بيانات الآخرين
- انتهاك خصوصية البيانات

---

## ✅ الحل المطلوب

### Step 1: قواعد استخدام Admin Client

```typescript
// lib/supabase/server.ts

/**
 * Creates a Supabase client with user session (RLS enforced).
 * USE THIS FOR ALL USER-FACING OPERATIONS.
 */
export async function createClient() {
  // ... existing implementation
}

/**
 * Creates a Supabase admin client (RLS bypassed).
 *
 * ⚠️ SECURITY WARNING: Only use for:
 * 1. Internal system operations (cron jobs, webhooks)
 * 2. Operations where user session is unavailable (OAuth callbacks)
 * 3. Cross-user operations that are properly authorized
 *
 * ❌ NEVER use for:
 * - User-facing API endpoints
 * - Any operation where createClient() would work
 * - Reading/writing user data without explicit authorization
 */
export function createAdminClient() {
  // Add warning in development
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[SECURITY] createAdminClient() called. " +
        "Ensure this is intentional and properly authorized.",
    );
  }

  // ... existing implementation
}
```

### Step 2: إنشاء Audit Helper

```typescript
// lib/security/rls-audit.ts

/**
 * List of API routes that are ALLOWED to use createAdminClient.
 * Any other usage should be reviewed and justified.
 */
export const ALLOWED_ADMIN_CLIENT_ROUTES = [
  // OAuth callbacks - no user session available
  "/api/gmb/oauth-callback",
  "/api/youtube/oauth-callback",
  "/api/auth/callback",

  // Internal endpoints - authenticated via secret
  "/api/gmb/sync-v2",
  "/api/cron/",
  "/api/webhooks/",

  // Admin-only endpoints
  "/api/admin/",
] as const;

/**
 * Checks if a route is allowed to use admin client.
 */
export function isAdminClientAllowed(pathname: string): boolean {
  return ALLOWED_ADMIN_CLIENT_ROUTES.some((allowed) =>
    pathname.startsWith(allowed),
  );
}

/**
 * Logs admin client usage for audit trail.
 */
export function logAdminClientUsage(
  pathname: string,
  operation: string,
  userId?: string,
): void {
  console.log("[AUDIT] Admin client used:", {
    pathname,
    operation,
    userId,
    timestamp: new Date().toISOString(),
    allowed: isAdminClientAllowed(pathname),
  });

  // In production, send to audit log
  if (process.env.NODE_ENV === "production") {
    // Send to Sentry or audit service
  }
}
```

### Step 3: تحديث API Routes

```typescript
// ✅ الطريقة الصحيحة
// app/api/locations/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  // ✅ استخدم createClient (مع RLS)
  const supabase = await createClient();

  // ✅ تحقق من المستخدم
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ✅ RLS سيفلتر تلقائياً حسب user_id
  const { data, error } = await supabase.from("gmb_locations").select("*");

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 },
    );
  }

  return NextResponse.json(data);
}
```

### Step 4: حالات مبررة لاستخدام Admin Client

```typescript
// ✅ حالة مبررة: OAuth Callback
// app/api/gmb/oauth-callback/route.ts
import { createAdminClient } from "@/lib/supabase/server";
import { logAdminClientUsage } from "@/lib/security/rls-audit";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state");

  // ✅ مبرر: لا يوجد session cookie في OAuth callback
  // بسبب cross-site redirect و SameSite cookies
  const adminClient = createAdminClient();

  // Log for audit
  logAdminClientUsage("/api/gmb/oauth-callback", "verify_state");

  // Verify state from oauth_states table
  const { data: stateRecord } = await adminClient
    .from("oauth_states")
    .select("user_id")
    .eq("state", state)
    .single();

  // ... rest of implementation
}
```

```typescript
// ✅ حالة مبررة: Internal Sync
// app/api/gmb/sync-v2/route.ts
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  // ✅ تحقق من internal auth أولاً
  const authHeader = request.headers.get("authorization");
  const internalSecret = process.env.INTERNAL_API_SECRET;

  if (!internalSecret || authHeader !== `Bearer ${internalSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ✅ مبرر: هذا endpoint داخلي ومحمي بـ secret
  const adminClient = createAdminClient();

  // ... sync implementation
}
```

### Step 5: ESLint Rule للتحقق

```javascript
// eslint-rules/no-unauthorized-admin-client.js
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Warn when createAdminClient is used",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.name === "createAdminClient" ||
          (node.callee.property &&
            node.callee.property.name === "createAdminClient")
        ) {
          context.report({
            node,
            message:
              "createAdminClient() bypasses RLS. Ensure this is intentional and add a comment explaining why.",
          });
        }
      },
    };
  },
};
```

---

## 🔍 خطوات التنفيذ

### Step 1: Audit جميع استخدامات Admin Client

```bash
# ابحث عن جميع الاستخدامات
grep -r "createAdminClient" app/api/

# راجع كل واحد وحدد إذا كان مبرراً
```

### Step 2: إنشاء قائمة بالـ Routes المبررة

```bash
# أنشئ ملف للتوثيق
touch docs/ADMIN_CLIENT_USAGE.md
```

### Step 3: تحديث الـ Routes غير المبررة

```bash
# استبدل createAdminClient بـ createClient
# أضف auth check
# تأكد من أن RLS policies موجودة
```

### Step 4: اختبار RLS

```bash
# تأكد من أن المستخدم A لا يمكنه رؤية بيانات المستخدم B
```

---

## ✅ معايير القبول

قبل وضع علامة "مكتمل"، تأكد من:

- [ ] تم مراجعة جميع استخدامات `createAdminClient`
- [ ] تم توثيق الاستخدامات المبررة
- [ ] تم استبدال الاستخدامات غير المبررة بـ `createClient`
- [ ] جميع الـ user-facing routes تستخدم `createClient`
- [ ] تم إضافة auth check لجميع الـ routes
- [ ] RLS policies موجودة لجميع الجداول
- [ ] تم اختبار أن المستخدم لا يمكنه الوصول لبيانات الآخرين
- [ ] لا توجد أخطاء TypeScript: `npx tsc --noEmit`
- [ ] لا توجد أخطاء Lint: `npm run lint`

---

## 🧪 اختبار الحل

### Test 1: RLS Enforcement

```typescript
// tests/security/rls.test.ts
describe("RLS Enforcement", () => {
  it("should not allow user A to see user B locations", async () => {
    // Login as user A
    const userA = await loginAs("user-a@test.com");

    // Try to fetch user B's location directly
    const { data, error } = await userA.supabase
      .from("gmb_locations")
      .select("*")
      .eq("user_id", "user-b-id");

    // Should return empty (RLS blocks it)
    expect(data).toHaveLength(0);
  });
});
```

### Test 2: API Route Protection

```bash
# Login as user A, try to access user B's data
curl http://localhost:3000/api/locations?user_id=user-b-id \
  -H "Cookie: sb-access-token=user-a-token"

# Should return only user A's data, not user B's
```

---

## 🚨 تحذيرات مهمة

### ⛔ ممنوع:

- استخدام `createAdminClient` في user-facing routes
- تجاوز RLS بدون سبب مبرر وموثق
- الوصول لبيانات مستخدمين آخرين

### ✅ مطلوب:

- `createClient` لجميع user-facing operations
- Auth check في كل route
- RLS policies على كل جدول
- Audit logging لاستخدام admin client

---

## 📚 مراجع

- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP Access Control](https://cheatsheetseries.owasp.org/cheatsheets/Access_Control_Cheat_Sheet.html)

---

**Status:** 🔴 NOT STARTED
**Blocked By:** None
**Blocks:** Production deployment

---

**هذا إصلاح أمني حرج. RLS bypass يعني data breach!** 🔒
