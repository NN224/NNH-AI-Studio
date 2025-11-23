# GMB Sync Queue System

## Overview

The GMB Sync Queue system provides reliable, asynchronous background synchronization for Google My Business data. It uses a queue-based architecture to handle sync jobs that may take longer than serverless function timeouts.

## Architecture

```
User Action → Enqueue Job → sync_queue table → Worker picks job → Processes sync → Updates status
```

### Components

1. **sync_queue table** - Stores pending/processing/completed sync jobs
2. **gmb-sync-worker Edge Function** - Picks jobs and processes them
3. **gmb-sync Edge Function** - Executes actual sync for a single account
4. **RPC Functions** - Atomic operations for job management

## Database Schema

### sync_queue Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | User who owns the account |
| `account_id` | UUID | GMB account to sync |
| `sync_type` | TEXT | 'full' or 'incremental' |
| `status` | TEXT | 'pending', 'processing', 'succeeded', 'failed' |
| `priority` | INTEGER | Higher = processed first (default: 0) |
| `attempts` | INTEGER | Number of attempts (default: 0) |
| `max_attempts` | INTEGER | Max retry attempts (default: 3) |
| `scheduled_at` | TIMESTAMPTZ | When to run (NULL = run immediately) |
| `last_error` | TEXT | Error from last failed attempt |
| `metadata` | JSONB | Additional context |
| `created_at` | TIMESTAMPTZ | When job was created |
| `started_at` | TIMESTAMPTZ | When job started processing |
| `completed_at` | TIMESTAMPTZ | When job finished |

### sync_worker_runs Table

Tracks each worker execution for monitoring and diagnostics.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `status` | TEXT | 'running', 'completed', 'failed' |
| `jobs_picked` | INTEGER | How many jobs were picked |
| `jobs_processed` | INTEGER | How many completed processing |
| `jobs_succeeded` | INTEGER | How many succeeded |
| `jobs_failed` | INTEGER | How many failed |
| `notes` | TEXT | Additional information |
| `metadata` | JSONB | Job results |
| `started_at` | TIMESTAMPTZ | When worker started |
| `finished_at` | TIMESTAMPTZ | When worker finished |

## RPC Functions

### pick_sync_jobs(job_limit)

Picks pending jobs using `FOR UPDATE SKIP LOCKED` to prevent race conditions.

```sql
SELECT * FROM pick_sync_jobs(10);  -- Pick up to 10 jobs
```

**Logic:**
- Selects jobs where `status = 'pending'`
- Filters by `scheduled_at <= NOW()` (or NULL)
- Ensures `attempts < max_attempts`
- Orders by `priority DESC, created_at ASC`
- Atomically updates status to 'processing'
- Increments attempts counter

### mark_stale_sync_jobs(stale_threshold_minutes)

Marks jobs stuck in 'processing' state as failed.

```sql
SELECT mark_stale_sync_jobs(10);  -- Mark jobs stuck for 10+ minutes
```

### update_sync_status_success(account_id, sync_type, completed_at)

Atomically updates sync_status when a job succeeds.

### update_sync_status_failure(account_id, error, completed_at)

Atomically updates sync_status when a job fails.

## API Endpoints

### POST /api/gmb/enqueue-sync

Enqueues a new sync job.

**Request:**
```json
{
  "accountId": "uuid",
  "syncType": "full",      // or "incremental"
  "priority": 10,          // optional, default: 0
  "scheduled_at": null     // optional, ISO timestamp
}
```

**Response (201):**
```json
{
  "message": "Sync job enqueued successfully",
  "job": {
    "id": "uuid",
    "account_id": "uuid",
    "account_name": "My Business",
    "sync_type": "full",
    "status": "pending",
    "priority": 10,
    "created_at": "2025-11-23T..."
  }
}
```

**Duplicate Detection:**
If a pending/processing job already exists for the account, returns:
```json
{
  "message": "Sync job already queued for this account",
  "job_id": "uuid",
  "status": "pending",
  "duplicate": true
}
```

### GET /api/gmb/enqueue-sync

Gets queue status for current user.

**Response (200):**
```json
{
  "stats": {
    "total": 15,
    "pending": 2,
    "processing": 1,
    "succeeded": 10,
    "failed": 2
  },
  "jobs": [
    {
      "id": "uuid",
      "account_id": "uuid",
      "sync_type": "full",
      "status": "pending",
      "attempts": 0,
      "max_attempts": 3,
      "created_at": "...",
      "scheduled_at": null
    }
  ]
}
```

### GET /api/diagnostics/sync-queue

Admin diagnostics for sync queue (requires authentication).

## Edge Functions

### gmb-sync-worker

Processes jobs from the queue.

**URL:** `{SUPABASE_URL}/functions/v1/gmb-sync-worker`

