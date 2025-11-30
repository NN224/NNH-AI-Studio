# 🟡 MEDIUM PRIORITY: throw Error بدون Custom Classes

> ⚠️ **قبل البدء:** اقرأ `AI_AGENT_START_HERE.md` أولاً! اقرأ الملف المستهدف كاملاً قبل أي تعديل.

> **الأولوية:** P2 - متوسط
> **الوقت المقدر:** 3 ساعات
> **المجال:** صيانة + debugging

---

## 📋 ملخص المشكلة

**Issue ID:** MEDIUM-034
**Severity:** 🟡 MEDIUM - MAINTAINABILITY
**Impact:** صعوبة التمييز بين أنواع الأخطاء

---

## 🎯 المشكلة بالتفصيل

استخدام `throw new Error("message")` العام:

1. لا يمكن التمييز بين أنواع الأخطاء
2. صعوبة تقديم responses مناسبة
3. صعوبة الـ debugging

---

## 📁 الملفات المتأثرة

```
server/actions/locations.ts (10 throw statements)
server/actions/gmb-sync.ts (6 throw statements)
server/actions/achievements.ts (4 throw statements)
```

---

## ✅ الحل المطلوب

### إنشاء Custom Error Classes

```typescript
// lib/errors/index.ts

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "VALIDATION_ERROR", 400, details);
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, "AUTHENTICATION_ERROR", 401);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Permission denied") {
    super(message, "AUTHORIZATION_ERROR", 403);
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id
      ? `${resource} with ID ${id} not found`
      : `${resource} not found`;
    super(message, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, "CONFLICT", 409);
    this.name = "ConflictError";
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super("Rate limit exceeded", "RATE_LIMIT", 429, { retryAfter });
    this.name = "RateLimitError";
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, originalError?: Error) {
    super(`External service error: ${service}`, "EXTERNAL_SERVICE_ERROR", 502, {
      service,
      originalError: originalError?.message,
    });
    this.name = "ExternalServiceError";
  }
}
```

### استخدام Custom Errors

```typescript
// قبل
if (!user) {
  throw new Error("User not found");
}

if (!location) {
  throw new Error("Location not found");
}

if (!isValid) {
  throw new Error("Invalid input");
}

// بعد
import {
  NotFoundError,
  ValidationError,
  AuthenticationError,
} from "@/lib/errors";

if (!user) {
  throw new AuthenticationError();
}

if (!location) {
  throw new NotFoundError("Location", locationId);
}

if (!isValid) {
  throw new ValidationError("Invalid input", { field: "name" });
}
```

### Error Handler

```typescript
// lib/errors/handler.ts
import { AppError } from "./index";
import { NextResponse } from "next/server";

export function handleError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.statusCode },
    );
  }

  // Unknown error
  console.error("Unhandled error:", error);

  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    },
    { status: 500 },
  );
}
```

---

## ✅ معايير القبول

- [ ] تم إنشاء `lib/errors/index.ts`
- [ ] جميع `throw new Error` تستخدم custom classes
- [ ] Error handler يتعامل مع كل نوع
- [ ] API responses تتضمن error code

---

**Status:** 🔴 NOT STARTED
