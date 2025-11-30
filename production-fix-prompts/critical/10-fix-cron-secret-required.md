# 🔴 CRITICAL FIX: CRON_SECRET غير إلزامي

> **الأولوية:** P0 - حرج
> **الوقت المقدر:** 2 ساعات
> **المجال:** أمان

---

## 📋 ملخص المشكلة

**Issue ID:** CRITICAL-010
**Severity:** 🔴 CRITICAL - SECURITY VULNERABILITY
**Impact:** أي شخص يمكنه تنفيذ cron jobs بدون authentication

---

## 🎯 المشكلة بالتفصيل

الـ Cron endpoints تتحقق من `CRON_SECRET` لكن:

1. إذا `CRON_SECRET` غير معرف، الشرط يمر!
2. `CRON_SECRET` غير موثق في `.env.example`
3. المطورون قد ينسون إضافته في Production

---

## 📁 الملفات المتأثرة

```
app/api/cron/process-questions/route.ts
app/api/cron/cleanup/route.ts
app/api/gmb/scheduled-sync/route.ts
.env.example                           # يجب إضافة CRON_SECRET
```

---

## 🐛 الكود الحالي (المعطوب)

```typescript
// app/api/cron/process-questions/route.ts
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // ❌ BUG: إذا cronSecret undefined، الشرط يصبح:
  // undefined && authHeader !== "Bearer undefined" = false
  // مما يعني أن الـ check يمر!
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // يتم تنفيذ الـ cron job بدون auth!
}
```

**لماذا هذا خطير:**

- أي شخص يمكنه استدعاء `/api/cron/process-questions`
- يمكن استنزاف موارد السيرفر
- يمكن إرسال spam للمستخدمين
- يمكن التلاعب بالبيانات

---

## ✅ الحل المطلوب

### Step 1: إنشاء utility function للتحقق

```typescript
// lib/security/cron-auth.ts
/**
 * Validates cron job authentication.
 *
 * @security CRITICAL - This function MUST:
 * 1. Require CRON_SECRET to be defined
 * 2. Fail CLOSED if secret is missing
 * 3. Use constant-time comparison
 *
 * @throws {Error} If CRON_SECRET is not configured
 */
export function validateCronAuth(request: Request): {
  isValid: boolean;
  error?: string;
} {
  const cronSecret = process.env.CRON_SECRET;

  // FAIL CLOSED: Secret MUST be configured
  if (!cronSecret) {
    console.error(
      "[SECURITY CRITICAL] CRON_SECRET is not configured! " +
        "All cron endpoints are BLOCKED until this is fixed.",
    );
    return {
      isValid: false,
      error: "Server configuration error. Cron jobs are disabled.",
    };
  }

  // Validate minimum secret length
  if (cronSecret.length < 32) {
    console.error(
      "[SECURITY WARNING] CRON_SECRET is too short. " +
        "Use at least 32 characters for security.",
    );
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return {
      isValid: false,
      error: "Missing authorization header",
    };
  }

  // Extract token from "Bearer <token>"
  const token = authHeader.replace("Bearer ", "");

  // Constant-time comparison to prevent timing attacks
  if (!constantTimeCompare(token, cronSecret)) {
    return {
      isValid: false,
      error: "Invalid cron secret",
    };
  }

  return { isValid: true };
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Higher-order function to wrap cron handlers with auth.
 */
export function withCronAuth(
  handler: (request: Request) => Promise<Response>,
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    const auth = validateCronAuth(request);

    if (!auth.isValid) {
      console.warn("[SECURITY] Unauthorized cron access attempt:", {
        ip: request.headers.get("x-forwarded-for"),
        path: new URL(request.url).pathname,
        timestamp: new Date().toISOString(),
      });

      return Response.json(
        { error: auth.error || "Unauthorized" },
        { status: 401 },
      );
    }

    return handler(request);
  };
}
```

### Step 2: تحديث جميع Cron Routes

```typescript
// app/api/cron/process-questions/route.ts
import { withCronAuth } from "@/lib/security/cron-auth";

async function handleProcessQuestions(request: Request) {
  // الكود الحالي للـ cron job
  // ...
}

export const GET = withCronAuth(handleProcessQuestions);
export const POST = withCronAuth(handleProcessQuestions);
```

```typescript
// app/api/cron/cleanup/route.ts
import { withCronAuth } from "@/lib/security/cron-auth";

async function handleCleanup(request: Request) {
  // الكود الحالي للـ cleanup
  // ...
}

export const GET = withCronAuth(handleCleanup);
```

```typescript
// app/api/gmb/scheduled-sync/route.ts
import { withCronAuth } from "@/lib/security/cron-auth";

async function handleScheduledSync(request: Request) {
  // الكود الحالي للـ sync
  // ...
}

export const GET = withCronAuth(handleScheduledSync);
```

### Step 3: تحديث .env.example

