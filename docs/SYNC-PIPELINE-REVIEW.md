# 🔄 تقرير مراجعة خط أنابيب المزامنة (المرحلة 3)

> **تاريخ المراجعة**: 2025-12-05
> **الهدف**: التأكد من أن "الأنابيب" التي تنقل البيانات من جوجل لقاعدة البيانات موصولة وليست مسدودة

---

## 📁 الملفات المراجعة

| الملف                                   | الوظيفة                                  |
| --------------------------------------- | ---------------------------------------- |
| `server/workers/sync-worker.ts`         | معالج الـ jobs (micro-jobs architecture) |
| `server/actions/sync-queue.ts`          | إدارة طابور المزامنة                     |
| `server/actions/gmb-sync.ts`            | جلب البيانات من Google APIs              |
| `app/api/cron/process-queue/route.ts`   | Cron job لمعالجة الطابور                 |
| `app/api/cron/prepare-actions/route.ts` | Cron job لتحضير الردود الآلية            |
| `app/api/gmb/enqueue-sync/route.ts`     | API لإضافة job للطابور                   |

---

## ✅ السيناريو 1: هل يقرأ النظام الحسابات النشطة فقط (`is_active=true`)؟

### الحالة: ⚠️ **جزئياً - يحتاج تحسين**

### ما هو موجود:

#### 1. `prepare-actions/route.ts` - ✅ يفلتر بـ `is_active`:

```typescript
// app/api/cron/prepare-actions/route.ts:51-54
const { data: users } = await supabase
  .from("gmb_locations")
  .select("user_id")
  .eq("is_active", true); // ✅ يفلتر المواقع النشطة فقط
```

#### 2. `enqueue-sync/route.ts` - ✅ يتحقق من `is_active`:

```typescript
// app/api/gmb/enqueue-sync/route.ts:95-103
if (!service.is_active) {
  return NextResponse.json(
    {
      error: "gmb_service_inactive",
      message: "GMB service is not active. Please reconnect your account.",
    },
    { status: 400 },
  );
}
```

#### 3. `sync-worker.ts` - ⚠️ **لا يفلتر الحسابات غير النشطة**:

```typescript
// server/workers/sync-worker.ts:139-143
const { data: account, error: accountError } = await admin
  .from("gmb_accounts")
  .select("account_id, user_id")
  .eq("id", metadata.accountId)
  .single(); // ❌ لا يوجد .eq("is_active", true)
```

### 🔴 المشكلة:

إذا تم إلغاء تفعيل حساب GMB أثناء وجود jobs في الطابور، سيستمر الـ worker في محاولة معالجتها.

### الحل المقترح:

```typescript
// إضافة فلتر is_active
const { data: account, error: accountError } = await admin
  .from("gmb_accounts")
  .select("account_id, user_id")
  .eq("id", metadata.accountId)
  .eq("is_active", true) // ✅ إضافة هذا السطر
  .single();

if (accountError || !account) {
  // Skip inactive accounts gracefully
  await updateJobStatus(jobId, "completed", "Account is inactive or not found");
  return { success: true, jobId, jobType, itemsProcessed: 0 };
}
```

---

## ✅ السيناريو 2: هل يتم تسجيل بداية ونهاية العملية في `gmb_sync_logs`؟

### الحالة: 🔴 **لا يوجد تسجيل في `gmb_sync_logs`**

### التحليل:

| الجدول             | الاستخدام             | الحالة                      |
| ------------------ | --------------------- | --------------------------- |
| `sync_queue`       | تتبع حالة الـ jobs    | ✅ يُستخدم                  |
| `sync_status`      | تتبع التقدم الفوري    | ✅ يُستخدم                  |
| `sync_worker_runs` | تتبع تشغيل الـ worker | ✅ معرف في Schema           |
| `gmb_sync_logs`    | سجلات تفصيلية         | ❌ **غير مستخدم في الكود!** |

### ما هو موجود:

#### 1. `sync_queue` - يسجل حالة الـ job:

```typescript
// server/actions/sync-queue.ts:546-565
export async function updateJobStatus(
  queueId: string,
  status: "processing" | "completed" | "failed",
  errorMessage?: string,
) {
  const updates = {
    status,
    updated_at: new Date().toISOString(),
    ...(status === "processing" && { started_at: new Date().toISOString() }),
    ...(status === "completed" && { completed_at: new Date().toISOString() }),
    ...(errorMessage && { error_message: errorMessage }),
  };
  // ...
}
```

#### 2. Logger - يسجل في console/Sentry:

```typescript
// server/workers/sync-worker.ts:67-72
syncLogger.info("Processing sync job", {
  jobId,
  jobType,
  accountId: metadata.accountId,
  locationId: metadata.locationId,
});
```

### 🔴 المشكلة:

- لا يوجد تسجيل في جدول `gmb_sync_logs` في قاعدة البيانات
- السجلات تذهب فقط للـ console/Sentry
- لا يمكن للمستخدم رؤية تاريخ المزامنة في الـ dashboard

