# ✅ [COMPLETED] 🔴 CRITICAL FIX: Rate Limiting In-Memory (Non-Distributed)

> ⚠️ **قبل البدء:** اقرأ `AI_AGENT_START_HERE.md` أولاً! اقرأ الملف المستهدف كاملاً قبل أي تعديل.

> **تم التطبيق بالكامل** ✅ - Applied on Nov 30, 2025
> **Deployed to:** https://nnh.ae
> **التغييرات:**
>
> - استبدال In-Memory Map بـ Upstash Redis الموزع
> - جميع الـ rate limit functions أصبحت async
> - FAIL CLOSED - يرفض الطلبات إذا Redis غير متاح
> - Multiple presets لأنواع مختلفة من الـ endpoints

> **الأولوية:** P0 - حرج
> **الوقت المقدر:** 6 ساعات
> **المجال:** أمان + استقرار
> **الحالة:** ✅ تم الإصلاح

---

## 📋 ملخص المشكلة

**Issue ID:** CRITICAL-009
**Severity:** 🔴 CRITICAL - SECURITY VULNERABILITY
**Impact:** يسمح بـ DDoS attacks في بيئة multi-instance (تم حله ✅)

---

## 🎯 المشكلة بالتفصيل

الـ Rate Limiting الحالي يستخدم **In-Memory Map** مما يعني:

1. كل Edge instance لها store منفصل
2. المهاجم يمكنه تجاوز الـ limit بالوصول لـ instances مختلفة
3. لا يوجد حماية حقيقية في Production

---

## 📁 الملفات المتأثرة

```
lib/security/edge-rate-limit.ts    # الملف الرئيسي - يجب تعديله
lib/rate-limit.ts                  # يحاول استخدام Upstash لكن يفشل في Edge
middleware.ts                      # يستخدم edge-rate-limit
```

---

## 🐛 الكود الحالي (المعطوب)

```typescript
// lib/security/edge-rate-limit.ts - Line 15-17
// Global store - persists across requests in the same edge instance
// Note: This is NOT distributed - each edge node has its own store
const rateLimitStore = new Map<string, RateLimitEntry>();
```

**لماذا هذا خطير:**

- في Vercel، كل request قد يذهب لـ instance مختلفة
- المهاجم يرسل 100 request، كل واحد يذهب لـ instance مختلفة = 0 rate limiting
- الـ comment يعترف بالمشكلة لكن لا يوجد حل

---

## ✅ الحل المطلوب

### الخيار 1: Upstash Redis (الموصى به)

```typescript
// lib/security/edge-rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ============================================================================
// DISTRIBUTED RATE LIMITING USING UPSTASH REDIS
// ============================================================================
// This implementation uses Upstash Redis which is Edge-compatible and provides
// distributed rate limiting across all instances.
// ============================================================================

let ratelimit: Ratelimit | null = null;

function getRateLimiter(): Ratelimit | null {
  if (ratelimit) return ratelimit;

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    console.error(
      "[CRITICAL] Upstash Redis not configured. Rate limiting is DISABLED. " +
        "Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables.",
    );
    return null;
  }

  const redis = new Redis({
    url: redisUrl,
    token: redisToken,
  });

  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, "1 m"), // 100 requests per minute
    analytics: true,
    prefix: "nnh:ratelimit",
  });

  return ratelimit;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export async function checkEdgeRateLimit(
  identifier: string,
  config?: { limit?: number; window?: string },
): Promise<RateLimitResult> {
  const limiter = getRateLimiter();

  // FAIL CLOSED: If Redis not available, DENY the request
  if (!limiter) {
    console.error("[SECURITY] Rate limiter unavailable - denying request");
    return {
      success: false,
      limit: 0,
      remaining: 0,
      reset: Date.now() + 60000,
    };
  }

  try {
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    console.error("[SECURITY] Rate limit check failed:", error);
    // FAIL CLOSED on error
    return {
      success: false,
      limit: 0,
      remaining: 0,
      reset: Date.now() + 60000,
    };
  }
}

// Rate limit configurations for different endpoints
export const RATE_LIMIT_CONFIGS = {
  default: { limit: 100, window: "1 m" },
  auth: { limit: 10, window: "1 m" }, // Strict for auth endpoints
  ai: { limit: 20, window: "1 m" }, // AI endpoints (cost control)
  api: { limit: 60, window: "1 m" }, // General API
  webhook: { limit: 200, window: "1 m" }, // Webhooks need higher limit
} as const;
```

### الخيار 2: Vercel KV (بديل)

