# ✅ [COMPLETED] CRITICAL FIX: AI Endpoints بدون Rate Limiting

> ⚠️ **قبل البدء:** اقرأ `AI_AGENT_START_HERE.md` أولاً! اقرأ الملف المستهدف كاملاً قبل أي تعديل.

> **تم التطبيق بالكامل** ✅ - Applied on Nov 30, 2025
> **التغييرات:**
>
> - إنشاء `lib/security/ai-rate-limit.ts` مع tier-based limits
> - إنشاء `lib/api/with-ai-protection.ts` HOF
> - تحديث `/api/ai/chat` و `/api/ai/generate` routes
> - Rate limiting لكل user ولكل endpoint type
> - FAIL CLOSED إذا Redis غير متوفر (حماية التكلفة)

> **الأولوية:** P0 - حرج
> **الوقت المقدر:** 3 ساعات
> **المجال:** أمان + تكلفة
> **الحالة:** ✅ تم الإصلاح

---

## 📋 ملخص المشكلة

**Issue ID:** CRITICAL-013
**Severity:** 🔴 CRITICAL - COST & SECURITY
**Impact:** تكاليف AI غير محدودة + إساءة استخدام

---

## 🎯 المشكلة بالتفصيل

الـ AI endpoints (`/api/ai/*`) لا تحتوي على rate limiting:

1. مستخدم واحد يمكنه إرسال آلاف الـ requests
2. كل request يكلف مال (OpenAI/Anthropic)
3. يمكن استنزاف الـ budget بالكامل في دقائق
4. لا يوجد حماية من الإساءة

---

## 📁 الملفات المتأثرة

```
app/api/ai/chat/route.ts
app/api/ai/chat/stream/route.ts
app/api/ai/generate/route.ts
app/api/ai/analyze/route.ts
app/api/questions/auto-answer/route.ts
app/api/reviews/generate-response/route.ts
```

---

## 🐛 الكود الحالي (المعطوب)

```typescript
// app/api/ai/chat/route.ts
export async function POST(request: Request) {
  // ❌ لا يوجد rate limiting!
  // ❌ لا يوجد usage tracking!
  // ❌ لا يوجد cost control!

  const { message } = await request.json();

  // يستدعي OpenAI مباشرة بدون حدود
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: message }],
  });

  return Response.json({ response: response.choices[0].message });
}
```

**لماذا هذا خطير:**

- GPT-4: ~$0.03 per 1K tokens
- 1000 request × 1000 tokens = $30
- مهاجم يرسل 100,000 request = $3,000+ في ساعة واحدة!

---

## ✅ الحل المطلوب

### Step 1: إنشاء AI Rate Limiter