### الحل المقترح:

إضافة دالة لتسجيل في `gmb_sync_logs`:

```typescript
async function logSyncEvent(
  accountId: string,
  userId: string,
  eventType: "start" | "complete" | "error",
  details: {
    jobId?: string;
    jobType?: string;
    itemsProcessed?: number;
    error?: string;
    duration_ms?: number;
  },
) {
  const admin = createAdminClient();
  await admin.from("gmb_sync_logs").insert({
    gmb_account_id: accountId,
    user_id: userId,
    event_type: eventType,
    details,
    created_at: new Date().toISOString(),
  });
}
```

---

## ✅ السيناريو 3: كيف يتعامل الكود مع خطأ Rate Limit 429؟

### الحالة: ⚠️ **جزئياً - يحتاج تحسين**

### ما هو موجود:

#### 1. Rate Limiting للـ API الداخلي - ✅ ممتاز:

```typescript
// app/api/gmb/enqueue-sync/route.ts:37-56
const rateLimitResult = await checkKeyRateLimit(
  rateLimitKey,
  ENQUEUE_SYNC_RATE_LIMIT, // 10 requests
  ENQUEUE_SYNC_WINDOW_MS, // per 10 minutes
);

if (!rateLimitResult.success) {
  return NextResponse.json(
    {
      error: "Rate limit exceeded",
      retryAfter: rateLimitResult.reset,
    },
    { status: 429 },
  );
}
```

#### 2. Throttling للـ Sync المكرر - ✅ ممتاز:

```typescript
// app/api/gmb/enqueue-sync/route.ts:127-144
if (existingJobs && existingJobs.length > 0) {
  return NextResponse.json(
    {
      error: "sync_in_progress",
      message: "A sync is already in progress for this account",
      existingJobId: existingJob.id,
    },
    { status: 429 },
  );
}
```

#### 3. Concurrency Limiting - ✅ موجود:

```typescript
// server/actions/gmb-sync.ts:33-35
const MAX_CONCURRENT_REQUESTS = 5;
const REQUEST_DELAY_MS = 200;
```

#### 4. معالجة 429 من Google API - 🔴 **غير موجود!**

```typescript
// server/actions/gmb-sync.ts:444-458
if (!response.ok) {
  const errorData = await response.json().catch(() => ({}));
  gmbLogger.error("Failed to fetch locations from Google", ...);
  throw new Error(...);  // ❌ يرمي خطأ مباشرة بدون retry
}
```

### 🔴 المشكلة:

عندما يرجع Google API خطأ 429 (Rate Limit Exceeded):

1. الكود يرمي خطأ مباشرة
2. الـ job يفشل
3. لا يوجد exponential backoff أو retry

### الحل المقترح:

```typescript
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetchWithTimeout(
      url,
      options,
      API_TIMEOUTS.GOOGLE_API,
    );

    if (response.ok) {
      return response;
    }

    // Handle rate limiting (429)
    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      const waitMs = retryAfter
        ? parseInt(retryAfter) * 1000
        : Math.pow(2, attempt) * 1000; // Exponential backoff

      gmbLogger.warn("Rate limited by Google API, waiting...", {
        attempt: attempt + 1,
        waitMs,
        retryAfter,
      });

      await new Promise((resolve) => setTimeout(resolve, waitMs));
      continue;
    }

    // Handle server errors (5xx) with retry
    if (response.status >= 500) {
      const waitMs = Math.pow(2, attempt) * 1000;
      gmbLogger.warn("Google API server error, retrying...", {
        status: response.status,
        attempt: attempt + 1,
        waitMs,
      });
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      continue;
    }

    // Other errors - don't retry
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `HTTP ${response.status}`);
  }

  throw lastError || new Error("Max retries exceeded");
}
```

---

## 📊 ملخص حلقة المزامنة (Sync Loop)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Sync Pipeline Flow                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User triggers sync                                           │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────────────────────────────┐                        │
│  │ POST /api/gmb/enqueue-sync          │                        │
│  │                                     │                        │
│  │ ✅ Rate limit check (10/10min)      │                        │
│  │ ✅ Check is_active on gmb_services  │                        │
│  │ ✅ Check for existing jobs (429)    │                        │
│  │ ✅ Add to sync_queue                │                        │
│  └─────────────────────────────────────┘                        │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────────────────────────────┐                        │
│  │ CRON: /api/cron/process-queue       │                        │
│  │ (runs every minute)                 │                        │
│  │                                     │                        │
│  │ ✅ Fetch pending jobs (limit 10)    │                        │
│  │ ✅ Mark as "processing"             │                        │
│  │ ✅ Process in parallel              │                        │
│  │ ⚠️ No is_active check on accounts   │                        │
│  └─────────────────────────────────────┘                        │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────────────────────────────┐                        │
│  │ sync-worker.ts                      │                        │
│  │                                     │                        │
│  │ ✅ Route to job handler             │                        │
│  │ ✅ Fetch from Google API            │                        │
│  │ ✅ Upsert to database               │                        │
│  │ ✅ Update job status                │                        │
│  │ ⚠️ No is_active filter              │                        │
│  │ 🔴 No 429 retry logic               │                        │
│  │ 🔴 No gmb_sync_logs                 │                        │
│  └─────────────────────────────────────┘                        │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────────────────────────────┐                        │
│  │ Database                            │                        │
│  │                                     │                        │
│  │ ✅ gmb_locations updated            │                        │
│  │ ✅ gmb_reviews updated              │                        │
│  │ ✅ sync_queue status updated        │                        │
│  │ 🔴 gmb_sync_logs NOT updated        │                        │
│  └─────────────────────────────────────┘                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔴 الثغرات المكتشفة (Data Leaks)

