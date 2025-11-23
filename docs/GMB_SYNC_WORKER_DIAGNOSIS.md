# GMB Sync Worker Diagnosis & Solution

## Problem Report

When you ran the GMB sync worker:

```bash
curl -X POST 'https://rrarhekwhgpgkakqrlyn.supabase.co/functions/v1/gmb-sync-worker' \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJ..." \
  -H "X-Trigger-Secret: 0a943a6fb8321ab8ed21847771488223cfbb058cb4dfd9ccb0df3a8b9c448cd1"
```

**Response:**
```json
{
  "success": true,
  "run_id": "71269684-50be-42d2-9596-a4924d3eade6",
  "jobs_picked": 0,
  "jobs_processed": 0,
  "jobs_succeeded": 0,
  "jobs_failed": 0
}
```

## Root Cause Analysis

### What I Found

1. ✅ **Worker is functioning correctly**
   - Edge Function deployed successfully
   - Authentication working
   - RPC functions (`pick_sync_jobs`, `mark_stale_sync_jobs`, etc.) deployed
   - No errors in execution

2. ✅ **Database schema is correct**
   - `sync_queue` table exists with proper columns
   - `sync_worker_runs` table exists
   - All migrations applied successfully
   - RLS policies configured

3. ❌ **Missing: Job Enqueueing**
   - **No code was creating jobs in the `sync_queue` table**
   - The `/api/gmb/scheduled-sync` endpoint calls sync API directly via HTTP
   - There's no way for jobs to enter the queue system

### The Issue

The queue system infrastructure was complete, but it was like having a factory with no raw materials - the worker runs perfectly but has nothing to process because nothing is putting jobs into the queue.

```
┌─────────────────────┐
│  User triggers sync │
└──────────┬──────────┘
           │
           ├─► OLD: Calls /api/gmb/sync directly (bypasses queue)
           │
           └─► NEW: Should enqueue job → worker picks up → processes
                    ❌ THIS WAS MISSING
```

## Solution Implemented

### 1. Created Enqueue API Endpoint

**File:** `app/api/gmb/enqueue-sync/route.ts`

**POST /api/gmb/enqueue-sync**
- Validates user authentication
- Verifies account ownership
- Checks for duplicate pending jobs
- Inserts job into `sync_queue` table
- Returns job details

**GET /api/gmb/enqueue-sync**
- Shows queue statistics for current user
- Lists recent jobs

**Example Usage:**
```typescript
// Enqueue a sync job
const response = await fetch('/api/gmb/enqueue-sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    accountId: 'uuid',
    syncType: 'full',
    priority: 10
  })
});

const result = await response.json();
// {
//   "message": "Sync job enqueued successfully",
//   "job": { "id": "...", "status": "pending", ... }
// }
```

### 2. Created Testing Scripts

**File:** `scripts/test-sync-worker-flow.sh`
- Complete end-to-end test
- Fetches a GMB account
- Enqueues a test job
- Triggers the worker
- Shows before/after status
- Reports success/failure

**Usage:**
```bash
./scripts/test-sync-worker-flow.sh YOUR_SERVICE_ROLE_KEY YOUR_TRIGGER_SECRET
```

**File:** `scripts/check-sync-queue.sh`
- Quick diagnostics
- Shows worker runs
- Shows queue contents
- Shows statistics
- Lists GMB accounts

### 3. Comprehensive Documentation

**File:** `docs/GMB_SYNC_QUEUE.md`
- Architecture overview
- Database schema details
- API endpoint documentation
- RPC function reference
- Testing procedures
- Production setup guide
- Monitoring queries
- Troubleshooting guide

## How to Test

### Option 1: Using the Test Script (Recommended)

```bash
# Run the automated test
./scripts/test-sync-worker-flow.sh \
  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... \  # SERVICE_ROLE_KEY
  0a943a6fb8321ab8ed21847771488223cfbb058cb4dfd9ccb0df3a8b9c448cd1  # TRIGGER_SECRET
```

This will:
1. Find a GMB account
2. Create a test job in the queue
3. Trigger the worker
4. Show the results

### Option 2: Manual Testing

