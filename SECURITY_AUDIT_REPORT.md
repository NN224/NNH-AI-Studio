Security Audit Report — NNH AI Studio

Date: 2025-11-25 15:51 (local)

Overview
- Scope: Application server (Next.js 14), API routes, middleware, security headers, storage, OAuth, AI/LLM integrations, cron endpoints, observability.
- Goal: Identify critical issues that must be fixed before production to prevent abuse, data exposure, and availability/cost risks.

Top 15 Critical Issues (Detailed)

1) Unauthenticated email-sending APIs enable abuse (spam/phishing)
- Where: app/api/email/send/route.ts and app/api/email/sendgrid/route.ts
- Risk: Anyone can POST and send arbitrary emails from your domain → account blacklisting, reputational damage, and cost exposure.
- Evidence: No auth/authorization checks, no rate limiting, no CSRF/anti‑automation.
- Recommended Fix:
  - Require authenticated user and role checks (e.g., admin or verified account).
  - Enforce strict allowlist for from/sender; never accept caller-provided sender.
  - Add per-user rate limiting (e.g., 5/min, 50/day) and IP throttling.
  - Add server-side content validation, HTML sanitization, and length limits.
  - For public forms, add bot protection (hCaptcha/Recaptcha) and signed HMAC payloads.
  - Create audit logs for all sends and suppress detailed failures in responses.

2) Content Security Policy is overly permissive (allows XSS and mixed content)
- Where: next.config.mjs → headers() → Content-Security-Policy
- Risk: 'unsafe-inline' and 'unsafe-eval' on script-src allow XSS; img-src allows http: (mixed content, MITM). Wide connect-src/frame-src increases data exfiltration surface.
- Recommended Fix:
  - Replace 'unsafe-inline' with nonces or strict-dynamic and hashed inline scripts; remove 'unsafe-eval'.
  - Restrict img-src to: 'self' data: blob: https: (remove http:).
  - Tighten connect-src to exact domains needed (Supabase project, Google APIs actually used, Sentry if enabled).
  - Restrict frame-src to exact Google endpoints you must embed; ensure frame-ancestors 'none' is correct for your use case.
  - Test with report-only CSP first; then enforce.

3) Missing CSRF protection for browser-accessible mutating endpoints
- Where: Many POST/PUT/DELETE routes (e.g., email send, uploads, AI routes) are callable by credentialed browsers.
- Risk: If Supabase auth cookies are present, cross-site POSTs may succeed (especially with global API CORS credentials=true), enabling CSRF.
- Recommended Fix:
  - For browser-initiated state changes, implement a CSRF token (double-submit cookie or SameSite=Strict flows) and require a custom header.
  - Prefer disallowing credentials on CORS and using Authorization: Bearer tokens for truly cross-origin calls.
  - Handle OPTIONS preflight explicitly where applicable.

4) Rate limiting is inconsistent and may be ineffective in production without Upstash
- Where: lib/rate-limit.ts and various routes; many sensitive routes lack checks.
- Risk: In-memory fallback isn’t effective on serverless (multiple instances) → abuse/DoS/cost spikes.
- Recommended Fix:
  - Make UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN required in production; fail fast at boot if missing.
  - Apply checkRateLimit/checkKeyRateLimit consistently to high-risk routes: email, uploads, AI, OAuth helper/diagnostics, cron endpoints.
  - Define standard budgets per-IP and per-user.

5) Insecure upload endpoint with no validation (arbitrary content hosting)
- Where: app/api/media/upload/route.ts
- Risk: Accepts any file type and size, stores in public bucket, returns public URL → malware hosting, XSS via served files, storage abuse.
- Recommended Fix:
  - Align with secure handlers: app/api/upload/image and app/api/upload/bulk (ALLOWED_TYPES, MAX_SIZE, Sharp processing for images).
  - Enforce MIME and extension allowlist; block HTML/JS and executables. Set strict size limits and per-request count.
  - Upload to private bucket; issue short-lived signed URLs or proxy through authenticated API.
  - Consider antivirus scanning for media (e.g., ClamAV service) if risk warrants.

6) Potential open redirect/host header risk during OAuth flows
- Where: lib/utils/get-base-url-dynamic.ts used in app/api/gmb/oauth-callback/route.ts and others
- Risk: getBaseUrlDynamic trusts Host/X-Forwarded-Proto; attacker-controlled headers could influence redirects.
- Recommended Fix:
  - In production, use a strict allowlist of hostnames or require NEXT_PUBLIC_BASE_URL and reject mismatches.
  - Normalize/validate redirect URIs; never reflect untrusted host input.