### 1. عدم فلترة الحسابات غير النشطة في Worker

**الموقع**: `server/workers/sync-worker.ts:139-143`

**الخطر**: Jobs قد تُعالج لحسابات معطلة، مما يهدر الموارد ويسبب أخطاء.

### 2. عدم وجود سجلات في `gmb_sync_logs`

**الموقع**: جميع ملفات المزامنة

**الخطر**: لا يمكن تتبع تاريخ المزامنة أو تشخيص المشاكل.

### 3. عدم معالجة 429 من Google API

**الموقع**: `server/actions/gmb-sync.ts`

**الخطر**: فشل المزامنة عند تجاوز حدود Google API بدلاً من الانتظار والمحاولة مجدداً.

---

## ✅ نقاط القوة

| الميزة                   | الحالة   | الموقع                     |
| ------------------------ | -------- | -------------------------- |
| Micro-jobs Architecture  | ✅ ممتاز | `sync-worker.ts`           |
| Rate Limiting للـ API    | ✅ ممتاز | `enqueue-sync/route.ts`    |
| Concurrency Control      | ✅ ممتاز | `gmb-sync.ts`              |
| Job Status Tracking      | ✅ ممتاز | `sync-queue.ts`            |
| Token Auto-Refresh       | ✅ ممتاز | `TokenManager` class       |
| Parallel Processing      | ✅ ممتاز | `Promise.allSettled`       |
| Fail-Safe Error Handling | ✅ ممتاز | `updateJobStatus` on error |

---

## 📝 الإصلاحات المطلوبة

### أولوية عالية:

- [x] **إضافة فلتر `is_active` في `sync-worker.ts`** ✅ **تم الإصلاح**
- [ ] **إضافة retry logic لـ 429 من Google API**
- [ ] **إضافة تسجيل في `gmb_sync_logs`**

### أولوية متوسطة:

- [ ] **إضافة exponential backoff للأخطاء**
- [ ] **إضافة metrics للمزامنة (نجاح/فشل/مدة)**

---

## ✅ الإصلاحات المنجزة

### 1. إضافة فلتر `is_active` في `sync-worker.ts`

**الملف**: `server/workers/sync-worker.ts`

**التغيير**:

```typescript
// قبل
const { data: account } = await admin
  .from("gmb_accounts")
  .select("account_id, user_id")
  .eq("id", metadata.accountId)
  .single();

// بعد
const { data: account } = await admin
  .from("gmb_accounts")
  .select("account_id, user_id, is_active") // ✅ إضافة is_active
  .eq("id", metadata.accountId)
  .single();

// Skip inactive accounts gracefully
if (!account.is_active) {
  syncLogger.warn("Skipping sync for inactive account", { jobId, accountId });
  await updateJobStatus(jobId, "completed", "Account is inactive - skipped");
  return { success: true, jobId, jobType, itemsProcessed: 0 };
}
```

---

## 🎯 الخلاصة

| السيناريو                | الحالة   | ملاحظات                       |
| ------------------------ | -------- | ----------------------------- |
| فلترة `is_active`        | ⚠️ جزئي  | موجود في API، مفقود في Worker |
| تسجيل في `gmb_sync_logs` | 🔴 مفقود | يسجل في console فقط           |
| معالجة 429 Rate Limit    | 🔴 مفقود | يفشل مباشرة بدون retry        |
| Rate Limiting داخلي      | ✅ ممتاز | 10 requests/10min             |
| Concurrency Control      | ✅ ممتاز | 5 concurrent + 200ms delay    |
| Token Refresh            | ✅ ممتاز | Auto-refresh قبل الانتهاء     |

**التقييم العام**: حلقة المزامنة **سليمة بنسبة 75%**، تحتاج إصلاحات في معالجة الأخطاء والتسجيل.

**هل الحلقة مغلقة بإحكام؟** ⚠️ **لا - هناك تسريبات**:

1. Jobs قد تُعالج لحسابات معطلة
2. لا يوجد سجل دائم للمزامنة
3. 429 من Google يسبب فشل فوري
