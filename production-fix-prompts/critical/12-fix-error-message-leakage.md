# ✅ [COMPLETED] CRITICAL FIX: تسريب Error Messages في Production

> ⚠️ **قبل البدء:** اقرأ `AI_AGENT_START_HERE.md` أولاً! اقرأ الملف المستهدف كاملاً قبل أي تعديل.

> **تم التطبيق بالكامل** ✅ - Applied on Nov 30, 2025
> **التغييرات:**
>
> - إنشاء `lib/security/error-sanitizer.ts` مع sensitive patterns
> - تحديث `app/global-error.tsx` لعدم عرض `error.message` مباشرة
> - إنشاء `lib/api/error-response.ts` للـ API routes
> - رسائل عامة وآمنة للمستخدم في Production
> - Error digest للدعم الفني

> **الأولوية:** P0 - حرج
> **الوقت المقدر:** 2 ساعات
> **المجال:** أمان
> **الحالة:** ✅ تم الإصلاح

---

## 📋 ملخص المشكلة

**Issue ID:** CRITICAL-012
**Severity:** 🔴 CRITICAL - INFORMATION DISCLOSURE
**Impact:** كشف معلومات حساسة عن النظام للمهاجمين

---

## 🎯 المشكلة بالتفصيل

الـ `global-error.tsx` يعرض `error.message` مباشرة للمستخدم:

1. قد يحتوي على database queries
2. قد يحتوي على file paths
3. قد يحتوي على stack traces
4. يساعد المهاجمين على فهم النظام

---

## 📁 الملفات المتأثرة

```
app/global-error.tsx              # يجب تعديله
lib/api/secure-handler.ts         # موجود لكن غير مستخدم في كل مكان
components/error-boundary/        # قد تحتاج تحديث
```

---

## 🐛 الكود الحالي (المعطوب)

```typescript
// app/global-error.tsx
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <h2>Something went wrong!</h2>
        {/* ❌ DANGER: يعرض error.message للمستخدم! */}
        <p>{error.message}</p>
        <button onClick={() => reset()}>Try again</button>
      </body>
    </html>
  );
}
```

**أمثلة على ما قد يُكشف:**

```
// Database errors
"relation \"users\" does not exist"
"duplicate key value violates unique constraint"

// File system errors
"/var/task/node_modules/.../file.js:123"

// API errors
"API key invalid: sk-xxxx..."
```

---

## ✅ الحل المطلوب

### Step 1: تحديث global-error.tsx

```typescript
// app/global-error.tsx
"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Safe error messages for users
const USER_FRIENDLY_MESSAGES: Record<string, string> = {
  NETWORK_ERROR: "Unable to connect. Please check your internet connection.",
  SERVER_ERROR: "Our servers are experiencing issues. Please try again later.",
  NOT_FOUND: "The requested resource was not found.",
  UNAUTHORIZED: "Please sign in to continue.",
  FORBIDDEN: "You don't have permission to access this resource.",
  DEFAULT: "Something went wrong. Please try again.",
};

/**
 * Determines if an error message is safe to show to users.
 * NEVER show technical details in production.
 */
function getSafeErrorMessage(error: Error): string {
  // In development, show full error for debugging
  if (process.env.NODE_ENV === "development") {
    return error.message;
  }

  // Check for known safe error types
  const message = error.message.toLowerCase();

  if (message.includes("network") || message.includes("fetch")) {
    return USER_FRIENDLY_MESSAGES.NETWORK_ERROR;
  }

  if (message.includes("not found") || message.includes("404")) {
    return USER_FRIENDLY_MESSAGES.NOT_FOUND;
  }

  if (message.includes("unauthorized") || message.includes("401")) {
    return USER_FRIENDLY_MESSAGES.UNAUTHORIZED;
  }

  if (message.includes("forbidden") || message.includes("403")) {
    return USER_FRIENDLY_MESSAGES.FORBIDDEN;
  }

  // Default: NEVER show the actual error message
  return USER_FRIENDLY_MESSAGES.DEFAULT;
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log full error to Sentry (server-side only)
    Sentry.captureException(error, {
      tags: {
        errorBoundary: "global",
      },
      extra: {
        digest: error.digest,
      },
    });

    // Log to console in development only
    if (process.env.NODE_ENV === "development") {
      console.error("Global Error:", error);
    }
  }, [error]);

  const safeMessage = getSafeErrorMessage(error);

  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg text-center">
          <div className="mb-6">
            <svg
              className="mx-auto h-16 w-16 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Oops! Something went wrong
          </h1>

          <p className="text-gray-600 mb-6">{safeMessage}</p>

          {/* Show error digest for support reference (safe to show) */}
          {error.digest && (
            <p className="text-xs text-gray-400 mb-4">
              Error ID: {error.digest}
            </p>
          )}

          <div className="space-y-3">
            <button
              onClick={reset}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>

            <a
              href="/"
              className="block w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Go to Homepage
            </a>
          </div>

          {/* Development only: show full error */}
          {process.env.NODE_ENV === "development" && (
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-sm text-gray-500">
                Developer Info
              </summary>
              <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto">
                {error.stack}
              </pre>
            </details>
          )}
        </div>
      </body>
    </html>
  );
}
```

