# ✅ [COMPLETED] CRITICAL FIX: CSRF Protection غير مُفعَّل في Middleware

> ⚠️ **قبل البدء:** اقرأ `AI_AGENT_START_HERE.md` أولاً! اقرأ الملف المستهدف كاملاً قبل أي تعديل.

> **تم التطبيق بالكامل** ✅ - Applied on Nov 30, 2025
> **التغييرات:**
>
> - تفعيل CSRF validation في `middleware.ts`
> - تحديث `lib/security/csrf.ts` مع excluded paths
> - تحديث `/api/csrf-token` endpoint
> - تحديث `lib/api-client.ts` مع CSRF token handling
> - Constant-time comparison لمنع timing attacks

> **الأولوية:** P0 - حرج
> **الوقت المقدر:** 3 ساعات
> **المجال:** أمان
> **الحالة:** ✅ تم الإصلاح

---

## 📋 ملخص المشكلة

**Issue ID:** CRITICAL-011
**Severity:** 🔴 CRITICAL - SECURITY VULNERABILITY
**Impact:** التطبيق عرضة لـ CSRF attacks

---

## 🎯 المشكلة بالتفصيل

الـ CSRF protection موجود في `lib/security/csrf.ts` لكن:

1. **غير مُفعَّل** في middleware.ts
2. الـ API routes لا تتحقق من CSRF tokens
3. جميع POST/PUT/DELETE requests عرضة للهجوم

---

## 📁 الملفات المتأثرة

```
middleware.ts                    # يجب إضافة CSRF validation
lib/security/csrf.ts             # موجود لكن غير مستخدم
app/api/*/route.ts               # جميع الـ mutating endpoints
```

---

## 🐛 الكود الحالي (المعطوب)

```typescript
// middleware.ts - CSRF validation مفقود تماماً!
export async function middleware(request: NextRequest) {
  // 1. Security checks ✓
  // 2. Rate limiting ✓
  // 3. i18n ✓
  // 4. Auth ✓
  // 5. CSRF ❌ غير موجود!
}
```

```typescript
// lib/security/csrf.ts - موجود لكن غير مستخدم
export function validateCSRF(request: Request): boolean {
  // الكود موجود لكن لا أحد يستدعيه!
}
```

**لماذا هذا خطير:**

- المهاجم يمكنه إنشاء صفحة تُرسل requests باسم المستخدم
- يمكن تغيير إعدادات الحساب
- يمكن حذف البيانات
- يمكن إرسال رسائل باسم المستخدم

---

## ✅ الحل المطلوب

### Step 1: تحديث middleware.ts

```typescript
// middleware.ts
import { validateCSRF, shouldProtectRequest } from "@/lib/security/csrf";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ... existing security checks ...

  // =========================================================================
  // CSRF PROTECTION
  // =========================================================================
  // Validate CSRF token for state-changing requests (POST, PUT, DELETE, PATCH)
  // Skip for:
  // - GET/HEAD/OPTIONS requests
  // - OAuth callbacks (they have their own state validation)
  // - Webhooks (they use signature verification)
  // - Public API endpoints
  // =========================================================================

  if (shouldProtectRequest(request)) {
    const isValidCSRF = await validateCSRFMiddleware(request);

    if (!isValidCSRF) {
      console.warn("[SECURITY] CSRF validation failed:", {
        ip: getClientIP(request),
        path: pathname,
        method: request.method,
        timestamp: new Date().toISOString(),
      });

      return new NextResponse(
        JSON.stringify({ error: "Invalid or missing CSRF token" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  // ... rest of middleware ...
}

/**
 * Validates CSRF token from request headers against cookie.
 */
async function validateCSRFMiddleware(request: NextRequest): Promise<boolean> {
  const csrfHeader = request.headers.get("x-csrf-token");
  const csrfCookie = request.cookies.get("csrf-token")?.value;

  // Both must be present
  if (!csrfHeader || !csrfCookie) {
    return false;
  }

  // Constant-time comparison
  if (csrfHeader.length !== csrfCookie.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < csrfHeader.length; i++) {
    result |= csrfHeader.charCodeAt(i) ^ csrfCookie.charCodeAt(i);
  }

  return result === 0;
}
```

### Step 2: تحديث lib/security/csrf.ts

```typescript
// lib/security/csrf.ts
export const CSRF_COOKIE_NAME = "csrf-token";
export const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Determines if a request should be protected by CSRF validation.
 */
export function shouldProtectRequest(request: Request): boolean {
  const method = request.method.toUpperCase();

  // Only protect state-changing methods
  if (!["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    return false;
  }

  const url = new URL(request.url);
  const pathname = url.pathname;

  // Skip CSRF for these paths (they have their own auth)
  const skipPaths = [
    "/api/webhooks/", // Webhooks use signature verification
    "/api/gmb/oauth-callback", // OAuth has state parameter
    "/api/youtube/oauth-callback",
    "/api/auth/callback", // Supabase auth callback
    "/api/csrf-token", // CSRF token endpoint itself
    "/api/health", // Health checks
  ];

  for (const skipPath of skipPaths) {
    if (pathname.startsWith(skipPath)) {
      return false;
    }
  }

  return true;
}

/**
 * Generates a cryptographically secure CSRF token.
 */
export function generateCSRFToken(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  throw new Error("Cryptographically secure random generation not available");
}

/**
 * Sets CSRF token cookie with secure attributes.
 */
export function setCSRFTokenCookie(response: Response, token: string): void {
  const isProduction = process.env.NODE_ENV === "production";

  const cookieValue = [
    `${CSRF_COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    isProduction ? "Secure" : "",
    `Max-Age=${60 * 60 * 24}`, // 24 hours
  ]
    .filter(Boolean)
    .join("; ");

  response.headers.append("Set-Cookie", cookieValue);
}
```

### Step 3: تحديث CSRF Token API

```typescript
// app/api/csrf-token/route.ts
import { NextResponse } from "next/server";
import {
  generateCSRFToken,
  setCSRFTokenCookie,
  CSRF_COOKIE_NAME,
} from "@/lib/security/csrf";

