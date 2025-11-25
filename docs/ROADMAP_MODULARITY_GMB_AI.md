# Roadmap: Modularity, GMB Sync Reliability, and AI Automation Pipelines

Date: 2025-11-25 15:57 (local)

Executive summary
- Objective: Evolve the current codebase to a modular, testable architecture while hardening Google Business Profile (GMB) sync reliability and scaling AI automation safely and cost‑effectively.
- Scope: Next.js App Router API routes, middleware, server actions/services, GMB OAuth/sync/webhooks, uploads, and AI endpoints.
- Outcomes: Clear module boundaries, resilient sync pipeline with observability, and an AI orchestration layer with quotas, caching, and evaluation.

Success metrics (KPIs)
- Modularity
  - 40–60% reduction in LOC inside API route handlers by moving logic into services/modules
  - >70% unit/integration test coverage on services/modules (excludes UI)
  - <10% cyclic dependency events reported by linter/graph tooling
- GMB reliability
  - >99.5% successful sync job completion over rolling 7 days
  - <2% jobs retried more than 2 times; <0.1% dead‑letter rate
  - p95 sync latency < 3 minutes per job batch; zero duplicate syncs per location in a 30‑minute window
- AI pipelines
  - Quotas enforced 100% of the time; no provider cost spikes >10% beyond budget
  - Cache hit rate >30% on repeated prompts/templates
  - Automated eval suite runs on PRs and nightly with pass rate ≥90%

-------------------------------------------------------------------------------
Pillar A — Modularity and layering

