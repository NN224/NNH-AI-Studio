# 🟠 HIGH PRIORITY: console.error بدون Sentry

> **الأولوية:** P1 - عالي
> **الوقت المقدر:** 4 ساعات
> **المجال:** مراقبة

---

## 📋 ملخص المشكلة

**Issue ID:** HIGH-018
**Severity:** 🟠 HIGH - MONITORING
**Impact:** فقدان visibility على الأخطاء في Production

---

## 🎯 المشكلة بالتفصيل

استخدام `console.error` بدلاً من Sentry:

1. الـ logs تضيع في Production (serverless)
2. لا يمكن تتبع الأخطاء
3. لا يوجد alerting

---

## 📁 الملفات المتأثرة (145+ ملف)

```
app/api/gmb/oauth-callback/route.ts (39 console statements)
app/api/webhooks/gmb-notifications/route.ts (17 console statements)
وغيرها...
```

---

## ✅ الحل المطلوب

### Step 1: إنشاء Logger Utility

```typescript
// lib/utils/logger.ts
import * as Sentry from "@sentry/nextjs";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private context: LogContext = {};

  withContext(context: LogContext): Logger {
    const logger = new Logger();
    logger.context = { ...this.context, ...context };
    return logger;
  }

  debug(message: string, data?: LogContext): void {
    if (process.env.NODE_ENV === "development") {
      console.debug(`[DEBUG] ${message}`, { ...this.context, ...data });
    }
  }

  info(message: string, data?: LogContext): void {
    console.info(`[INFO] ${message}`, { ...this.context, ...data });

    Sentry.addBreadcrumb({
      category: "info",
      message,
      data: { ...this.context, ...data },
      level: "info",
    });
  }

  warn(message: string, data?: LogContext): void {
    console.warn(`[WARN] ${message}`, { ...this.context, ...data });

    Sentry.addBreadcrumb({
      category: "warning",
      message,
      data: { ...this.context, ...data },
      level: "warning",
    });
  }

  error(message: string, error?: Error | unknown, data?: LogContext): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));

    console.error(`[ERROR] ${message}`, errorObj, { ...this.context, ...data });

    Sentry.captureException(errorObj, {
      extra: { message, ...this.context, ...data },
    });
  }
}

export const logger = new Logger();
```

### Step 2: استبدال console.error

```typescript
// قبل
console.error("Failed to sync:", error);

// بعد
import { logger } from "@/lib/utils/logger";
logger.error("Failed to sync", error, { accountId });
```

---

## ✅ معايير القبول

- [ ] تم إنشاء `logger.ts` utility
- [ ] جميع `console.error` تستخدم `logger.error`
- [ ] جميع `console.warn` تستخدم `logger.warn`
- [ ] الأخطاء تظهر في Sentry dashboard
- [ ] Breadcrumbs تُضاف للـ context

---

**Status:** 🔴 NOT STARTED
