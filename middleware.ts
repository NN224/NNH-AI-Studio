import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Upstash Ratelimit configuration with fallback to in-memory
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const RATE_LIMIT = 1000; // requests per hour per user
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour in milliseconds

// Try to initialize Upstash Redis; fallback to in-memory if env vars missing
let redis: Redis | null = null;
let ratelimit: Ratelimit | null = null;
let usingRedis = false;

try {
  redis = Redis.fromEnv();
  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(RATE_LIMIT, `${RATE_LIMIT_WINDOW_MS / 1000} s`),
    prefix: 'nnh-rate-limit',
  });
  usingRedis = true;
  console.log('[Middleware] Using Upstash Redis for rate limiting');
} catch (error) {
  console.warn('[Middleware] Upstash Redis not configured, using in-memory rate limiting fallback');
  usingRedis = false;
}

// In-memory fallback for rate limiting
const g: any = globalThis as any;
if (!g.__rateLimitStore) {
  g.__rateLimitStore = new Map<string, { count: number; resetAt: number }>();
}
const rateLimitStore: Map<string, { count: number; resetAt: number }> = g.__rateLimitStore;

// Create next-intl middleware
const intlMiddleware = createIntlMiddleware({
  locales: ['en', 'ar'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
});

function extractUserId(request: NextRequest): string {
  const jwt = request.cookies.get('sb-access-token')?.value;

  if (jwt) {
    const parts = jwt.split('.');
    if (parts.length === 3) {
      try {
        const payloadSegment = parts[1]
          .replace(/-/g, '+')
          .replace(/_/g, '/')
          .padEnd(parts[1].length + ((4 - (parts[1].length % 4)) % 4), '=');
        let decodedPayload: string | null = null;
        if (typeof globalThis.atob === 'function') {
          decodedPayload = globalThis.atob(payloadSegment);
        } else if (typeof Buffer !== 'undefined') {
          decodedPayload = Buffer.from(payloadSegment, 'base64').toString('utf-8');
        }
        const payload = decodedPayload ? JSON.parse(decodedPayload) : null;
        if (payload?.sub && typeof payload.sub === 'string' && payload.sub.trim() !== '') {
          return payload.sub;
        }
      } catch (error) {
        console.warn('[Middleware] Failed to decode sb-access-token payload:', error);
      }
    }
  }

  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwardedFor && forwardedFor.length > 0) {
    return `ip:${forwardedFor}`;
  }

  if (request.ip && request.ip.length > 0) {
    return `ip:${request.ip}`;
  }

  return 'anonymous';
}

export async function middleware(request: NextRequest) {
  // Handle i18n routing for non-API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return intlMiddleware(request);
  }

  // Rate limit API routes only
  const userId = extractUserId(request);

  let success = true;
  let limit = RATE_LIMIT;
  let remaining = RATE_LIMIT;
  let reset = Date.now() + RATE_LIMIT_WINDOW_MS;

  if (usingRedis && ratelimit) {
    // Use Upstash Redis rate limiting
    try {
      const result = await ratelimit.limit(userId);
      success = result.success;
      limit = result.limit;
      remaining = result.remaining;
      reset = result.reset;
    } catch (error) {
      console.error('[Middleware] Upstash rate limit check failed:', error);
      // Continue with in-memory fallback on error
      usingRedis = false;
    }
  }

  if (!usingRedis) {
    // In-memory fallback rate limiting
    const now = Date.now();
    const userLimit = rateLimitStore.get(userId);

    if (!userLimit || userLimit.resetAt < now) {
      // New window or expired window
      rateLimitStore.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      remaining = RATE_LIMIT - 1;
      reset = now + RATE_LIMIT_WINDOW_MS;
    } else {
      // Within current window
      userLimit.count++;
      rateLimitStore.set(userId, userLimit);
      remaining = Math.max(0, RATE_LIMIT - userLimit.count);
      reset = userLimit.resetAt;

      if (userLimit.count > RATE_LIMIT) {
        success = false;
      }
    }

    // Cleanup old entries periodically (10% chance per request)
    if (Math.random() < 0.1) {
      for (const [key, value] of rateLimitStore.entries()) {
        if (value.resetAt < now) {
          rateLimitStore.delete(key);
        }
      }
    }
  }

  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000);
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        retryAfter,
        message: `Too many requests. Please try again in ${retryAfter} seconds.`
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': reset.toString(),
          'Retry-After': retryAfter.toString(),
        }
      }
    );
  }

  // Add rate limit headers to response
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', reset.toString());

  return response;
}

export const config = {
  matcher: [
    '/',
    '/(en|ar)/:path*',
    '/((?!_next|_vercel|.*\\..*).*)',
    '/api/:path*'
  ],
};
