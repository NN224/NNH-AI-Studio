# Supabase Production Setup

This directory contains the Supabase configuration and database migrations for NNH AI Studio.

## Database Migrations Workflow

### Prerequisites

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Login and link project
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

### Creating New Migrations

```bash
# Create a timestamped migration file
supabase migration new <descriptive_name>

# Example:
supabase migration new add_user_preferences_table
# Creates: supabase/migrations/YYYYMMDDHHMMSS_add_user_preferences_table.sql
```

### Applying Migrations

```bash
# Push to remote (production/staging)
supabase db push

# Reset local database (applies all migrations fresh)
supabase db reset

# Check migration status
supabase migration list
```

### Generating TypeScript Types

```bash
# From remote database
supabase gen types typescript --project-id YOUR_PROJECT_REF > lib/types/database.types.ts

# From local database
supabase gen types typescript --local > lib/types/database.types.ts
```

### Migration Best Practices

1. **Use IF NOT EXISTS / IF EXISTS** for idempotent migrations
2. **Always enable RLS** on new tables
3. **Add indexes** for frequently queried columns
4. **Never edit production schema manually** - all changes via migrations

---

## Features

- ✅ **Row Level Security** - Properly configured RLS policies
- ✅ **Seed data** - Ready for local testing

## 📁 Directory Structure

```
supabase/
├── migrations/
│   └── 20250101000000_init_full_schema.sql  # Single consolidated migration
├── functions/
│   ├── gmb-sync/                            # Enqueue sync jobs (no waiting)
│   ├── gmb-sync-worker/                     # Process PGMQ queue
│   ├── gmb-sync-queue-worker/               # Alternative worker
│   ├── gmb-sync-trigger/                    # Trigger sync
│   └── scheduled-sync/                      # Cron job for batch sync
├── seed.sql                                 # Test data for local development
└── README.md                                # This file
```

## 🔐 Security Architecture

### Token Isolation

**Problem**: Storing OAuth tokens in `gmb_accounts` table exposed them via API.

**Solution**: Created separate `gmb_secrets` table with strict RLS:

```sql
-- gmb_accounts: User-accessible (NO tokens)
CREATE TABLE gmb_accounts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  account_id TEXT UNIQUE NOT NULL,
  -- NO access_token or refresh_token here!
  ...
);

-- gmb_secrets: Service role ONLY (tokens stored here)
CREATE TABLE gmb_secrets (
  id UUID PRIMARY KEY,
  account_id UUID UNIQUE REFERENCES gmb_accounts(id),
  access_token TEXT NOT NULL,  -- encrypted
  refresh_token TEXT NOT NULL, -- encrypted
  ...
);

-- RLS: Block ALL user access
CREATE POLICY "Block all user access to gmb_secrets" ON gmb_secrets
  FOR ALL TO authenticated USING (false);

-- RLS: Service role only
CREATE POLICY "Service role has full access to gmb_secrets" ON gmb_secrets
  FOR ALL TO service_role USING (true);
```

### Benefits

1. **No token exposure** - Users cannot SELECT tokens via API
2. **Service role access** - Only Edge Functions can access tokens
3. **Audit trail** - Separate table makes it easy to track token usage
4. **Compliance** - Meets security best practices for OAuth

## 🚀 Migration Guide

### Step 1: Backup Current Database

```bash
# Export current schema
supabase db dump --schema public > backup_schema.sql

# Export current data
supabase db dump --data-only > backup_data.sql
```

### Step 2: Delete Old Migrations

```bash
# Delete all old migration files
rm supabase/migrations/1764*.sql
rm supabase/migrations/20251126*.sql
rm supabase/migrations/20251127*.sql

# Keep only the new consolidated migration
# supabase/migrations/20250101000000_init_full_schema.sql
```

### Step 3: Reset Database (Local Only)

```bash
# Reset local database
supabase db reset

# This will:
# 1. Drop all tables
# 2. Run the new migration
# 3. Apply seed data (if you run: psql < supabase/seed.sql)
```

### Step 4: Apply to Production

```bash
# Push migrations to production
supabase db push

# Verify migration status
supabase migration list
```

### Step 5: Migrate Existing Tokens

If you have existing data in production, run this migration script:

```sql
-- Migrate tokens from gmb_accounts to gmb_secrets
INSERT INTO gmb_secrets (account_id, access_token, refresh_token)
SELECT
  id,
  access_token,
  refresh_token
FROM gmb_accounts
WHERE access_token IS NOT NULL
ON CONFLICT (account_id) DO NOTHING;

-- Remove tokens from gmb_accounts
ALTER TABLE gmb_accounts DROP COLUMN IF EXISTS access_token;
ALTER TABLE gmb_accounts DROP COLUMN IF EXISTS refresh_token;
```

## 📊 Database Schema

### Core Tables