```bash
# .env.example - أضف هذا القسم

# ============================================================================
# CRON JOB SECURITY
# ============================================================================
# REQUIRED for production! Generate with: openssl rand -hex 32
# This secret is used to authenticate Vercel cron jobs.
# Without this, cron endpoints will be BLOCKED.
CRON_SECRET=your-secure-random-string-at-least-32-chars
```

### Step 4: تحديث vercel.json

```json
{
  "crons": [
    {
      "path": "/api/cron/process-questions",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/gmb/scheduled-sync",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

**ملاحظة:** Vercel يرسل الـ `CRON_SECRET` تلقائياً في header عند استدعاء cron jobs.

---

## 🔍 خطوات التنفيذ

### Step 1: إنشاء ملف cron-auth.ts

```bash
# أنشئ الملف
touch lib/security/cron-auth.ts
# انسخ الكود أعلاه
```

### Step 2: تحديث كل cron route

```bash
# ابحث عن جميع cron routes
grep -r "CRON_SECRET" app/api/
# حدث كل واحد منهم
```

### Step 3: إضافة CRON_SECRET للـ environment

```bash
# Generate secure secret
openssl rand -hex 32

# أضفه في Vercel Dashboard:
# Settings > Environment Variables > CRON_SECRET
```

### Step 4: تحديث .env.example

```bash
# أضف التوثيق
echo "CRON_SECRET=generate-with-openssl-rand-hex-32" >> .env.example
```

---

## ✅ معايير القبول

قبل وضع علامة "مكتمل"، تأكد من:

- [ ] تم إنشاء `lib/security/cron-auth.ts`
- [ ] تم تحديث جميع cron routes لاستخدام `withCronAuth`
- [ ] تم إضافة `CRON_SECRET` للـ `.env.example` مع توثيق
- [ ] الـ cron endpoints ترفض الطلبات بدون secret صحيح
- [ ] الـ cron endpoints ترفض الطلبات إذا `CRON_SECRET` غير معرف
- [ ] تم استخدام constant-time comparison
- [ ] لا توجد أخطاء TypeScript: `npx tsc --noEmit`
- [ ] لا توجد أخطاء Lint: `npm run lint`

---

## 🧪 اختبار الحل

### Test 1: بدون CRON_SECRET

```bash
# احذف CRON_SECRET من البيئة مؤقتاً
unset CRON_SECRET

# حاول استدعاء الـ endpoint
curl -X GET http://localhost:3000/api/cron/process-questions

# يجب أن يرجع 401 مع رسالة "Server configuration error"
```

### Test 2: مع secret خاطئ

```bash
curl -X GET http://localhost:3000/api/cron/process-questions \
  -H "Authorization: Bearer wrong-secret"

# يجب أن يرجع 401 مع رسالة "Invalid cron secret"
```

### Test 3: مع secret صحيح

```bash
curl -X GET http://localhost:3000/api/cron/process-questions \
  -H "Authorization: Bearer $CRON_SECRET"

# يجب أن يعمل بنجاح
```

### Test 4: Unit Tests

```typescript
// tests/lib/security/cron-auth.test.ts
import { validateCronAuth } from "@/lib/security/cron-auth";

describe("Cron Authentication", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should reject when CRON_SECRET is not set", () => {
    delete process.env.CRON_SECRET;

    const request = new Request("http://localhost/api/cron/test", {
      headers: { authorization: "Bearer some-token" },
    });

    const result = validateCronAuth(request);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("configuration error");
  });

  it("should reject invalid token", () => {
    process.env.CRON_SECRET = "correct-secret-at-least-32-characters";

    const request = new Request("http://localhost/api/cron/test", {
      headers: { authorization: "Bearer wrong-token" },
    });

    const result = validateCronAuth(request);
    expect(result.isValid).toBe(false);
  });

  it("should accept valid token", () => {
    const secret = "correct-secret-at-least-32-characters";
    process.env.CRON_SECRET = secret;

    const request = new Request("http://localhost/api/cron/test", {
      headers: { authorization: `Bearer ${secret}` },
    });

    const result = validateCronAuth(request);
    expect(result.isValid).toBe(true);
  });
});
```

---

## 🚨 تحذيرات مهمة

### ⛔ ممنوع:

- استخدام `if (cronSecret && ...)` - هذا يسمح بتجاوز الـ auth
- استخدام secret قصير (أقل من 32 حرف)
- تخزين الـ secret في الكود
- استخدام `===` للمقارنة (عرضة لـ timing attacks)

### ✅ مطلوب:

- FAIL CLOSED إذا الـ secret غير معرف
- Constant-time comparison
- Logging لمحاولات الوصول غير المصرح بها
- Secret بطول 32+ حرف

---

## 📚 مراجع

- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Timing Attacks](https://codahale.com/a-lesson-in-timing-attacks/)

---

**Status:** 🔴 NOT STARTED
**Blocked By:** None
**Blocks:** Production deployment

---

**هذا إصلاح أمني حرج. بدونه، أي شخص يمكنه تنفيذ cron jobs!** 🔒
