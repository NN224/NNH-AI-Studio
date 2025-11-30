# 🟡 MEDIUM PRIORITY: Health Check ناقص

> ⚠️ **قبل البدء:** اقرأ `AI_AGENT_START_HERE.md` أولاً! اقرأ الملف المستهدف كاملاً قبل أي تعديل.

> **الأولوية:** P2 - متوسط
> **الوقت المقدر:** 2 ساعات
> **المجال:** مراقبة

---

## 📋 ملخص المشكلة

**Issue ID:** MEDIUM-033
**Severity:** 🟡 MEDIUM - MONITORING
**Impact:** لا يمكن معرفة حالة النظام بشكل كامل

---

## 🎯 المشكلة بالتفصيل

الـ Health Check الحالي يفحص Supabase فقط:

1. لا يفحص Redis
2. لا يفحص External APIs (Google, AI providers)
3. لا يفحص Email service
4. لا يعطي صورة كاملة عن صحة النظام

---

## 📁 الملفات المتأثرة

```
app/api/health/route.ts
```

---

## ✅ الحل المطلوب

### تحديث Health Check

```typescript
// app/api/health/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Redis } from "@upstash/redis";

interface HealthCheck {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  latency?: number;
  message?: string;
}

interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  checks: HealthCheck[];
  uptime: number;
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const startTime = Date.now();
  const checks: HealthCheck[] = [];

  // 1. Database Check
  checks.push(await checkDatabase());

  // 2. Redis Check
  checks.push(await checkRedis());

  // 3. External API Checks
  checks.push(await checkGoogleAPI());

  // 4. AI Provider Check
  checks.push(await checkAIProvider());

  // Calculate overall status
  const hasUnhealthy = checks.some((c) => c.status === "unhealthy");
  const hasDegraded = checks.some((c) => c.status === "degraded");

  const overallStatus = hasUnhealthy
    ? "unhealthy"
    : hasDegraded
      ? "degraded"
      : "healthy";

  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "unknown",
    checks,
    uptime: process.uptime(),
  });
}

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("profiles").select("id").limit(1);

    if (error) throw error;

    return {
      name: "database",
      status: "healthy",
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      name: "database",
      status: "unhealthy",
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkRedis(): Promise<HealthCheck> {
  const start = Date.now();

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    return {
      name: "redis",
      status: "degraded",
      message: "Redis not configured",
    };
  }

  try {
    const redis = new Redis({ url: redisUrl, token: redisToken });
    await redis.ping();

    return {
      name: "redis",
      status: "healthy",
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      name: "redis",
      status: "unhealthy",
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkGoogleAPI(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    // Simple connectivity check
    const response = await fetch(
      "https://mybusinessbusinessinformation.googleapis.com/v1",
      {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
      },
    );

    return {
      name: "google_api",
      status: response.ok || response.status === 401 ? "healthy" : "degraded",
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      name: "google_api",
      status: "degraded",
      latency: Date.now() - start,
      message: "Cannot reach Google API",
    };
  }
}

async function checkAIProvider(): Promise<HealthCheck> {
  const start = Date.now();

  const openaiKey = process.env.OPENAI_API_KEY;

  if (!openaiKey) {
    return {
      name: "ai_provider",
      status: "degraded",
      message: "OpenAI not configured",
    };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${openaiKey}` },
      signal: AbortSignal.timeout(5000),
    });

    return {
      name: "ai_provider",
      status: response.ok ? "healthy" : "degraded",
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      name: "ai_provider",
      status: "degraded",
      latency: Date.now() - start,
      message: "Cannot reach AI provider",
    };
  }
}
```

---

## ✅ معايير القبول

- [ ] Health check يفحص Database
- [ ] Health check يفحص Redis
- [ ] Health check يفحص Google API
- [ ] Health check يفحص AI Provider
- [ ] يُرجع overall status صحيح
- [ ] يُرجع latency لكل service

---

**Status:** 🔴 NOT STARTED