| Table                     | Purpose                          | RLS Enabled     |
| ------------------------- | -------------------------------- | --------------- |
| `profiles`                | User profiles                    | ✅ Yes          |
| `gmb_accounts`            | GMB account metadata (NO tokens) | ✅ Yes          |
| `gmb_secrets`             | OAuth tokens (service role only) | ✅ Yes (strict) |
| `gmb_locations`           | Business locations               | ✅ Yes          |
| `gmb_reviews`             | Customer reviews                 | ✅ Yes          |
| `gmb_questions`           | Q&A                              | ✅ Yes          |
| `gmb_posts`               | Posts                            | ✅ Yes          |
| `gmb_media`               | Media items                      | ✅ Yes          |
| `gmb_performance_metrics` | Insights data                    | ✅ Yes          |

### Sync System Tables

| Table              | Purpose            | RLS Enabled           |
| ------------------ | ------------------ | --------------------- |
| `sync_queue`       | Job tracking       | ✅ Yes                |
| `sync_status`      | Real-time progress | ✅ Yes                |
| `sync_worker_runs` | Worker logs        | ✅ Yes (service role) |

### PGMQ Queue

- **Queue Name**: `gmb_sync_queue`
- **Purpose**: Async job processing
- **Extension**: `pgmq` (PostgreSQL Message Queue)

## 🔄 Sync Flow

### Old Flow (Problematic)

```
User clicks "Sync"
  → Edge Function calls Next.js API
    → Next.js fetches data from Google
      → Next.js saves to database
        → Edge Function waits (504 timeout!)
          → Returns result
```

**Problems**:

- ❌ 504 timeouts for long syncs
- ❌ Edge Function waits for entire sync
- ❌ No retry mechanism
- ❌ HTTP overhead

### New Flow (Production-Ready) ✅

```
1. USER TRIGGERS SYNC:
   User clicks "Sync"
     → gmb-sync Edge Function
       → Enqueues job to PGMQ
         → Returns immediately (200 OK with job_id)

2. WORKER PROCESSES QUEUE:
   gmb-sync-worker (cron: every 2-5 min)
     → Picks job from sync_queue
       → Calls gmb-process Edge Function
         → gmb-process calls Next.js /api/gmb/sync-v2
           → Next.js fetches from Google API
             → Next.js saves to database via RPC
               → Returns result to gmb-process
                 → gmb-process returns to worker
                   → Worker updates sync_queue status

3. SCHEDULED SYNC:
   scheduled-sync (cron: every 1 hour)
     → Fetches all active accounts
       → Batch-enqueues jobs to PGMQ
         → Returns summary
```

**Benefits**:

- ✅ No timeouts (immediate response)
- ✅ Async processing
- ✅ Built-in retry mechanism
- ✅ Queue-based architecture
- ✅ Scalable
- ✅ **NO INFINITE LOOP** (gmb-sync → queue, gmb-process → actual work)

## 🛠️ Edge Functions

### 1. gmb-sync (User-Triggered)

**Purpose**: Enqueue sync job when user clicks "Sync Now"

**Endpoint**: `https://[project].supabase.co/functions/v1/gmb-sync`

**Request**:

```json
POST /functions/v1/gmb-sync
Authorization: Bearer <user_jwt>
Content-Type: application/json

{
  "accountId": "uuid",
  "syncType": "full",  // or "incremental"
  "priority": 0
}
```

**Response**:

```json
{
  "ok": true,
  "status": "queued",
  "job_id": 12345,
  "account_id": "uuid",
  "sync_type": "full",
  "message": "Sync job queued successfully. Worker will process it shortly.",
  "took_ms": 45
}
```

**Key Changes**:

- ✅ Returns immediately (no waiting)
- ✅ Enqueues to PGMQ
- ✅ Dynamic CORS (uses `APP_URL` env var)
- ✅ User authentication required

### 2. scheduled-sync (Cron Job)

**Purpose**: Batch-enqueue sync jobs for all active accounts

**Trigger**: pg_cron (every 1 hour)

**Flow**:

1. Fetch all active `gmb_accounts`
2. Loop through accounts
3. Call `enqueue_sync_job()` for each
4. Return summary

**Response**:

```json
{
  "ok": true,
  "message": "Scheduled sync completed",
  "accounts_total": 50,
  "accounts_succeeded": 48,
  "accounts_failed": 2,
  "errors": ["Account XYZ: Token expired"],
  "took_ms": 1234
}
```

**Key Changes**:

- ✅ No HTTP calls to Next.js
- ✅ Direct database operations
- ✅ Batch processing
- ✅ Error tracking

### 3. gmb-process (Heavy Lifter) 🔥

**Purpose**: Performs the ACTUAL sync work (Google API → Database)

**Endpoint**: `https://[project].supabase.co/functions/v1/gmb-process`

**Called By**: gmb-sync-worker ONLY (internal)

**Request**:

