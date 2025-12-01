# 🟠 HIGH PRIORITY: console.error بدون Sentry

> ⚠️ **قبل البدء:** اقرأ `AI_AGENT_START_HERE.md` أولاً! اقرأ الملف المستهدف كاملاً قبل أي تعديل.

> **الأولوية:** P1 - عالي
> **الوقت المقدر:** 6-8 ساعات
> **المجال:** مراقبة

---

## 📋 ملخص المشكلة

**Issue ID:** HIGH-018
**Severity:** 🟠 HIGH - MONITORING
**Impact:** فقدان visibility على الأخطاء في Production

---

## 🎯 المشكلة بالتفصيل

استخدام `console.error` و `console.warn` بدلاً من Sentry:

1. **الـ logs تضيع في Production** - Vercel serverless لا يحفظ console logs
2. **لا يمكن تتبع الأخطاء** - لا نعرف متى وأين حدث الخطأ
3. **لا يوجد alerting** - لا تنبيهات عند حدوث أخطاء
4. **لا يوجد context** - لا نعرف من هو المستخدم المتأثر

---

## 📊 الإحصائيات الحالية

| المقياس                                     | العدد        |
| ------------------------------------------- | ------------ |
| **إجمالي `console.error` + `console.warn`** | **1,084**    |
| **عدد الملفات المتأثرة**                    | **328 ملف**  |
| **استخدامات Sentry الحالية**                | **3 فقط** ❌ |

---

## 📁 الملفات المتأثرة (328 ملف)

### Server Actions (18 ملف) - الأولوية القصوى:

```
server/actions/gmb-sync.ts
server/actions/reviews-management.ts
server/actions/questions-management.ts
server/actions/posts-management.ts
server/actions/auto-reply.ts
server/actions/gmb-account.ts
server/actions/locations.ts
server/actions/sync-queue.ts
server/actions/achievements.ts
server/actions/notifications.ts
server/actions/settings.ts
server/actions/gmb-sync-diagnostics.ts
server/actions/dashboard.ts
server/actions/media-management.ts
server/actions/weekly-tasks.ts
server/actions/onboarding.ts
server/actions/gmb-settings.ts
server/actions/reviews.ts
```

### API Routes (50+ ملف):

```
app/api/gmb/**/*.ts
app/api/webhooks/**/*.ts
app/api/ai/**/*.ts
app/api/auth/**/*.ts
app/api/upload/**/*.ts
```

### Lib & Hooks:

```
lib/services/*.ts
lib/gmb/*.ts
lib/supabase/*.ts
hooks/*.ts
```

---

## ✅ الحل المطلوب

### 🔴 Step 1: إنشاء Logger Utility (مطلوب أولاً)

أنشئ الملف `lib/utils/logger.ts`:

````typescript
// lib/utils/logger.ts
import * as Sentry from "@sentry/nextjs";

/**
 * Log context interface for structured logging
 */
export interface LogContext {
  [key: string]: unknown;
}

/**
 * Log levels supported by the logger
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Centralized logger that integrates with Sentry
 *
 * Usage:
 * ```typescript
 * import { logger } from "@/lib/utils/logger";
 *
 * // Simple error
 * logger.error("Failed to sync", error);
 *
 * // Error with context
 * logger.error("Failed to sync", error, { userId, locationId });
 *
 * // Warning
 * logger.warn("Rate limit approaching", { remaining: 10 });
 *
 * // With module context
 * const gmbLogger = logger.withContext({ module: "gmb" });
 * gmbLogger.error("Sync failed", error);
 * ```
 */
class Logger {
  private context: LogContext = {};

  /**
   * Create a new logger with additional context
   * Context is merged with any existing context
   */
  withContext(context: LogContext): Logger {
    const newLogger = new Logger();
    newLogger.context = { ...this.context, ...context };
    return newLogger;
  }

  /**
   * Debug logging - only in development
   */
  debug(message: string, data?: LogContext): void {
    if (process.env.NODE_ENV === "development") {
      console.debug(`[DEBUG] ${message}`, { ...this.context, ...data });
    }
  }