**Authentication:**
- Header: `X-Trigger-Secret: {TRIGGER_SECRET}`
- Or: `Authorization: Bearer {SERVICE_ROLE_KEY}`

**Request:**
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/gmb-sync-worker' \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "X-Trigger-Secret: YOUR_TRIGGER_SECRET"
```

**Response:**
```json
{
  "success": true,
  "run_id": "uuid",
  "jobs_picked": 3,
  "jobs_processed": 3,
  "jobs_succeeded": 2,
  "jobs_failed": 1
}
```

**Configuration:**
```typescript
const CONFIG = {
  WORKER_TIMEOUT_MS: 55000,      // Total execution time
  JOB_TIMEOUT_MS: 45000,          // Max time per job
  MAX_JOBS_PER_RUN: 10,           // Max jobs per invocation
  DEFAULT_MAX_ATTEMPTS: 3,        // Retry attempts
  RETRY_DELAY_BASE_MS: 60000,    // 1 minute base delay
  STALE_JOB_THRESHOLD_MS: 600000, // 10 minutes
  CIRCUIT_BREAKER_THRESHOLD: 5    // Stop after N failures
};
```

**Retry Logic:**
- Attempt 1 fails → retry in 1 minute (2^0 * 60s)
- Attempt 2 fails → retry in 2 minutes (2^1 * 60s)
- Attempt 3 fails → retry in 4 minutes (2^2 * 60s)
- After max_attempts → permanently failed

### gmb-sync

Executes the actual sync for a single account (called by worker).

**URL:** `{SUPABASE_URL}/functions/v1/gmb-sync`

**Request:**
```json
{
  "accountId": "uuid",
  "syncType": "full"
}
```

## Testing

### 1. Manual Job Enqueueing (via API)

```bash
# Using authentication (as logged-in user)
curl -X POST 'https://nnh.ae/api/gmb/enqueue-sync' \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "accountId": "your-account-id",
    "syncType": "full",
    "priority": 10
  }'
```

### 2. Manual Job Enqueueing (via Database)

```bash
# Using service role key
curl -X POST 'https://your-project.supabase.co/rest/v1/sync_queue' \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "user_id": "user-uuid",
    "account_id": "account-uuid",
    "sync_type": "full",
    "status": "pending",
    "priority": 10,
    "attempts": 0,
    "max_attempts": 3,
    "metadata": {"test": true}
  }'
```

### 3. Trigger Worker

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/gmb-sync-worker' \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "X-Trigger-Secret: YOUR_TRIGGER_SECRET"
```

### 4. Complete Flow Test

```bash
# Run the automated test script
chmod +x scripts/test-sync-worker-flow.sh
./scripts/test-sync-worker-flow.sh YOUR_SERVICE_ROLE_KEY YOUR_TRIGGER_SECRET
```

### 5. Check Queue Status

```bash
# View recent jobs
curl 'https://your-project.supabase.co/rest/v1/sync_queue?select=*&order=created_at.desc&limit=10' \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"

# View worker runs
curl 'https://your-project.supabase.co/rest/v1/sync_worker_runs?select=*&order=created_at.desc&limit=10' \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

## Production Setup

### 1. Deploy Edge Functions

```bash
# Deploy gmb-sync-worker
supabase functions deploy gmb-sync-worker

# Deploy gmb-sync
supabase functions deploy gmb-sync
```

### 2. Set Environment Variables

In Supabase Dashboard → Edge Functions → Secrets:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
TRIGGER_SECRET=generate-a-strong-random-secret
NEXT_PUBLIC_APP_URL=https://nnh.ae
```

### 3. Set Up Cron Job

**Option A: Supabase Cron (recommended)**

In Supabase Dashboard → Database → Cron Jobs:

```sql
-- Every 2 minutes
SELECT cron.schedule(
  'gmb-sync-worker',
  '*/2 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/gmb-sync-worker',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'X-Trigger-Secret', current_setting('app.trigger_secret')
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
```

**Option B: External Cron (cron-job.org, GitHub Actions, etc.)**

```yaml
# .github/workflows/sync-worker.yml
name: Trigger GMB Sync Worker
on:
  schedule:
    - cron: '*/2 * * * *'  # Every 2 minutes
jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger worker
        run: |
          curl -X POST '${{ secrets.SUPABASE_URL }}/functions/v1/gmb-sync-worker' \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${{ secrets.SERVICE_ROLE_KEY }}" \
            -H "X-Trigger-Secret: ${{ secrets.TRIGGER_SECRET }}"
```

## Monitoring

### Dashboard Queries