```typescript
// lib/security/ai-rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { createClient } from "@/lib/supabase/server";

// ============================================================================
// AI-SPECIFIC RATE LIMITING
// ============================================================================
// Different limits for different AI operations based on cost and risk.
// ============================================================================

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Rate limit configurations per AI endpoint type
export const AI_RATE_LIMITS = {
  // Chat: Most common, moderate cost
  chat: {
    free: { requests: 10, window: "1 h" }, // 10 requests/hour for free users
    pro: { requests: 100, window: "1 h" }, // 100 requests/hour for pro
    enterprise: { requests: 1000, window: "1 h" },
  },

  // Generation: Higher cost (longer outputs)
  generate: {
    free: { requests: 5, window: "1 h" },
    pro: { requests: 50, window: "1 h" },
    enterprise: { requests: 500, window: "1 h" },
  },

  // Auto-answer: Very high cost (multiple API calls)
  autoAnswer: {
    free: { requests: 3, window: "1 d" }, // 3 per day for free
    pro: { requests: 50, window: "1 d" },
    enterprise: { requests: 500, window: "1 d" },
  },
} as const;

type AIEndpointType = keyof typeof AI_RATE_LIMITS;
type UserTier = "free" | "pro" | "enterprise";

/**
 * Creates a rate limiter for a specific AI endpoint and user tier.
 */
function createAIRateLimiter(
  endpointType: AIEndpointType,
  userTier: UserTier,
): Ratelimit {
  const config = AI_RATE_LIMITS[endpointType][userTier];

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(
      config.requests,
      config.window as Parameters<typeof Ratelimit.slidingWindow>[1],
    ),
    analytics: true,
    prefix: `nnh:ai:${endpointType}:${userTier}`,
  });
}

export interface AIRateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

/**
 * Checks AI rate limit for a user.
 */
export async function checkAIRateLimit(
  userId: string,
  endpointType: AIEndpointType,
): Promise<AIRateLimitResult> {
  // Get user tier from database
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", userId)
    .single();

  const userTier: UserTier = profile?.subscription_tier || "free";

  const limiter = createAIRateLimiter(endpointType, userTier);
  const identifier = `${userId}:${endpointType}`;

  try {
    const result = await limiter.limit(identifier);

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      retryAfter: result.success
        ? undefined
        : Math.ceil((result.reset - Date.now()) / 1000),
    };
  } catch (error) {
    console.error("[AI Rate Limit] Check failed:", error);
    // FAIL CLOSED for AI endpoints (cost protection)
    return {
      success: false,
      limit: 0,
      remaining: 0,
      reset: Date.now() + 60000,
      retryAfter: 60,
    };
  }
}

/**
 * Tracks AI usage for billing and analytics.
 */
export async function trackAIUsage(
  userId: string,
  endpointType: AIEndpointType,
  tokensUsed: number,
  model: string,
): Promise<void> {
  const supabase = await createClient();

  await supabase.from("ai_usage_logs").insert({
    user_id: userId,
    endpoint_type: endpointType,
    tokens_used: tokensUsed,
    model,
    estimated_cost: calculateCost(model, tokensUsed),
    created_at: new Date().toISOString(),
  });
}

/**
 * Calculates estimated cost based on model and tokens.
 */
function calculateCost(model: string, tokens: number): number {
  const costs: Record<string, number> = {
    "gpt-4": 0.00003, // $0.03 per 1K tokens
    "gpt-4-turbo": 0.00001, // $0.01 per 1K tokens
    "gpt-3.5-turbo": 0.000002, // $0.002 per 1K tokens
    "claude-3-opus": 0.000015,
    "claude-3-sonnet": 0.000003,
  };

  const costPerToken = costs[model] || 0.00001;
  return tokens * costPerToken;
}
```

### Step 2: إنشاء AI Auth Middleware

```typescript
// lib/api/with-ai-protection.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAIRateLimit, trackAIUsage } from "@/lib/security/ai-rate-limit";

type AIEndpointType = "chat" | "generate" | "autoAnswer";

interface AIProtectionOptions {
  endpointType: AIEndpointType;
  requireAuth?: boolean;
}

/**
 * Higher-order function to protect AI endpoints with:
 * 1. Authentication
 * 2. Rate limiting
 * 3. Usage tracking
 */
export function withAIProtection(
  handler: (request: Request, context: { userId: string }) => Promise<Response>,
  options: AIProtectionOptions,
) {
  return async (request: Request): Promise<Response> => {
    // 1. Authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required for AI endpoints" },
        { status: 401 },
      );
    }

    // 2. Rate Limiting
    const rateLimit = await checkAIRateLimit(user.id, options.endpointType);

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: "AI rate limit exceeded",
          limit: rateLimit.limit,
          remaining: rateLimit.remaining,
          retryAfter: rateLimit.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfter || 60),
            "X-RateLimit-Limit": String(rateLimit.limit),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
          },
        },
      );
    }

    // 3. Execute handler
    const response = await handler(request, { userId: user.id });

    // 4. Add rate limit headers to response
    const newResponse = new NextResponse(response.body, response);
    newResponse.headers.set("X-RateLimit-Limit", String(rateLimit.limit));
    newResponse.headers.set(
      "X-RateLimit-Remaining",
      String(rateLimit.remaining - 1),
    );

    return newResponse;
  };
}
```

### Step 3: تحديث AI Routes

```typescript
// app/api/ai/chat/route.ts
import { withAIProtection } from "@/lib/api/with-ai-protection";
import { trackAIUsage } from "@/lib/security/ai-rate-limit";

async function handleChat(
  request: Request,
  { userId }: { userId: string },
): Promise<Response> {
  const { message, conversationHistory } = await request.json();

  // Validate input
  if (!message || typeof message !== "string") {
    return Response.json({ error: "Message is required" }, { status: 400 });
  }

  // Call AI provider
  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [...conversationHistory, { role: "user", content: message }],
    max_tokens: 1000, // Limit output to control costs
  });

  // Track usage
  const tokensUsed = response.usage?.total_tokens || 0;
  await trackAIUsage(userId, "chat", tokensUsed, "gpt-4-turbo");

  return Response.json({
    response: response.choices[0].message.content,
    usage: {
      tokens: tokensUsed,
      remaining: response.headers?.get("X-RateLimit-Remaining"),
    },
  });
}

export const POST = withAIProtection(handleChat, {
  endpointType: "chat",
});
```