```json
POST /functions/v1/gmb-process
X-Internal-Run: <TRIGGER_SECRET>
Content-Type: application/json

{
  "accountId": "uuid",
  "userId": "uuid",
  "syncType": "full"
}
```

**Flow**:

1. Verify internal secret
2. Call Next.js `/api/gmb/sync-v2`
3. Next.js fetches from Google API
4. Next.js saves to database
5. Return result

**Key Points**:

- ✅ Internal access only (requires secret)
- ✅ Proxies to Next.js (where logic lives)
- ✅ Can take 30-60 seconds (that's OK, it's async)
- ✅ No infinite loop (doesn't call gmb-sync)

### 4. gmb-sync-worker (Queue Processor)

**Purpose**: Process jobs from sync_queue table

**Flow**:

1. Pick jobs from `sync_queue` (FOR UPDATE SKIP LOCKED)
2. For each job:
   - Call `gmb-process` Edge Function
   - Wait for result
   - Update job status (succeeded/failed)
   - Handle retries with exponential backoff
3. Update `sync_worker_runs` table

**Cron Schedule**: Every 2-5 minutes

**Note**: This worker orchestrates the sync process but doesn't do the actual work.

## 🧪 Testing

### Local Development

1. **Start Supabase**:

```bash
supabase start
```

2. **Apply migrations**:

```bash
supabase db reset
```

3. **Load seed data**:

```bash
psql postgresql://postgres:postgres@localhost:54322/postgres < supabase/seed.sql
```

4. **Test sync endpoint**:

```bash
curl -X POST http://localhost:54321/functions/v1/gmb-sync \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"accountId": "00000000-0000-0000-0000-000000000001", "syncType": "full"}'
```

5. **Check queue**:

```sql
SELECT * FROM pgmq.metrics('gmb_sync_queue');
SELECT * FROM sync_queue ORDER BY created_at DESC LIMIT 10;
```

### Seed Data

The `seed.sql` file creates:

- 2 test users
- 3 GMB accounts (2 active, 1 inactive)
- 2 locations
- 3 reviews (1 responded, 2 pending)
- 2 questions (1 answered, 1 pending)
- 7 days of performance metrics
- 2 sync queue entries

**Test User IDs**:

- User 1: `00000000-0000-0000-0000-000000000001`
- User 2: `00000000-0000-0000-0000-000000000002`

## 📈 Monitoring

### Queue Metrics

```sql
-- Check queue status
SELECT * FROM pgmq.metrics('gmb_sync_queue');

-- View pending jobs
SELECT * FROM sync_queue WHERE status = 'pending';

-- View failed jobs
SELECT * FROM sync_queue WHERE status = 'failed';
```

### Sync Status

```sql
-- Real-time sync progress
SELECT * FROM sync_status
WHERE user_id = '<user_id>'
ORDER BY timestamp DESC
LIMIT 10;
```

### Worker Runs

```sql
-- Worker execution history
SELECT * FROM sync_worker_runs
ORDER BY created_at DESC
LIMIT 10;
```

## 🔧 Environment Variables

### Required for Edge Functions

```env
# Supabase
SUPABASE_URL=https://[project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App URL (for CORS)
NEXT_PUBLIC_APP_URL=https://www.nnh.ae
APP_URL=https://www.nnh.ae

# Cron Secret (for scheduled-sync)
TRIGGER_SECRET=your_secret_key
CRON_SECRET=your_secret_key
```

## 🚨 Common Issues

### Issue 1: "Cannot find module 'jsr:@supabase/supabase-js@2'"

**Cause**: TypeScript error in IDE (Deno runtime)

**Solution**: Ignore - this is normal for Deno Edge Functions. The code will run correctly.

### Issue 2: Tokens still in gmb_accounts table

**Cause**: Old migration not cleaned up

**Solution**: Run token migration script (see Step 5 above)

### Issue 3: 504 Timeout on sync

**Cause**: Still using old Edge Function

**Solution**: Ensure you're using the new `gmb-sync` function that enqueues to PGMQ

### Issue 4: Jobs stuck in queue

**Cause**: Worker not running

**Solution**: Deploy and start `gmb-sync-worker` Edge Function

## 📚 References

- [Supabase PGMQ Documentation](https://supabase.com/docs/guides/database/extensions/pgmq)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Message Queue](https://github.com/tembo-io/pgmq)

## 🎉 Summary

This refactored Supabase setup provides:

1. **Security**: Tokens isolated in `gmb_secrets` table
2. **Performance**: No 504 timeouts, async processing
3. **Scalability**: Queue-based architecture
4. **Maintainability**: Single consolidated migration
5. **Testability**: Seed data for local development

**Next Steps**:

1. ✅ Apply migration to production
2. ✅ Deploy Edge Functions
3. ✅ Set up cron job for scheduled sync
4. ✅ Monitor queue metrics
5. ✅ Test end-to-end sync flow

---

**Version**: 1.0.0
**Last Updated**: 2025-01-01
**Author**: Senior Backend Engineer