7) Cron endpoints rely on a static shared secret and include GET routes
- Where: app/api/gmb/queue/process/route.ts (POST), app/api/gmb/scheduled-sync/route.ts (GET), app/api/cron/cleanup/route.ts (GET), vercel.json
- Risk: If CRON_SECRET is leaked/reused, attackers can trigger costly operations; GET is easier to mis-trigger and cache/proxy policies may interfere.
- Recommended Fix:
  - Use POST only; include HMAC signature with timestamp/nonce validation.
  - Rate limit, minimize responses, and avoid detailed error output.
  - Rotate CRON_SECRET regularly and store uniquely per environment.

8) Debug/Sentry example routes are publicly accessible
- Where: app/sentry-example-page, app/[locale]/sentry-example-page, app/api/sentry-example-api
- Risk: Increases attack surface and can leak environment details or be abused to generate errors.
- Recommended Fix:
  - Remove these routes from production builds or guard by environment flag and auth.

9) CORS policy is global and permissive with credentials enabled
- Where: next.config.mjs headers() for /api/:path*
- Risk: Access-Control-Allow-Credentials: true across all API routes amplifies CSRF risk; origin is static, OPTIONS handling is not explicit.
- Recommended Fix:
  - Only enable credentials for routes that truly need cookies; otherwise set to false.
  - Move CORS handling into route-level handlers with strict origin checks and proper OPTIONS responses.

10) Public media exposure by default
- Where: app/api/media/upload/route.ts uses getPublicUrl; buckets likely public.
- Risk: User-generated content (possibly sensitive) is publicly readable and hot-linkable.
- Recommended Fix:
  - Make buckets private; serve via signed URLs or authenticated proxy endpoints with short expirations.
  - Add authorization checks when generating access URLs.

11) Lack of consistent request body validation and schema enforcement
- Where: Many API routes manually pick fields without schema validation.
- Risk: Type confusion, injection vectors (path traversal in names, unexpected payloads), brittle error handling.
- Recommended Fix:
  - Standardize on zod/yup schemas for every route input; centralize validation utilities and reuse.
  - Return consistent 400s with opaque errors; never echo raw payloads in responses.

12) Secrets and encryption key management not enforced at startup
- Where: lib/security/encryption.ts requires ENCRYPTION_KEY but system doesn’t appear to assert presence during boot.
- Risk: Misconfiguration can surface only at runtime; rotation strategy unclear.
- Recommended Fix:
  - Add a startup/config validation step that fails builds/boot if required secrets are missing or malformed.
  - Document rotation procedures; consider KMS or envelope encryption; add key versioning.

13) AI endpoints lack quotas/cost controls
- Where: app/api/ai/generate/route.ts and related AI routes
- Risk: Abuse leads to high variable costs and degraded service; no per-user budgets.
- Recommended Fix:
  - Add per-user and per-IP rate limits and daily quotas; meter usage; surface 402/429 with guidance.
  - Add provider-level circuit breakers and backoffs; log cost metadata.

14) Auth gating via middleware uses substring matching and may be brittle
- Where: middleware.ts protectedPaths with pathname.includes(path)
- Risk: False positives/negatives for protection; changes to routes/locales can create gaps.
- Recommended Fix:
  - Use exact matcher patterns per-locale or a consolidated allowlist via Next.js matcher syntax.
  - Add tests for protected vs. public routes.

15) Sentry privacy hardening and abuse prevention
- Where: lib/services/sentry-config.ts and next.config.mjs Sentry integration
- Risk: Potential PII leakage if errors include payloads; Sentry tunnel may be abused to bypass ad blockers and increase server load.
- Recommended Fix:
  - Add beforeSend/beforeBreadcrumbs scrubbing (emails, tokens, cookies, Authorization headers, request bodies).
  - Lower tracesSampleRate in production; ensure sendDefaultPii remains false in prod.
  - Consider gating the tunnel route behind an allowlist or disabling if not needed.

Additional high-impact items to schedule next
- Harden security headers further: add Cross-Origin-Opener-Policy, Cross-Origin-Embedder-Policy (if compatible), X-Download-Options, and better cache control on auth pages.
- Validate image/video processing paths for potential Sharp errors and enforce memory limits.
- Remove http fallbacks to production domain in getBaseUrlDynamic to prevent accidental cross-env redirects.

Suggested remediation order (1–2 sprints)
1. Lock down email APIs (auth, rate-limit, CSRF, allowlists).
2. Deploy strict CSP (nonce-based) and CORS/CSRF hardening.
3. Enforce Upstash-based rate limiting across sensitive routes; fail boot if not configured.
4. Fix uploads: validation, private buckets, signed URLs; patch /api/media/upload.
5. Secure OAuth redirects with host allowlists.
6. Harden cron endpoints (POST+HMAC, rotate secrets) and remove public debug routes.
7. Add schema validation, Sentry scrubbing, and AI quotas.

Notes
- This report summarizes critical production blockers with precise file references and concrete remediation guidance tailored to the current codebase.