  /**
   * Info logging - adds breadcrumb to Sentry
   */
  info(message: string, data?: LogContext): void {
    console.info(`[INFO] ${message}`, { ...this.context, ...data });

    if (
      typeof window !== "undefined" ||
      process.env.NODE_ENV === "production"
    ) {
      Sentry.addBreadcrumb({
        category: "info",
        message,
        data: { ...this.context, ...data },
        level: "info",
      });
    }
  }

  /**
   * Warning logging - adds breadcrumb to Sentry
   */
  warn(message: string, data?: LogContext): void {
    console.warn(`[WARN] ${message}`, { ...this.context, ...data });

    if (
      typeof window !== "undefined" ||
      process.env.NODE_ENV === "production"
    ) {
      Sentry.addBreadcrumb({
        category: "warning",
        message,
        data: { ...this.context, ...data },
        level: "warning",
      });
    }
  }

  /**
   * Error logging - captures exception in Sentry
   *
   * @param message - Human readable error message
   * @param error - The error object (optional)
   * @param data - Additional context data (optional)
   */
  error(message: string, error?: Error | unknown, data?: LogContext): void {
    const allContext = { ...this.context, ...data };

    // Always log to console for development
    console.error(`[ERROR] ${message}`, error, allContext);

    // Capture in Sentry
    if (error instanceof Error) {
      Sentry.captureException(error, {
        extra: { message, ...allContext },
        tags: this.extractTags(allContext),
      });
    } else if (error) {
      Sentry.captureException(new Error(message), {
        extra: { originalError: error, ...allContext },
        tags: this.extractTags(allContext),
      });
    } else {
      Sentry.captureMessage(message, {
        level: "error",
        extra: allContext,
        tags: this.extractTags(allContext),
      });
    }
  }

