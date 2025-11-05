import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rate limiting configuration
const RATE_LIMIT = 100; // requests per hour
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in ms

// In-memory rate limit store (for development)
// For production, use Redis/Upstash instead
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export async function middleware(request: NextRequest) {
  // Only rate limit API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Get user identifier (IP or user ID from cookie)
  const userId = request.cookies.get('user-id')?.value || 
                 request.headers.get('x-forwarded-for')?.split(',')[0] || 
                 request.ip ||
                 'anonymous';

  const now = Date.now();
  const userLimit = requestCounts.get(userId);

  // Reset if window expired
  if (userLimit && now > userLimit.resetAt) {
    requestCounts.delete(userId);
  }

  // Get or create rate limit entry
  const current = requestCounts.get(userId) || {
    count: 0,
    resetAt: now + RATE_LIMIT_WINDOW,
  };

  // Check if over limit
  if (current.count >= RATE_LIMIT) {
    return NextResponse.json(
      { 
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((current.resetAt - now) / 1000),
        message: `Too many requests. Please try again in ${Math.ceil((current.resetAt - now) / 1000)} seconds.`
      },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': RATE_LIMIT.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': current.resetAt.toString(),
          'Retry-After': Math.ceil((current.resetAt - now) / 1000).toString(),
        }
      }
    );
  }

  // Increment count
  current.count++;
  requestCounts.set(userId, current);

  // Add rate limit headers to response
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', RATE_LIMIT.toString());
  response.headers.set('X-RateLimit-Remaining', (RATE_LIMIT - current.count).toString());
  response.headers.set('X-RateLimit-Reset', current.resetAt.toString());

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