### Step 2: إنشاء Error Sanitizer Utility

```typescript
// lib/security/error-sanitizer.ts

/**
 * Patterns that indicate sensitive information in error messages.
 * These should NEVER be shown to users.
 */
const SENSITIVE_PATTERNS = [
  // Database
  /relation ".*" does not exist/i,
  /duplicate key value/i,
  /foreign key constraint/i,
  /column ".*" does not exist/i,
  /syntax error at or near/i,
  /permission denied for/i,

  // File paths
  /\/var\/task\//i,
  /\/home\/.*\//i,
  /node_modules/i,
  /\.js:\d+:\d+/i,
  /\.ts:\d+:\d+/i,

  // API keys and secrets
  /sk-[a-zA-Z0-9]+/i,
  /api[_-]?key/i,
  /secret/i,
  /password/i,
  /token/i,

  // Internal errors
  /ECONNREFUSED/i,
  /ETIMEDOUT/i,
  /ENOTFOUND/i,

  // Stack traces
  /at\s+\w+\s+\(/i,
  /Error:\s+/i,
];

/**
 * Checks if an error message contains sensitive information.
 */
export function containsSensitiveInfo(message: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Sanitizes an error for safe display to users.
 * In production, always returns a generic message.
 */
export function sanitizeError(error: unknown): {
  message: string;
  code?: string;
  digest?: string;
} {
  const isProduction = process.env.NODE_ENV === "production";

  // Default safe response
  const safeResponse = {
    message: "An unexpected error occurred. Please try again later.",
    code: "INTERNAL_ERROR",
  };

  if (!(error instanceof Error)) {
    return safeResponse;
  }

  // In production, ALWAYS return safe message
  if (isProduction) {
    // Check for known error types that have safe messages
    if (error.name === "ValidationError") {
      return {
        message: "Invalid input. Please check your data and try again.",
        code: "VALIDATION_ERROR",
      };
    }

    if (error.name === "AuthenticationError") {
      return {
        message: "Please sign in to continue.",
        code: "AUTHENTICATION_ERROR",
      };
    }

    if (error.name === "NotFoundError") {
      return {
        message: "The requested resource was not found.",
        code: "NOT_FOUND",
      };
    }

    return safeResponse;
  }

  // In development, show more details but still sanitize secrets
  if (containsSensitiveInfo(error.message)) {
    return {
      message: `[SANITIZED] ${error.name}: Contains sensitive information`,
      code: "SENSITIVE_ERROR",
    };
  }

  return {
    message: error.message,
    code: error.name,
  };
}

/**
 * Logs error internally with full details.
 * This should be used alongside sanitizeError.
 */
export function logErrorInternal(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  // Always log full error internally
  console.error("[Internal Error]", {
    error,
    context,
    timestamp: new Date().toISOString(),
  });

  // Send to Sentry in production
  if (process.env.NODE_ENV === "production") {
    import("@sentry/nextjs").then((Sentry) => {
      Sentry.captureException(error, {
        extra: context,
      });
    });
  }
}
```