export const dynamic = "force-dynamic";

export async function GET() {
  const token = generateCSRFToken();

  const response = NextResponse.json({ csrfToken: token });

  // Set cookie with secure attributes
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return response;
}
```

### Step 4: تحديث Client-Side Code

```typescript
// lib/api-client.ts
let csrfToken: string | null = null;

/**
 * Fetches CSRF token from server.
 */
async function getCSRFToken(): Promise<string> {
  if (csrfToken) return csrfToken;

  const response = await fetch("/api/csrf-token");
  const data = await response.json();
  csrfToken = data.csrfToken;
  return csrfToken;
}

/**
 * Makes an API request with CSRF token.
 */
export async function apiRequest(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const method = options.method?.toUpperCase() || "GET";

  // Add CSRF token for state-changing requests
  if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    const token = await getCSRFToken();
    options.headers = {
      ...options.headers,
      "x-csrf-token": token,
    };
  }

  return fetch(url, options);
}
```

### Step 5: تحديث React Hooks

```typescript
// hooks/use-api.ts
import { apiRequest } from "@/lib/api-client";

export function useApi() {
  const post = async (url: string, data: unknown) => {
    return apiRequest(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  };

  const put = async (url: string, data: unknown) => {
    return apiRequest(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  };

  const del = async (url: string) => {
    return apiRequest(url, { method: "DELETE" });
  };

  return { post, put, del, get: (url: string) => fetch(url) };
}
```

---

## 🔍 خطوات التنفيذ

### Step 1: تحديث csrf.ts

```bash
# تأكد من وجود الدوال المطلوبة
cat lib/security/csrf.ts
# أضف shouldProtectRequest و generateCSRFToken
```

### Step 2: تحديث middleware.ts

```bash
# أضف CSRF validation بعد rate limiting
# قبل الـ auth checks
```

### Step 3: تحديث CSRF Token API

```bash
# تأكد من أن /api/csrf-token يعمل
curl http://localhost:3000/api/csrf-token
```

### Step 4: تحديث Client Code

```bash
# ابحث عن جميع fetch calls
grep -r "fetch(" components/ hooks/ lib/
# حدثها لاستخدام apiRequest
```

---

## ✅ معايير القبول

قبل وضع علامة "مكتمل"، تأكد من:

- [ ] تم إضافة CSRF validation في middleware.ts
- [ ] تم تحديث `shouldProtectRequest` لتحديد الـ paths المستثناة
- [ ] تم تحديث `/api/csrf-token` لإرجاع token آمن
- [ ] تم إنشاء `apiRequest` helper للـ client
- [ ] جميع POST/PUT/DELETE requests ترسل CSRF token
- [ ] الـ middleware يرفض requests بدون CSRF token صحيح
- [ ] OAuth callbacks و webhooks مستثناة من CSRF
- [ ] لا توجد أخطاء TypeScript: `npx tsc --noEmit`
- [ ] لا توجد أخطاء Lint: `npm run lint`

---

## 🧪 اختبار الحل

### Test 1: بدون CSRF Token

```bash
curl -X POST http://localhost:3000/api/some-endpoint \
  -H "Content-Type: application/json" \
  -d '{"data": "test"}'

# يجب أن يرجع 403 "Invalid or missing CSRF token"
```

### Test 2: مع CSRF Token صحيح

```bash
# احصل على token أولاً
TOKEN=$(curl -s http://localhost:3000/api/csrf-token | jq -r '.csrfToken')
COOKIE=$(curl -s -c - http://localhost:3000/api/csrf-token | grep csrf-token | awk '{print $7}')

# استخدم الـ token
curl -X POST http://localhost:3000/api/some-endpoint \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $TOKEN" \
  -H "Cookie: csrf-token=$COOKIE" \
  -d '{"data": "test"}'

# يجب أن يعمل
```

### Test 3: Webhooks مستثناة

```bash
curl -X POST http://localhost:3000/api/webhooks/gmb-notifications \
  -H "Content-Type: application/json" \
  -d '{"type": "test"}'

# يجب ألا يطلب CSRF token (لكن يطلب signature)
```

---

## 🚨 تحذيرات مهمة

### ⛔ ممنوع:

- تخطي CSRF validation لأي POST/PUT/DELETE endpoint
- استخدام GET للعمليات التي تغير البيانات
- تخزين CSRF token في localStorage (عرضة لـ XSS)
- استخدام نفس الـ token لفترة طويلة

### ✅ مطلوب:

- CSRF token في cookie (HttpOnly, Secure, SameSite=Strict)
- CSRF token في header لكل request
- Constant-time comparison
- Token rotation كل 24 ساعة

---

## 📚 مراجع

- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Double Submit Cookie Pattern](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#double-submit-cookie)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)

---

**Status:** ✅ COMPLETED
**Blocked By:** None
**Blocks:** None

---

**هذا إصلاح أمني حرج. بدون CSRF protection، المستخدمون عرضة للهجمات!** 🔒
