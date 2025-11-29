# GMB Sync Architecture

## Overview

The GMB (Google My Business) sync system has been refactored to eliminate the "split-brain" architecture and prevent serverless timeouts. The new architecture uses a job queue pattern with Supabase Edge Functions for background processing.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER REQUEST                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    /api/gmb/sync (Lightweight Trigger)                       │
│  • Validates authentication                                                  │
│  • Checks rate limits                                                        │
│  • Enqueues job to sync_queue via RPC                                       │
│  • Returns 202 Accepted + job_id immediately                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         sync_queue (Database Table)                          │
│  • Stores pending/running/completed/failed jobs                             │
│  • Tracks attempts, priority, scheduled_at                                  │
│  • Managed by enqueue_sync_job RPC function                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                  gmb-sync-worker (Edge Function - Orchestrator)              │
│  • Triggered by pg_cron or manual invocation                                │
│  • Picks pending jobs from sync_queue                                       │
│  • Calls gmb-process for each job                                           │
│  • Updates job status based on results                                      │
│  • Implements circuit breaker for consecutive failures                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    gmb-process (Edge Function - Executor)                    │
│  • Receives job details from worker                                         │
│  • Calls /api/gmb/sync-v2 (internal endpoint)                              │
│  • Handles timeouts and errors                                              │
│  • Updates job status in sync_queue                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                  /api/gmb/sync-v2 (Internal Only Endpoint)                   │
│  • Requires X-Internal-Run header authentication                            │
│  • Calls performTransactionalSync server action                             │
│  • Executes actual Google API calls                                         │
│  • Uses database transactions for data integrity                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              performTransactionalSync (Server Action)                        │
│  • Fetches locations, reviews, questions from Google APIs                   │
│  • Uses TokenManager for automatic token refresh                            │
│  • Calls sync_gmb_data_transactional RPC for atomic writes                 │
│  • Invalidates caches after successful sync                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│            sync_gmb_data_transactional (Database RPC Function)               │
│  • Atomic transaction for all database writes                               │
│  • Upserts locations, reviews, questions in batches                         │
│  • Rolls back on any failure                                                │
│  • Returns sync statistics                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Public API Endpoints

| Endpoint                | Method | Purpose                                                |
| ----------------------- | ------ | ------------------------------------------------------ |
| `/api/gmb/sync`         | POST   | Lightweight trigger - returns 202 Accepted immediately |
| `/api/gmb/sync-status`  | GET    | Check job status by jobId or accountId                 |
| `/api/gmb/sync-trigger` | POST   | Alternative trigger endpoint (same as /sync)           |

### 2. Internal API Endpoints

| Endpoint           | Method | Purpose                                   |
| ------------------ | ------ | ----------------------------------------- |
| `/api/gmb/sync-v2` | POST   | Internal-only endpoint for Edge Functions |

### 3. Supabase Edge Functions

| Function                | Purpose                                     |
| ----------------------- | ------------------------------------------- |
| `gmb-sync`              | Enqueues sync jobs (called by frontend)     |
| `gmb-sync-worker`       | Orchestrates job processing                 |
| `gmb-process`           | Executes individual sync jobs               |
| `scheduled-sync`        | Batch-enqueues jobs for all active accounts |
| `gmb-sync-queue-worker` | Alternative PGMQ-based worker               |

### 4. Database Tables

| Table              | Purpose                        |
| ------------------ | ------------------------------ |
| `sync_queue`       | Job queue with status tracking |
| `sync_status`      | Per-account sync status        |
| `sync_worker_runs` | Worker execution logs          |
| `gmb_sync_logs`    | Detailed phase logs            |

## Data Integrity

### Transaction Guarantees

All database writes are wrapped in PostgreSQL transactions via the `sync_gmb_data_transactional` RPC function:

```sql
-- Pseudo-code for the transaction
BEGIN;
  -- Upsert locations
  INSERT INTO gmb_locations ... ON CONFLICT DO UPDATE;

  -- Upsert reviews
  INSERT INTO gmb_reviews ... ON CONFLICT DO UPDATE;

  -- Upsert questions
  INSERT INTO gmb_questions ... ON CONFLICT DO UPDATE;

  -- Update sync status
  UPDATE sync_status SET last_sync_at = NOW();
COMMIT;
-- If any step fails, entire transaction is rolled back
```

### Retry Logic

- Jobs have configurable `max_attempts` (default: 3)
- Exponential backoff between retries: 60s, 120s, 240s
- Failed jobs are marked with error message for debugging
- Circuit breaker stops processing after 5 consecutive failures

## Timeout Prevention

### Problem (Before)

- Next.js serverless functions have 10-60 second timeout limits
- Full sync could take 2-5 minutes for accounts with many locations
- Resulted in 504 Gateway Timeout errors

### Solution (After)

- Public endpoint returns 202 Accepted in <100ms
- Actual sync runs in Edge Functions (up to 150 second limit)
- Long syncs are broken into batches
- Job status can be polled via `/api/gmb/sync-status`

## Rate Limiting

- 10 sync requests per hour per user/account
- Enforced at the trigger endpoint level
- Returns 429 Too Many Requests with Retry-After header

## Usage Examples

### Trigger a Sync

```typescript
const response = await fetch("/api/gmb/sync", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify({
    accountId: "uuid-of-gmb-account",
    syncType: "full", // or 'incremental'
    priority: 0,
  }),
});

// Response: 202 Accepted
const { job_id, status_url } = await response.json();
// job_id: "uuid-of-job"
// status_url: "/api/gmb/sync-status?jobId=uuid-of-job"
```

### Check Sync Status

```typescript
const response = await fetch(`/api/gmb/sync-status?jobId=${jobId}`, {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});

const { job, is_complete, is_success } = await response.json();
// job.status: "pending" | "running" | "completed" | "failed"
// job.progress: 0-100
// job.error: error message if failed
```

## Environment Variables

Required for Edge Functions:

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
TRIGGER_SECRET=xxx
NEXT_PUBLIC_APP_URL=https://your-app.com
```

## Migration Notes

### Breaking Changes

- `/api/gmb/sync` no longer returns sync results directly
- Must poll `/api/gmb/sync-status` for results
- Response code changed from 200 to 202

### Backward Compatibility

- Old clients will receive 202 instead of 200
- `job_id` field added to response
- Sync still completes, just asynchronously

## Monitoring

### Key Metrics to Track

- Job queue depth (pending jobs in sync_queue)
- Job success/failure rate
- Average sync duration
- Worker run frequency

### Logs to Monitor

- `[GMB Sync]` - Trigger endpoint logs
- `[sync-v2]` - Internal endpoint logs
- `[GMB Process]` - Edge Function logs
- `[Worker]` - Worker orchestrator logs
