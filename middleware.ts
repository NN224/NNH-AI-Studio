import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateCSRF } from '@/lib/security/csrf';

// Upstash Ratelimit configuration with fallback to in-memory
import { Redis } from '@upstash/redis';

const REQUEST_LIMIT_PER_MIN = 100;
const REQUEST_WINDOW_MS = 60 * 1000;
const SYNC_LIMIT_PER_HOUR = 10;
const SYNC_WINDOW_MS = 60 * 60 * 1000;

// Try to initialize Upstash Redis; fallback to in-memory if env vars missing
let redis: Redis | null = null;
let usingRedis = false;

try {
  redis = Redis.fromEnv();
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

async function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();

  if (usingRedis && redis) {
    const redisKey = `ratelimit:${key}`;
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.pexpire(redisKey, windowMs);
    }
    const ttlMs = await redis.pttl(redisKey);
    const reset = ttlMs > 0 ? now + ttlMs : now + windowMs;
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      reset,
    };
  }

  const bucket = rateLimitStore.get(key);
  if (!bucket || bucket.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, reset: now + windowMs };
  }

  bucket.count += 1;
  rateLimitStore.set(key, bucket);
  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    reset: bucket.resetAt,
  };
}

// Create next-intl middleware
const intlMiddleware = createIntlMiddleware({
  locales: ['en', 'ar'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
  // Disable automatic locale detection to prevent redirects when switching to default locale
  localeDetection: false,
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

  // CSRF protection for API routes (exclude OAuth, webhook, and sync routes)
  const isOAuthRoute = request.nextUrl.pathname.includes('/oauth') || 
                       request.nextUrl.pathname.includes('/create-auth-url') ||
                       request.nextUrl.pathname.includes('/webhook') ||
                       request.nextUrl.pathname.includes('/gmb/sync');
  
  let csrfToken: string | null = null;
  if (!isOAuthRoute) {
    const { valid: csrfValid, token } = await validateCSRF(request);
    csrfToken = token || null;
    if (!csrfValid && request.method !== 'GET') {
      return NextResponse.json(
        { 
          error: 'Invalid CSRF token',
          message: 'CSRF token validation failed. Please refresh and try again.',
          csrfToken // Provide token for first-time requests
        },
        { 
          status: 403,
          headers: {
            'X-CSRF-Token': csrfToken || ''
          }
        }
      );
    }
  }

  // Rate limit API routes only
  const userId = extractUserId(request);

  const generalKey = `req:${userId}`;
  const generalResult = await checkRateLimit(generalKey, REQUEST_LIMIT_PER_MIN, REQUEST_WINDOW_MS);

  if (!generalResult.allowed) {
    const retryAfter = Math.ceil((generalResult.reset - Date.now()) / 1000);
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        retryAfter,
        message: `Too many requests. Please try again in ${retryAfter} seconds.`
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': REQUEST_LIMIT_PER_MIN.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': generalResult.reset.toString(),
          'Retry-After': retryAfter.toString(),
        }
      }
    );
  }

  const isSyncRoute =
    request.nextUrl.pathname.includes('/gmb/sync') ||
    request.nextUrl.pathname.includes('/gmb/sync-v2');

  if (isSyncRoute) {
    const syncResult = await checkRateLimit(
      `sync:${userId}`,
      SYNC_LIMIT_PER_HOUR,
      SYNC_WINDOW_MS
    );

    if (!syncResult.allowed) {
      const retryAfter = Math.ceil((syncResult.reset - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: 'Sync rate limit exceeded',
          retryAfter,
          message: `Sync operations limited to ${SYNC_LIMIT_PER_HOUR} per hour.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
          },
        }
      );
    }
  }

  if (!usingRedis && Math.random() < 0.1) {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetAt < now) {
        rateLimitStore.delete(key);
      }
    }
  }

  // Add rate limit headers to response
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', REQUEST_LIMIT_PER_MIN.toString());
  response.headers.set('X-RateLimit-Remaining', generalResult.remaining.toString());
  response.headers.set('X-RateLimit-Reset', generalResult.reset.toString());
  
  // Add CSRF token to response headers if available (for GET requests)
  if (!isOAuthRoute && csrfToken && request.method === 'GET') {
    response.headers.set('X-CSRF-Token', csrfToken);
  }

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