```sql
-- Pending jobs
SELECT COUNT(*) as pending_jobs
FROM sync_queue
WHERE status = 'pending';

-- Failed jobs (last 24h)
SELECT account_id, last_error, attempts, completed_at
FROM sync_queue
WHERE status = 'failed'
  AND completed_at > NOW() - INTERVAL '24 hours'
ORDER BY completed_at DESC;

-- Success rate (last 7 days)
SELECT
  COUNT(*) FILTER (WHERE status = 'succeeded') as succeeded,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'succeeded') / COUNT(*), 2) as success_rate
FROM sync_queue
WHERE completed_at > NOW() - INTERVAL '7 days';

-- Worker performance (last 24h)
SELECT
  status,
  AVG(jobs_processed) as avg_jobs_processed,
  AVG(jobs_succeeded) as avg_jobs_succeeded,
  AVG(EXTRACT(EPOCH FROM (finished_at - started_at))) as avg_duration_seconds
FROM sync_worker_runs
WHERE started_at > NOW() - INTERVAL '24 hours'
GROUP BY status;
```

### Alerts

Set up alerts for:
- **High failure rate:** > 20% jobs failed in last hour
- **Stale jobs:** Jobs in 'processing' for > 15 minutes
- **Queue backlog:** > 50 pending jobs
- **Worker failures:** Worker status = 'failed'

## Troubleshooting

### No jobs being picked up

1. Check if jobs exist:
   ```sql
   SELECT * FROM sync_queue WHERE status = 'pending';
   ```

2. Check if RPC function exists:
   ```sql
   SELECT * FROM pick_sync_jobs(1);
   ```

3. Check worker logs in Supabase Dashboard → Edge Functions → Logs

### Jobs stuck in 'processing'

Run the stale job cleanup:
```sql
SELECT mark_stale_sync_jobs(10);  -- Mark jobs stuck for 10+ minutes
```

Or manually reset:
```sql
UPDATE sync_queue
SET status = 'pending', started_at = NULL, attempts = attempts - 1
WHERE status = 'processing' AND started_at < NOW() - INTERVAL '10 minutes';
```

### Jobs failing repeatedly

Check error messages:
```sql
SELECT id, account_id, attempts, max_attempts, last_error
FROM sync_queue
WHERE status = 'failed'
ORDER BY completed_at DESC
LIMIT 10;
```

Common issues:
- **OAuth token expired:** Check `oauth_tokens` table
- **API rate limit:** Increase delay between jobs
- **Network timeout:** Check Edge Function logs
- **Invalid account:** Verify `gmb_accounts` exists

### Worker not running

1. Check cron job is active
2. Verify environment variables are set
3. Check Edge Function deployment status
4. Test manual trigger:
   ```bash
   curl -X POST '{SUPABASE_URL}/functions/v1/gmb-sync-worker' \
     -H "X-Trigger-Secret: {SECRET}"
   ```

## Best Practices

1. **Enqueue, don't execute directly**
   - Use `/api/gmb/enqueue-sync` for all user-triggered syncs
   - Let the worker handle actual execution
   - Benefits: reliable, retryable, monitorable

2. **Set appropriate priorities**
   - User-triggered syncs: priority 10-20
   - Scheduled syncs: priority 0-5
   - Batch operations: priority -10

3. **Monitor queue depth**
   - Keep pending jobs < 50
   - If queue grows, increase worker frequency or add parallel workers

4. **Handle failures gracefully**
   - Set reasonable `max_attempts` (default: 3)
   - Log errors to `error_logs` table for analysis
   - Alert on high failure rates

5. **Use scheduled_at for rate limiting**
   - Spread out bulk operations
   - Respect API quotas
   - Example: Schedule 100 jobs over 1 hour

## Migration from Direct Sync

If you have existing code that calls sync directly:

**Before (Direct sync):**
```typescript
await fetch('/api/gmb/sync', {
  method: 'POST',
  body: JSON.stringify({ accountId, syncType: 'full' })
});
```

**After (Queue-based):**
```typescript
await fetch('/api/gmb/enqueue-sync', {
  method: 'POST',
  body: JSON.stringify({ accountId, syncType: 'full', priority: 10 })
});
```

Benefits:
- ✅ Won't timeout on slow syncs
- ✅ Automatic retries on failure
- ✅ Better monitoring and diagnostics
- ✅ Can handle concurrent syncs
- ✅ Respects rate limits

## Summary

The GMB Sync Queue system provides:
- ✅ Reliable background job processing
- ✅ Automatic retries with exponential backoff
- ✅ Protection against race conditions
- ✅ Comprehensive monitoring and diagnostics
- ✅ Graceful handling of serverless timeouts
- ✅ Support for scheduled/delayed jobs
- ✅ Circuit breaker pattern for cascading failures

For questions or issues, check the logs in:
- Supabase Dashboard → Edge Functions → Logs
- `sync_worker_runs` table
- `error_logs` table