```typescript
// lib/security/edge-rate-limit.ts
import { kv } from "@vercel/kv";

export async function checkEdgeRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 60000,
): Promise<RateLimitResult> {
  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    // Use Redis sorted set for sliding window
    const pipeline = kv.pipeline();

    // Remove old entries
    pipeline.zremrangebyscore(key, 0, windowStart);

    // Add current request
    pipeline.zadd(key, { score: now, member: `${now}-${Math.random()}` });

    // Count requests in window
    pipeline.zcard(key);

    // Set expiry
    pipeline.expire(key, Math.ceil(windowMs / 1000));

    const results = await pipeline.exec();
    const count = results[2] as number;

    return {
      success: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      reset: now + windowMs,
    };
  } catch (error) {
    console.error("[SECURITY] Rate limit check failed:", error);
    // FAIL CLOSED
    return { success: false, limit: 0, remaining: 0, reset: now + windowMs };
  }
}
```

---

## 🔍 خطوات التنفيذ

### Step 1: إعداد Upstash Redis

```bash
# 1. اذهب إلى https://upstash.com
# 2. أنشئ Redis database جديد
# 3. انسخ REST URL و REST Token
# 4. أضفهم للـ environment variables
```

### Step 2: تثبيت الـ Dependencies

```bash
npm install @upstash/ratelimit @upstash/redis
```

### Step 3: تحديث .env.example

```bash
# أضف هذه المتغيرات
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxxxxxxxxxxxx
```

### Step 4: استبدال الملف

```bash
# احذف الكود القديم واستبدله بالجديد
# تأكد من حذف rateLimitStore Map بالكامل
```

### Step 5: تحديث middleware.ts

```typescript
// middleware.ts
import {
  checkEdgeRateLimit,
  RATE_LIMIT_CONFIGS,
} from "@/lib/security/edge-rate-limit";

export async function middleware(request: NextRequest) {
  const ip = getClientIP(request);
  const path = request.nextUrl.pathname;

  // Select appropriate rate limit config
  let config = RATE_LIMIT_CONFIGS.default;
  if (path.startsWith("/api/auth")) {
    config = RATE_LIMIT_CONFIGS.auth;
  } else if (path.startsWith("/api/ai")) {
    config = RATE_LIMIT_CONFIGS.ai;
  }

  const result = await checkEdgeRateLimit(`${ip}:${path}`, config);

  if (!result.success) {
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil((result.reset - Date.now()) / 1000)),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
      },
    });
  }

  // Continue with request...
}
```

---

## ✅ معايير القبول

قبل وضع علامة "مكتمل"، تأكد من:

- [ ] تم تثبيت `@upstash/ratelimit` و `@upstash/redis`
- [ ] تم حذف `rateLimitStore = new Map()` بالكامل
- [ ] تم إضافة `UPSTASH_REDIS_REST_URL` و `UPSTASH_REDIS_REST_TOKEN` للـ .env.example
- [ ] الـ Rate Limiter يفشل بشكل آمن (FAIL CLOSED) إذا Redis غير متاح
- [ ] تم تحديث middleware.ts لاستخدام الـ distributed rate limiter
- [ ] لا توجد أخطاء TypeScript: `npx tsc --noEmit`
- [ ] لا توجد أخطاء Lint: `npm run lint`
- [ ] تم اختبار الـ rate limiting يدوياً

---

## 🧪 اختبار الحل

### Test 1: التحقق من الاتصال بـ Redis

```typescript
// tests/rate-limit.test.ts
import { checkEdgeRateLimit } from "@/lib/security/edge-rate-limit";

describe("Distributed Rate Limiting", () => {
  it("should connect to Upstash Redis", async () => {
    const result = await checkEdgeRateLimit("test-user");
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("remaining");
  });

  it("should rate limit after exceeding threshold", async () => {
    const identifier = `test-${Date.now()}`;

    // Make requests up to limit
    for (let i = 0; i < 100; i++) {
      await checkEdgeRateLimit(identifier);
    }

    // Next request should be blocked
    const result = await checkEdgeRateLimit(identifier);
    expect(result.success).toBe(false);
  });
});
```

### Test 2: اختبار يدوي

```bash
# استخدم curl لإرسال requests متعددة
for i in {1..150}; do
  curl -s -o /dev/null -w "%{http_code}\n" https://your-app.vercel.app/api/test
done

# يجب أن ترى 429 بعد 100 request
```

---

## 🚨 تحذيرات مهمة

### ⛔ ممنوع:

- استخدام In-Memory Map للـ rate limiting في Production
- تجاهل فشل Redis (يجب FAIL CLOSED)
- استخدام `Math.random()` في الـ identifier

### ✅ مطلوب:

- Distributed storage (Redis/KV)
- Fail closed on errors
- Proper logging for security events
- Different limits for different endpoints

---

## 📚 مراجع

- [Upstash Ratelimit Documentation](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview)
- [Vercel Edge Rate Limiting](https://vercel.com/docs/functions/edge-functions/edge-rate-limiting)
- [OWASP Rate Limiting](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)

---

**Status:** ✅ COMPLETED
**Blocked By:** None
**Blocks:** None

---

**هذا إصلاح أمني حرج. لا تنشر للـ Production بدون rate limiting موزع!** 🔒