  /**
   * Extract tags from context for better Sentry filtering
   */
  private extractTags(context: LogContext): Record<string, string> {
    const tags: Record<string, string> = {};

    // Common tags to extract
    const tagKeys = ["module", "action", "userId", "locationId", "accountId"];

    for (const key of tagKeys) {
      if (context[key] && typeof context[key] === "string") {
        tags[key] = context[key] as string;
      }
    }

    return tags;
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger();

/**
 * Pre-configured loggers for common modules
 */
export const gmbLogger = logger.withContext({ module: "gmb" });
export const authLogger = logger.withContext({ module: "auth" });
export const apiLogger = logger.withContext({ module: "api" });
export const syncLogger = logger.withContext({ module: "sync" });
export const reviewsLogger = logger.withContext({ module: "reviews" });
export const postsLogger = logger.withContext({ module: "posts" });
export const questionsLogger = logger.withContext({ module: "questions" });
````

---

### 🔴 Step 2: استبدال console.error و console.warn

**⚠️ مهم جداً:** اتبع هذه القواعد بدقة:

#### القاعدة 1: استبدال console.error

```typescript
// ❌ قبل
console.error("Failed to sync:", error);
console.error("[GMB] Sync failed", { error, locationId });

// ✅ بعد
import { logger } from "@/lib/utils/logger";
logger.error("Failed to sync", error);
logger.error("Sync failed", error, { locationId });

// ✅ أو باستخدام module logger
import { gmbLogger } from "@/lib/utils/logger";
gmbLogger.error("Sync failed", error, { locationId });
```

#### القاعدة 2: استبدال console.warn

```typescript
// ❌ قبل
console.warn("Rate limit approaching");
console.warn("[GMB] Token expiring soon", { expiresIn });

// ✅ بعد
import { logger } from "@/lib/utils/logger";
logger.warn("Rate limit approaching");
logger.warn("Token expiring soon", { expiresIn });
```

#### القاعدة 3: الحفاظ على console.log و console.info

```typescript
// ✅ اتركها كما هي - للـ debugging فقط
console.log("Debug:", data);
console.info("Processing started");
```

#### القاعدة 4: Pattern للاستبدال

استخدم هذا الـ pattern للبحث والاستبدال:

```typescript
// Pattern 1: console.error مع error object
// قبل: console.error("Message:", error);
// بعد: logger.error("Message", error);

// Pattern 2: console.error مع object
// قبل: console.error("Message", { key: value });
// بعد: logger.error("Message", undefined, { key: value });

// Pattern 3: console.error مع error و context
// قبل: console.error("Message:", error, { key: value });
// بعد: logger.error("Message", error, { key: value });

// Pattern 4: console.error بدون arguments
// قبل: console.error("Message");
// بعد: logger.error("Message");

// Pattern 5: console.warn
// قبل: console.warn("Message", { key: value });
// بعد: logger.warn("Message", { key: value });
```

---

### 🔴 Step 3: ترتيب العمل (اتبع هذا الترتيب)

#### المرحلة 1: إنشاء Logger (أولاً)

1. أنشئ `lib/utils/logger.ts` بالكود أعلاه
2. تأكد من عدم وجود أخطاء TypeScript

#### المرحلة 2: Server Actions (الأهم)

اعمل على هذه الملفات بالترتيب:

1. `server/actions/gmb-sync.ts`
2. `server/actions/reviews-management.ts`
3. `server/actions/questions-management.ts`
4. `server/actions/posts-management.ts`
5. `server/actions/auto-reply.ts`
6. `server/actions/gmb-account.ts`
7. `server/actions/locations.ts`
8. باقي ملفات `server/actions/*.ts`

#### المرحلة 3: API Routes

اعمل على هذه المجلدات:

1. `app/api/gmb/**/*.ts`
2. `app/api/webhooks/**/*.ts`
3. `app/api/ai/**/*.ts`
4. `app/api/auth/**/*.ts`
5. باقي `app/api/**/*.ts`

#### المرحلة 4: Lib & Services

1. `lib/services/*.ts`
2. `lib/gmb/*.ts`
3. `lib/supabase/*.ts`

#### المرحلة 5: Hooks & Components

1. `hooks/*.ts`
2. `components/**/*.tsx`

---

## ⚠️ تحذيرات مهمة

1. **لا تحذف console.error** - استبدله بـ `logger.error` الذي يحتوي على console.error داخلياً
2. **أضف import في أعلى الملف** - `import { logger } from "@/lib/utils/logger";`
3. **لا تغير console.log** - اتركها للـ debugging
4. **تأكد من الـ error object** - إذا كان موجود، مرره كـ parameter ثاني
5. **أضف context مفيد** - مثل `userId`, `locationId`, `accountId`

---

## 🧪 التحقق من العمل

بعد الانتهاء، شغل هذه الأوامر:

```bash
# تأكد من عدم وجود console.error بدون logger
grep -rn "console.error" --include="*.ts" --include="*.tsx" server/actions/ app/api/ lib/ | grep -v "logger.ts" | grep -v node_modules

# تأكد من عدم وجود console.warn بدون logger
grep -rn "console.warn" --include="*.ts" --include="*.tsx" server/actions/ app/api/ lib/ | grep -v "logger.ts" | grep -v node_modules

# تأكد من عدم وجود أخطاء TypeScript
npx tsc --noEmit

# تأكد من عدم وجود أخطاء ESLint
npm run lint
```

---

## ✅ معايير القبول

- [ ] تم إنشاء `lib/utils/logger.ts` بالكود المحدد
- [ ] جميع `console.error` في `server/actions/` تستخدم `logger.error`
- [ ] جميع `console.error` في `app/api/` تستخدم `logger.error`
- [ ] جميع `console.error` في `lib/` تستخدم `logger.error`
- [ ] جميع `console.warn` تستخدم `logger.warn`
- [ ] لا توجد أخطاء TypeScript
- [ ] لا توجد أخطاء ESLint
- [ ] الأخطاء تظهر في Sentry dashboard (اختبر بـ throw new Error)

---

## 📋 Checklist للمراجعة

عند الانتهاء، تأكد من:

- [ ] `lib/utils/logger.ts` موجود ويعمل
- [ ] جميع الـ imports صحيحة
- [ ] لا يوجد `console.error` خارج `logger.ts`
- [ ] لا يوجد `console.warn` خارج `logger.ts`
- [ ] الـ context مضاف للأخطاء المهمة (userId, locationId, etc.)
- [ ] `npm run build` يعمل بدون أخطاء
- [ ] `npm run lint` يعمل بدون أخطاء

---

**Status:** 🔴 NOT STARTED