Current state highlights
- Route handlers contain orchestration and business logic (e.g., app/api/gmb/*, app/api/ai/generate/route.ts).
- Cross‑cutting concerns (rate‑limit, validation, auth, telemetry) are applied inconsistently.
- Utilities exist (lib/rate-limit.ts, lib/security/*, lib/services/sentry-config.ts) but aren’t systematically composed.

Target architecture (4 layers)
1) Interface layer (entrypoints)
   - Next.js route handlers under app/api/** only parse/validate, call services, and shape responses.
2) Application services (orchestration)
   - server/services/** modules coordinate use cases: gmbSyncService, aiOrchestrator, mediaService, emailService.
3) Domain modules (business logic)
   - server/modules/gmb/**, server/modules/ai/** encapsulate pure logic, state machines, mappers, validators.
4) Infrastructure (adapters)
   - lib/supabase/** (persistence), lib/rate-limit.ts (limits), lib/security/** (crypto/hmac), lib/http/** (google/youtube clients), server/repositories/** (db access).

Coding standards and shared utilities
- Validation: standardize on zod schemas per route/module; central helpers in lib/validation.
- Errors: define typed errors (DomainError, RateLimitError, ProviderError) with toHttp() mapping utility.
- Observability: central request context (correlationId, userId) propagated to logs/metrics.
- Configuration guard: boot‑time validation of critical env vars (Upstash, encryption key, OAuth).

Refactor sequence (incremental, low‑risk)
1. Introduce lib/validation with zod and add schemas to AI generate and upload routes.
2. Extract gmbSyncService from app/api/gmb/queue.process + scheduled‑sync + sync endpoint; hide queue execution behind interface.
3. Extract aiOrchestrator from app/api/ai/generate/route.ts; move provider calls to adapters.
4. Centralize rate limiting wrappers and apply consistently to email, upload, AI, cron/webhooks.
5. Unify error/response format via a small responder utility (success, error, 4xx/5xx mapping).

Deliverables
- ADR (architecture decision record) documenting the four‑layer approach
- Dependency rules lint (no cross‑imports from interface->infrastructure directly)
- Test harness and fixtures for modules

Acceptance criteria
- Route files ≤150 LOC and contain no domain logic
- New/updated routes use shared validation and responder utilities
- Service modules have unit tests and are framework‑agnostic

-------------------------------------------------------------------------------
Pillar B — GMB sync reliability

Current pain points and risks
- Cron endpoints rely on static shared secret (see vercel.json, app/api/gmb/scheduled-sync/route.ts, app/api/gmb/queue/process/route.ts) and include GET routes.
- Job processing calls /api/gmb/sync over HTTP from within the API (potentially fragile; lacks idempotency keys and standardized backoff).
- Token decryption/refresh scattered; limited distributed locking to prevent concurrent duplicate syncs.
- Observability is limited to logs; no dedicated metrics or dead‑letter queue.

Design goals
- Idempotent, observable job processing with safe retries, backoff, and deduplication per location and syncType.
- Secure cron triggers using HMAC with timestamp/nonce and POST only.
- Central token service for Google/YT tokens (refresh, rotate, failure paths) using lib/security/encryption.ts + repositories.

Proposed architecture
1) Job model and state machine
   - States: queued -> processing -> completed | failed -> retry_scheduled -> dead_letter
   - Fields: id, account_id, location_id, sync_type, attempt, max_attempts, dedupe_key, next_run_at, last_error, created_at, updated_at
   - Dedupe: unique index on (dedupe_key) to avoid duplicate work in a window
2) Execution engine
   - gmbSyncService.processNext(n): pulls N due jobs, sets processing with distributed lock (Upstash), executes task with timeout, commits state transitions.
   - Exponential backoff: min(2^attempt * base, maxBackoff)
3) Transport decisions
   - Prefer in‑process service call from queue processor rather than HTTP when running in the same deployment; if HTTP is required, sign with HMAC and verify.
4) Security and hardening
   - Replace GET cron routes with POST; require HMAC: X-Signature and X-Timestamp; accept if within 5 minutes and signature matches.
   - Rate limit cron/webhook endpoints and minimize response payloads.
5) Observability
   - Metrics: jobs_processed_total, jobs_failed_total, jobs_retried_total, in_progress, dead_letter_total, sync_latency_ms (avg, p95), per sync_type.
   - Structured logs: include jobId, dedupeKey, accountId, locationId, attempt.
   - Sentry: capture exceptions with scrubbed context; use breadcrumbs.

Implementation plan (phased)
- Phase 1 (Quick wins)
  - Add HMAC verification utility; switch scheduled‑sync and cron cleanup to POST; keep GET temporarily behind feature flag if needed.
  - Add idempotency key and per‑location suppression window on current sync calls.
  - Add minimal metrics counters and structured logs in existing handlers.
- Phase 2 (Queue rework)
  - Introduce sync_jobs table and repositories; implement state machine and retry/backoff.
  - Migrate app/api/gmb/queue/process to use gmbSyncService directly; remove internal HTTP call.
- Phase 3 (Reliability extras)
  - Distributed locking via Upstash Redis for (location_id, sync_type);
  - Dead‑letter handling + admin tooling to inspect/requeue.

Testing and validation
- Contract tests for Google API adapters (mocked)
- Load test scheduled sync with 1k jobs/hour; verify latency and success rates
- Chaos tests: simulate Google 5xx, timeouts, auth failures; assert retries and dead‑lettering

Acceptance criteria
- No duplicate sync for the same (location_id, sync_type) within 30 minutes
- Cron routes reject unsigned/expired requests; all cron endpoints are POST
- 0 unhandled promise rejections during sustained load; retries capped; dead‑letter rate <0.1%

-------------------------------------------------------------------------------
Pillar C — AI automation pipelines

Current state
- app/api/ai/generate/route.ts performs provider selection inline; limited cost controls; no standardized prompt templates or content evaluation.

Design goals
- Pluggable provider abstraction, centralized orchestration with guardrails, quotas, and caching.
- First‑class support for workflows: batch generations, scheduled jobs, post‑processing (e.g., rewriting to tone, summarization), and human‑in‑the‑loop review.

Architecture
1) Provider abstraction
   - Interface: AiProvider.generate(input: {prompt, system, params}) -> {text, cost, model, usage}
   - Adapters: openai, groq, deepseek, together; resilient with per‑provider timeouts/backoff.
2) Orchestrator
   - aiOrchestrator.generateWithFallback(preference, policies)
   - Policies: model allowlist, maxTokens, safety filters, retry budget, cost budget (per user/tenant).
3) Quotas and metering
   - Upstash‑backed rate limits (per‑IP, per‑user), daily quotas, and soft 402 budget exceeded semantics.
   - Usage table (content_generations already exists) extended with cost/latency/provider metadata and budget rollups.
4) Caching
   - Prompt hash (prompt + params + template version) -> response cache with TTL; bypass on explicit no‑cache.
5) Templates and evaluation
   - Template registry with versions; prompt authoring UI in future.
   - Eval harness: golden prompts dataset, BLEU/ROUGE/semantic similarity; nightly runs.
6) Content moderation & safety
   - Optional moderation pass; blocklist/allowlist terms; PII suppression in logs and Sentry.

Implementation plan
- Phase 1 (Quick wins)
  - Introduce aiOrchestrator and provider interfaces; move provider code out of route; add basic quotas using lib/rate-limit.ts.
  - Add caching layer keyed by prompt hash; store provider and cost metadata.
- Phase 2 (Workflows & eval)
  - Batch jobs API + background worker for long‑running tasks; add evaluation suite with CI job.
  - Add template versions and guardrails (maxTokens, allowedModels).
- Phase 3 (Governance)
  - Per‑tenant budgets; usage dashboards; alerting on spend anomalies.

Acceptance criteria
- All AI routes call aiOrchestrator; no direct SDK usage from routes
- Quotas enforced and reflected in responses (429/402)
- Cache hit rate reported and observable; eval suite green on PRs/nightly

-------------------------------------------------------------------------------
Phased timeline (suggested 30/60/90 days)

Days 0–30 (Sprint 1–2)
- Modularity quick wins: validation utils, responder, extract aiOrchestrator skeleton
- GMB: HMAC utilities, switch cron endpoints to POST, add idempotency key + minimal metrics
- AI: basic quotas + caching, provider abstraction
- Deliver ADRs and test harness

Days 31–60 (Sprint 3–4)
- GMB: introduce sync_jobs table, implement state machine + retry/backoff, integrate distributed locks
- Modularity: extract gmbSyncService and repositories; consolidate error handling
- AI: batch workflows and evaluation suite in CI

Days 61–90 (Sprint 5–6)
- GMB: dead‑letter queues + admin tooling; SLO dashboards and alerts
- Modularity: enforce dependency rules; increase coverage >70%
- AI: budgets per tenant, cost dashboards, moderation hooks

-------------------------------------------------------------------------------
Risks and mitigations
- Redis/Upstash unavailability
  - Mitigation: graceful degradation to in‑memory with reduced limits; circuit breakers; clear alerts
- Google API quota errors
  - Mitigation: backoff, retries with jitter, pre‑flight quota checks, progressive sync
- Cost overrun on AI providers
  - Mitigation: quotas + hard budget caps; provider fallback order; nightly budget audits
- Refactor risk during sprints
  - Mitigation: incremental extractions; high test coverage on services; feature flags

Dependencies
- UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN configured for production
- ENCRYPTION_KEY configured and validated on boot
- Sentry DSN and privacy scrubbing enabled

-------------------------------------------------------------------------------
Appendix A — Proposed directory structure (illustrative)

app/
  api/
    ai/
    gmb/
    upload/
server/
  modules/
    gmb/
    ai/
  services/
    gmb-sync-service.ts
    ai-orchestrator.ts
  repositories/
    gmb-repo.ts
    token-repo.ts
lib/
  http/
    google-client.ts
    youtube-client.ts
  validation/
    zod-helpers.ts
  security/
    encryption.ts
    webhook-verification.ts
  rate-limit.ts

-------------------------------------------------------------------------------
Checklist by pillar (initial)

- Modularity
  - [ ] Add zod validation helpers and unify request validation
  - [ ] Extract aiOrchestrator to server/services and refactor routes to use it
  - [ ] Introduce responder utility and typed errors
  - [ ] Add ADR for layering and enforce basic dependency rules

- GMB
  - [ ] Add HMAC utilities; switch cron GET -> POST; enforce timestamp window
  - [ ] Add idempotency keys and minimal metrics in existing handlers
  - [ ] Create sync_jobs table and repositories
  - [ ] Implement state machine with retry/backoff and distributed locks
  - [ ] Dead‑letter handling and admin view

- AI
  - [ ] Provider interfaces + adapters; move SDK calls out of routes
  - [ ] Quotas + usage metering; 402/429 responses
  - [ ] Prompt hash cache and telemetry
  - [ ] Evaluation suite in CI with baseline datasets

-------------------------------------------------------------------------------
Ownership and ways of working
- Tech Lead: Architecture decisions, dependency rules, and reviews
- Backend: Services, repositories, queue/locks, cron/webhooks
- AI/ML: Provider adapters, evaluation harness, guardrails
- DevOps: Upstash, secrets validation, Sentry, dashboards/alerts
- QA: Test plans, chaos/load tests, CI gating
