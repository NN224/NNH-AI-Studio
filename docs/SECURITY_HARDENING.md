# Security Hardening Guide

## Overview

This document describes the security measures implemented for multi-tenancy isolation and edge security.

## 1. Security Headers

All responses include strict security headers configured in `lib/security/headers.ts`:

| Header                      | Value                                 | Purpose                  |
| --------------------------- | ------------------------------------- | ------------------------ |
| `X-Frame-Options`           | `DENY`                                | Prevent clickjacking     |
| `X-Content-Type-Options`    | `nosniff`                             | Prevent MIME sniffing    |
| `X-XSS-Protection`          | `1; mode=block`                       | XSS protection (legacy)  |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`     | Privacy                  |
| `Permissions-Policy`        | `camera=(), microphone=()...`         | Feature restrictions     |
| `Content-Security-Policy`   | See below                             | XSS/injection prevention |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | HTTPS enforcement (prod) |

### Content Security Policy

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googleapis.com ...;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
img-src 'self' data: blob: https:;
connect-src 'self' https://*.supabase.co wss://*.supabase.co ...;
frame-ancestors 'none';
```

## 2. Edge-Level Rate Limiting

Implemented in `lib/security/edge-rate-limit.ts` and applied in `middleware.ts`:

### Rate Limit Tiers

| Endpoint Type  | Limit    | Window | Purpose                 |
| -------------- | -------- | ------ | ----------------------- |
| Auth endpoints | 10 req   | 60s    | Brute force protection  |
| Sensitive ops  | 5 req    | 60s    | Admin/delete protection |
| API endpoints  | 100 req  | 60s    | General API protection  |
| All requests   | 1000 req | 60s    | DDoS protection         |

### Suspicious Request Detection

Automatically blocks requests containing:

- Path traversal (`../`)
- XSS attempts (`<script`, `javascript:`)
- SQL injection patterns (`union select`, `exec(`)
- Known scanner user agents (sqlmap, nikto, nmap)

### Rate Limit Response

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please slow down.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retry_after": 45
}
```

Headers included:

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Unix timestamp when limit resets
- `Retry-After`: Seconds until retry is allowed

## 3. Tenant Isolation

Implemented in `lib/security/tenant-isolation.ts`:

### Core Principle

**NEVER trust client-provided user IDs or account IDs for authorization.**

Always derive the user ID from server-side authentication:

```typescript
// ❌ WRONG - Never do this
const { userId } = await request.json();
const data = await supabase.from("locations").select().eq("user_id", userId);

// ✅ CORRECT - Always do this
const {
  data: { user },
} = await supabase.auth.getUser();
const data = await supabase.from("locations").select().eq("user_id", user.id);
```

### Using Tenant Context

```typescript
import { getTenantContext } from "@/lib/security/tenant-isolation";

export async function GET(request: NextRequest) {
  const tenant = await getTenantContext();

  if (!tenant.isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use tenant.userId for all queries
  const { data } = await tenant.supabase
    .from("gmb_locations")
    .select("*")
    .eq("user_id", tenant.userId);
}
```

### Sanitizing Request Bodies

```typescript
import { sanitizeRequestBody } from "@/lib/security/tenant-isolation";

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Remove any client-provided user_id/account_id
  const sanitizedBody = sanitizeRequestBody(body);

  // Now safe to use
}
```

### Verifying Resource Access

```typescript
import { verifyLocationAccess } from "@/lib/security/tenant-isolation";

export async function GET(request: NextRequest, { params }) {
  const { allowed, location } = await verifyLocationAccess(params.locationId);

  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Safe to use location
}
```

## 4. API Route Security Checklist

Every API route should:

1. **Authenticate** - Call `supabase.auth.getUser()` first
2. **Rate limit** - Apply appropriate rate limiting
3. **Validate input** - Use Zod schemas for request bodies
4. **Filter by user** - Include `user_id = authenticated_user_id` in all queries
5. **Sanitize output** - Never expose internal errors in production

### Example Secure Route

```typescript
import {
  withSecureApi,
  success,
  ApiError,
  ErrorCode,
} from "@/lib/api/secure-handler";
import { mySchema } from "@/lib/api/schemas";

export const POST = withSecureApi<MyInput>(
  async (_request, { user, body }) => {
    // user is guaranteed to be authenticated
    // body is already validated by Zod

    const { data, error } = await supabase
      .from("my_table")
      .insert({
        ...body,
        user_id: user.id, // Always use authenticated user ID
      })
      .select()
      .single();

    if (error) {
      throw new ApiError(ErrorCode.DATABASE_ERROR, "Failed to create", 500);
    }

    return success(data);
  },
  {
    bodySchema: mySchema,
    requireAuth: true,
  },
);
```

## 5. Database Security (RLS)

Row Level Security should be enabled on all tables:

```sql
-- Enable RLS
ALTER TABLE gmb_locations ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can only access their own locations"
ON gmb_locations
FOR ALL
USING (user_id = auth.uid());
```

## 6. Monitoring & Logging

Security events are logged with structured format:

```typescript
console.warn("[Middleware] Blocked suspicious request:", {
  ip: getClientIP(request),
  path: pathname,
  userAgent: request.headers.get("user-agent"),
  timestamp: new Date().toISOString(),
});
```

Monitor for:

- Rate limit exceeded events
- Suspicious request blocks
- Tenant isolation violations
- Authentication failures

## 7. Environment Variables

Required security-related environment variables:

| Variable                   | Purpose                              |
| -------------------------- | ------------------------------------ |
| `CRON_SECRET`              | Authenticate scheduled jobs          |
| `TRIGGER_SECRET`           | Authenticate internal triggers       |
| `UPSTASH_REDIS_REST_URL`   | Distributed rate limiting (optional) |
| `UPSTASH_REDIS_REST_TOKEN` | Distributed rate limiting (optional) |

## 8. Testing Security

### Test Rate Limiting

```bash
# Should get 429 after limit exceeded
for i in {1..20}; do
  curl -X POST http://localhost:5050/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
```

### Test Tenant Isolation

```bash
# Should get 404 (not 403) - don't reveal resource exists
curl http://localhost:5050/api/locations/other-users-location-id \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Security Headers

```bash
curl -I http://localhost:5050/ | grep -E "(X-Frame|X-Content|CSP|Strict)"
```