### Step 3: تحديث API Error Responses

```typescript
// lib/api/error-response.ts
import {
  sanitizeError,
  logErrorInternal,
} from "@/lib/security/error-sanitizer";
import { NextResponse } from "next/server";

/**
 * Creates a safe error response for API routes.
 * NEVER exposes internal error details in production.
 */
export function createErrorResponse(
  error: unknown,
  context?: { path?: string; method?: string },
): NextResponse {
  // Log full error internally
  logErrorInternal(error, context);

  // Get sanitized error for response
  const sanitized = sanitizeError(error);

  // Determine status code
  let status = 500;
  if (sanitized.code === "VALIDATION_ERROR") status = 400;
  if (sanitized.code === "AUTHENTICATION_ERROR") status = 401;
  if (sanitized.code === "FORBIDDEN") status = 403;
  if (sanitized.code === "NOT_FOUND") status = 404;

  return NextResponse.json(
    {
      success: false,
      error: {
        message: sanitized.message,
        code: sanitized.code,
      },
    },
    { status },
  );
}
```

---

## 🔍 خطوات التنفيذ

### Step 1: إنشاء error-sanitizer.ts

```bash
touch lib/security/error-sanitizer.ts
# انسخ الكود أعلاه
```

### Step 2: تحديث global-error.tsx

```bash
# استبدل الملف بالكامل
```

### Step 3: تحديث جميع API routes

```bash
# ابحث عن error responses
grep -r "error.message" app/api/
# استبدلها بـ createErrorResponse
```

### Step 4: اختبار في Production mode

```bash
NODE_ENV=production npm run build
NODE_ENV=production npm start
# تأكد من عدم ظهور أي error details
```

---

## ✅ معايير القبول

قبل وضع علامة "مكتمل"، تأكد من:

- [ ] تم تحديث `global-error.tsx` لعدم عرض `error.message` مباشرة
- [ ] تم إنشاء `error-sanitizer.ts` مع patterns للمعلومات الحساسة
- [ ] تم إنشاء `createErrorResponse` للـ API routes
- [ ] جميع API routes تستخدم `createErrorResponse`
- [ ] الأخطاء تُرسل لـ Sentry مع التفاصيل الكاملة
- [ ] المستخدم يرى رسائل عامة فقط في Production
- [ ] الـ error digest يظهر للمستخدم (للدعم الفني)
- [ ] لا توجد أخطاء TypeScript: `npx tsc --noEmit`
- [ ] لا توجد أخطاء Lint: `npm run lint`

---

## 🧪 اختبار الحل

### Test 1: Database Error

```typescript
// في API route، أضف هذا مؤقتاً للاختبار
throw new Error('relation "users" does not exist');

// في Production، يجب أن يرى المستخدم:
// "An unexpected error occurred. Please try again later."
```

### Test 2: API Key Leak

```typescript
throw new Error("Invalid API key: sk-1234567890abcdef");

// يجب ألا يظهر الـ API key للمستخدم
```

### Test 3: Stack Trace

```typescript
const err = new Error("Test error");
console.log(err.stack);
// يجب ألا يظهر الـ stack trace في Production
```

---

## 🚨 تحذيرات مهمة

### ⛔ ممنوع:

- عرض `error.message` مباشرة للمستخدم
- عرض `error.stack` في Production
- تضمين database queries في الـ response
- تضمين file paths في الـ response

### ✅ مطلوب:

- رسائل عامة وآمنة للمستخدم
- Error digest للدعم الفني
- Full logging في Sentry
- Development mode يعرض التفاصيل

---

## 📚 مراجع

- [OWASP Error Handling](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html)
- [Sentry Error Tracking](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Next.js Error Handling](https://nextjs.org/docs/app/building-your-application/routing/error-handling)

---

**Status:** ✅ COMPLETED
**Blocked By:** None
**Blocks:** None

---

**هذا إصلاح أمني حرج. تسريب الأخطاء يساعد المهاجمين!** 🔒