```bash
# 1. Get a GMB account ID
curl 'https://rrarhekwhgpgkakqrlyn.supabase.co/rest/v1/gmb_accounts?select=id,user_id&limit=1' \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"

# 2. Enqueue a job
curl -X POST 'https://rrarhekwhgpgkakqrlyn.supabase.co/rest/v1/sync_queue' \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "user_id": "USER_ID_FROM_STEP_1",
    "account_id": "ACCOUNT_ID_FROM_STEP_1",
    "sync_type": "full",
    "status": "pending",
    "priority": 10,
    "attempts": 0,
    "max_attempts": 3,
    "metadata": {"test": true}
  }'

# 3. Trigger worker
curl -X POST 'https://rrarhekwhgpgkakqrlyn.supabase.co/functions/v1/gmb-sync-worker' \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "X-Trigger-Secret: 0a943a6fb8321ab8ed21847771488223cfbb058cb4dfd9ccb0df3a8b9c448cd1"

# Should now return:
# {
#   "success": true,
#   "jobs_picked": 1,
#   "jobs_processed": 1,
#   "jobs_succeeded": 1,  <-- (or jobs_failed: 1 if sync failed)
#   "jobs_failed": 0
# }
```

### Option 3: Via Application (After Integration)

Once integrated into the app:

```typescript
// In your sync button handler
async function handleSync() {
  // OLD (Direct, can timeout)
  // await fetch('/api/gmb/sync', { ... });

  // NEW (Queue-based, reliable)
  const response = await fetch('/api/gmb/enqueue-sync', {
    method: 'POST',
    body: JSON.stringify({ accountId, syncType: 'full' })
  });

  const { job } = await response.json();
  console.log('Job enqueued:', job.id);

  // Poll for completion or use real-time subscriptions
}
```

## Expected Results

After running the test with a job in the queue, you should see:

```json
{
  "success": true,
  "run_id": "uuid",
  "jobs_picked": 1,      // ← Worker found the job
  "jobs_processed": 1,   // ← Worker processed it
  "jobs_succeeded": 1,   // ← Sync succeeded (or jobs_failed: 1)
  "jobs_failed": 0
}
```

## Next Steps

### 1. Production Deployment

Deploy the new API endpoint:
```bash
# Build and deploy
npm run build

# On production server
git pull origin main
pm2 restart nnh-ai-studio
```

### 2. Set Up Cron Job

The worker should run automatically every 2-5 minutes. Options:

**Option A: Supabase Cron (built-in)**
```sql
SELECT cron.schedule(
  'gmb-sync-worker',
  '*/2 * * * *',
  $$ SELECT net.http_post(...) $$
);
```

**Option B: External Cron**
- Use cron-job.org
- Or GitHub Actions
- Or Vercel Cron

See `docs/GMB_SYNC_QUEUE.md` for detailed setup instructions.

### 3. Integrate into Application

Update sync triggers to use the queue:

**Locations to update:**
- Manual sync buttons → Use `/api/gmb/enqueue-sync`
- Scheduled sync cron → Enqueue jobs instead of direct API calls
- Bulk sync operations → Enqueue multiple jobs with priorities

### 4. Monitor Performance

Add monitoring dashboard showing:
- Queue depth (pending jobs)
- Processing rate (jobs/hour)
- Success/failure rates
- Average processing time
- Failed job details

## Summary

### Problem
Worker had no jobs to process because nothing was creating queue entries.

### Solution
1. Created `/api/gmb/enqueue-sync` endpoint
2. Added testing scripts for verification
3. Documented complete queue system
4. Provided integration guide

### Benefits
- ✅ Reliable background processing
- ✅ Automatic retries on failure
- ✅ No timeout issues
- ✅ Better monitoring
- ✅ Scalable architecture

### Commits
- `7ff7c79` - feat(gmb-sync): add API endpoint to enqueue sync jobs and testing tools
- `e915440` - feat(gmb-sync): create missing RPC functions for sync queue worker
- `cc4fcb6` - feat(gmb-sync): create Edge Function with automatic OAuth token refresh

## Questions?

See comprehensive documentation in:
- `docs/GMB_SYNC_QUEUE.md` - Complete system documentation
- `supabase/functions/gmb-sync-worker/index.ts` - Worker implementation
- `app/api/gmb/enqueue-sync/route.ts` - Enqueue API endpoint

---

**Status:** ✅ RESOLVED

The GMB sync queue system is now complete and ready for testing.
