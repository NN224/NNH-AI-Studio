## Pre‑Flight Report: Google My Business (GMB) Sync Lifecycle → DB → Homepage UI

### Objective

Verify the integrity of the end‑to‑end data flow for GMB: Google API → Backend Sync → Database (new schema) → Server Actions → Homepage UI. Determine release readiness and highlight production risks.

### Scope

- Sync Engine (Edge + Server actions)
  - `supabase/functions/gmb-process/index.ts`
  - `server/actions/gmb-sync.ts`
  - `supabase/functions/gmb-sync-worker/index.ts`
- Data Retrieval & Distribution
  - `server/actions/dashboard.ts`
  - `server/actions/locations.ts`
  - `server/actions/reviews.ts`
- Homepage Experience
  - `components/home/home-with-sync.tsx`
  - `contexts/sync-context.tsx`
  - `components/home/*`
- Schema & Transactions
  - `supabase/migrations/20250101000000_init_full_schema.sql`
  - `lib/supabase/transactions.ts`

---

### 1) Sync Engine (Backend & Edge Functions)

#### Green Flags

- Edge Function proxy
  - `gmb-process` calls the app route `POST /api/gmb/sync-v2` with internal secrets and service role. Internal calls are authorized and bypass user auth as intended.
- Correct Google API versions
  - Locations/Business Info: v1
  - Reviews/Posts/Media: v4
  - Insights/Performance: v1
- Transactional persistence
  - `performTransactionalSync` batches writes and delegates to a transactional RPC for locations and reviews; insights use conflict‑aware upserts keyed by `(location_id, metric_date)`.
- Basic rate limiting and batching
  - Concurrency is limited; batching helps respect quotas.

#### Yellow Flags (risks/edge cases)

- Token expiry assumptions
  - Token refresh logic uses a fixed lifetime assumption rather than the exact expiry returned from Google. This could refresh too early/late in edge conditions.
- Large datasets / quotas
  - Concurrency and batch size are conservative but may still hit 429s on large fleets. Adaptive backoff would improve resilience.

#### Red Flags (breaking)

1. Token storage table mismatch
   - Current token retrieval/refresh code reads from `gmb_accounts`, whereas the new schema isolates tokens in `gmb_secrets`.
   - Impact: Token refresh may fail during long syncs; jobs can stall or error.
   - Fix: Update token helpers to read/write encrypted tokens in `gmb_secrets` (admin client). Keep or migrate `token_expires_at` consistently and adjust code accordingly.

2. Internal sync drops Posts/Media flags
   - Internal path of `/api/gmb/sync-v2` forces `includePosts=false` and `includeMedia=false`, even when the worker intends to include them.
   - Impact: Posts/media are not synced for internal/queued runs.
   - Fix: Pass through `includePosts/includeMedia` from the request body for internal calls.

3. `sync_status` schema mismatch across worker and client
   - New table expects `status` values `running|completed|error` and fields like `progress`, `message`.
   - Worker code and helper SQL still use legacy fields like `last_sync_status` and values like `success/failed`.
   - Client (`sync-context`) expects `success/failed` rather than `completed/error`.
   - Impact: Realtime progress won’t render correctly; UI may rely on polling fallback.
   - Fix: Normalize all writers/readers to the new `sync_status` fields and enum values.

---

### 2) Data Retrieval & Distribution (Server Actions)

#### Green Flags

- `getLocations` reads from `gmb_locations` with correct scoping by `user_id`.
- `getReviews` filters by `user_id` and optional `location_id` (UUID FK), aligning with schema (not `google_location_id`). Reply endpoints target v4 resources correctly.

#### Yellow Flags

- Monthly stats timezone accuracy
  - Current grouping in JS risks local‑timezone drift. Prefer SQL `date_trunc` on UTC for stable month buckets.

#### Red Flags

1. `getCachedDashboardData` uses deprecated columns and a dropped table
   - References old review fields (`create_time`, `replied_at`, `comment`, `star_rating`) and `oauth_tokens`.
   - New schema uses `review_text`, `rating`, `review_date`, `reply_text`, `reply_date`; `location_name` resides in `gmb_locations`.
   - Impact: Cards/tiles can be incorrect or error out.
   - Fix: Update selections and joins to the new schema; remove/replace `oauth_tokens` usage (or omit YouTube metrics if out of scope).

---

### 3) Homepage Experience (Frontend)

#### Green Flags

- `HomeWithSync` and `SyncProvider` are wired; the banner/overlay appear during sync. The empty state is shown when there are no connected accounts.

#### Yellow Flags

- Progress granularity
  - Server‑side progress publishing is in‑memory; the browser does not subscribe to it. Ensure progress is mirrored into `sync_status` or delivered via SSE/WebSocket to the client.
- Onboarding gating
  - Consider checking `totalLocations === 0` in addition to `hasAccounts` to trigger onboarding when an account exists but has no locations.

#### Red Flags

- Realtime `sync_status` mismatches (see Sync Engine red flag #3)
  - Client expects legacy values; schema uses new enum. Progress UI will be inconsistent until normalized.

---

### Schema & Transaction Cross‑Check

- Locations upsert on `location_id` and reviews upsert on `review_id` are consistent.
- Insights upsert with `(location_id, metric_date)` matches the unique constraint.
- RLS/scoping: Server actions query by `user_id`; transactional inserts include `user_id` — aligned with multi‑tenant safety.

---

### Summary

#### ✅ Green Flags

- Edge proxy to sync‑v2 with internal auth.
- Correct Google API versions: v1 (Business Info), v4 (Reviews/Posts/Media), v1 (Performance/Insights).
- Transactional write path with batching and conflict‑aware upserts.
- Reviews retrieval/replies target the correct v4 resources.

#### ⚠️ Yellow Flags

- Token expiry precision (use exact expiry).
- Add adaptive backoff for 429s/large fleets.
- Use SQL UTC `date_trunc` for monthly stats.
- Mirror stage progress into `sync_status` or stream via SSE.
- Onboarding: also gate on `totalLocations === 0`.

#### 🛑 Red Flags (must fix before production)

1. Token retrieval/refresh still uses `gmb_accounts` instead of `gmb_secrets`.
2. Internal sync disables Posts/Media flags inadvertently.
3. `sync_status` schema/value mismatches between worker, SQL helpers, and client.
4. `getCachedDashboardData` reads deprecated columns / dropped table.

---

### Recommended Fix Plan (prioritized)

1. Token handling → `gmb_secrets`
   - Update helpers to read/write encrypted tokens in `gmb_secrets` via admin client; normalize `token_expires_at` handling.
2. Sync status normalization
   - Worker and SQL helpers should upsert `sync_status` with fields in the new schema and use enum values `running|completed|error`.
   - Client `sync-context` should consume those values and fields.
3. Honor Posts/Media flags in internal runs
   - Pass through `includePosts/includeMedia` in `/api/gmb/sync-v2` for internal calls.
4. Dashboard server action fixes
   - Update `getCachedDashboardData` to read `review_text`, `rating`, `review_date`, `reply_text`, `reply_date`, and join locations for `location_name`. Remove/replace `oauth_tokens`.
5. Optional UX/Resilience
   - Persist and surface granular stage progress via `sync_status` or SSE.
   - Add adaptive backoff and pagination guards for very large datasets.
   - Implement SQL‑based monthly stats aggregation in UTC.

---

### Verdict

NO‑GO until Red Flags (1–4) are resolved. After applying the fixes and running a short regression (manual + targeted tests), the system should be ready for production deployment.