### Step 4: إنشاء Usage Dashboard Component

```typescript
// components/ai/ai-usage-display.tsx
"use client";

import { useEffect, useState } from "react";

interface UsageData {
  used: number;
  limit: number;
  resetAt: string;
}

export function AIUsageDisplay() {
  const [usage, setUsage] = useState<UsageData | null>(null);

  useEffect(() => {
    fetch("/api/ai/usage")
      .then((res) => res.json())
      .then(setUsage);
  }, []);

  if (!usage) return null;

  const percentage = (usage.used / usage.limit) * 100;
  const isLow = percentage > 80;

  return (
    <div className={`p-4 rounded-lg ${isLow ? "bg-red-50" : "bg-gray-50"}`}>
      <h3 className="font-medium">AI Usage</h3>
      <div className="mt-2">
        <div className="flex justify-between text-sm">
          <span>{usage.used} / {usage.limit} requests</span>
          <span>{Math.round(percentage)}%</span>
        </div>
        <div className="mt-1 h-2 bg-gray-200 rounded-full">
          <div
            className={`h-full rounded-full ${isLow ? "bg-red-500" : "bg-blue-500"}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Resets: {new Date(usage.resetAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
```

---

## 🔍 خطوات التنفيذ

### Step 1: إنشاء الملفات

```bash
touch lib/security/ai-rate-limit.ts
touch lib/api/with-ai-protection.ts
```

### Step 2: إنشاء جدول Usage في Database

```sql
-- supabase/migrations/xxx_add_ai_usage_logs.sql
CREATE TABLE ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint_type TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  model TEXT NOT NULL,
  estimated_cost DECIMAL(10, 6),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for querying user usage
CREATE INDEX idx_ai_usage_user_date ON ai_usage_logs(user_id, created_at);

-- RLS
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage"
  ON ai_usage_logs FOR SELECT
  USING (auth.uid() = user_id);
```

### Step 3: تحديث جميع AI Routes

```bash
# ابحث عن جميع AI routes
find app/api -name "*.ts" | xargs grep -l "openai\|anthropic"
# حدث كل واحد منهم
```

---

## ✅ معايير القبول

قبل وضع علامة "مكتمل"، تأكد من:

- [ ] تم إنشاء `ai-rate-limit.ts` مع حدود مختلفة لكل tier
- [ ] تم إنشاء `with-ai-protection.ts` HOF
- [ ] جميع AI routes تستخدم `withAIProtection`
- [ ] تم إنشاء جدول `ai_usage_logs` في Database
- [ ] الـ rate limit headers تُرسل في كل response
- [ ] المستخدم يرى usage في الـ dashboard
- [ ] Free users محدودين بـ 10 requests/hour
- [ ] لا توجد أخطاء TypeScript: `npx tsc --noEmit`
- [ ] لا توجد أخطاء Lint: `npm run lint`

---

## 🧪 اختبار الحل

### Test 1: Rate Limit

```bash
# أرسل 11 requests كـ free user
for i in {1..11}; do
  curl -X POST http://localhost:3000/api/ai/chat \
    -H "Content-Type: application/json" \
    -d '{"message": "test"}'
done

# الـ request الـ 11 يجب أن يرجع 429
```

### Test 2: Usage Tracking

```sql
-- تحقق من تسجيل الاستخدام
SELECT * FROM ai_usage_logs WHERE user_id = 'xxx' ORDER BY created_at DESC;
```

---

## 🚨 تحذيرات مهمة

### ⛔ ممنوع:

- AI endpoints بدون authentication
- AI endpoints بدون rate limiting
- عدم تتبع الاستخدام
- حدود عالية جداً للـ free tier

### ✅ مطلوب:

- Rate limiting per user per endpoint
- Usage tracking for billing
- Different limits per subscription tier
- Cost estimation and alerts

---

**Status:** ✅ COMPLETED
**Blocked By:** None
**Blocks:** None

---

**هذا إصلاح حرج للتكلفة. بدونه، يمكن استنزاف الـ budget بالكامل!** 💰
