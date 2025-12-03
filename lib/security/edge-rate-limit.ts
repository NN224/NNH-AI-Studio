/**
 * ============================================================================
 * DISTRIBUTED Edge-Compatible Rate Limiting
 * ============================================================================
 *
 * Rate limiting for Next.js middleware using Upstash Redis.
 * Provides distributed rate limiting across all edge instances.
 *
 * REQUIRED environment variables:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 *
 * SECURITY: This implementation FAILS CLOSED - if Redis is unavailable,
 * requests are DENIED to prevent bypass attacks.
 */

import { apiLogger } from '@/lib/utils/logger'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

// ============================================================================
// Types
// ============================================================================

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  limit: number
  /** Time window in seconds */
  windowSeconds: number
  /** Identifier function - extracts unique key from request */
  identifier: (req: NextRequest) => string
  /** Optional: Skip rate limiting for certain requests */
  skip?: (req: NextRequest) => boolean
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

// ============================================================================
// Distributed Rate Limiter (Upstash Redis)
// ============================================================================

let ratelimiters: Map<string, Ratelimit> | null = null
let redisConfigured = false
let configCheckDone = false

/**
 * Get or create rate limiter for specific configuration
 */
function getRateLimiter(limit: number, windowSeconds: number): Ratelimit | null {
  // Check configuration only once
  if (!configCheckDone) {
    configCheckDone = true
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

    if (!redisUrl || !redisToken) {
      apiLogger.error(
        'Upstash Redis not configured - Rate limiting will FAIL CLOSED',
        new Error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN'),
      )
      redisConfigured = false
    } else {
      redisConfigured = true
      ratelimiters = new Map()
    }
  }

  if (!redisConfigured || !ratelimiters) {
    return null
  }

  // Create unique key for this rate limit configuration
  const configKey = `${limit}:${windowSeconds}`

  // Return cached limiter if exists
  if (ratelimiters.has(configKey)) {
    return ratelimiters.get(configKey)!
  }

  // Create new limiter for this configuration
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
    analytics: true,
    prefix: 'nnh:ratelimit',
  })

  ratelimiters.set(configKey, limiter)
  return limiter
}

// ============================================================================
// Rate Limit Check (Async - Distributed)
// ============================================================================

/**
 * Check rate limit for a given identifier (distributed via Upstash Redis)
 * SECURITY: FAILS CLOSED - denies requests if Redis unavailable
 */
export async function checkEdgeRateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const now = Date.now()
  const resetTime = now + windowSeconds * 1000

  const limiter = getRateLimiter(limit, windowSeconds)

  // FAIL CLOSED: If Redis not available, DENY the request
  if (!limiter) {
    apiLogger.error('Rate limiter unavailable - denying request', new Error('Redis unavailable'), {
      identifier,
    })
    return {
      success: false,
      limit: 0,
      remaining: 0,
      reset: Math.floor(resetTime / 1000),
    }
  }

  try {
    const result = await limiter.limit(identifier)
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: Math.floor(result.reset / 1000),
    }
  } catch (error) {
    apiLogger.error(
      'Rate limit check failed',
      error instanceof Error ? error : new Error(String(error)),
    )
    // FAIL CLOSED on error - deny the request
    return {
      success: false,
      limit: 0,
      remaining: 0,
      reset: Math.floor(resetTime / 1000),
    }
  }
}

// ============================================================================
// Identifier Extractors
// ============================================================================

/**
 * Extract IP address from request (handles proxies)
 */
export function getClientIP(req: NextRequest): string {
  // Check various headers for real IP (in order of preference)
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // Take the first IP in the chain (original client)
    const ips = forwardedFor.split(',').map((ip) => ip.trim())
    return ips[0] || 'unknown'
  }

  const realIP = req.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  const cfConnectingIP = req.headers.get('cf-connecting-ip')
  if (cfConnectingIP) {
    return cfConnectingIP
  }

  // Fallback - this won't work in edge runtime but provides a default
  return 'unknown'
}

/**
 * Generate rate limit key based on IP + path
 */
export function getIPPathKey(req: NextRequest): string {
  const ip = getClientIP(req)
  const path = new URL(req.url).pathname
  return `${ip}:${path}`
}

/**
 * Generate rate limit key based on IP only
 */
export function getIPKey(req: NextRequest): string {
  return getClientIP(req)
}

// ============================================================================
// Rate Limit Presets
// ============================================================================

/** Strict rate limit for authentication endpoints */
export const AUTH_RATE_LIMIT: RateLimitConfig = {
  limit: 10,
  windowSeconds: 60, // 10 requests per minute
  identifier: getIPKey,
}

/** Standard API rate limit */
export const API_RATE_LIMIT: RateLimitConfig = {
  limit: 300,
  windowSeconds: 60, // 300 requests per minute (increased for SPA with many API calls)
  identifier: getIPKey,
}

/** Strict rate limit for sensitive operations */
export const SENSITIVE_RATE_LIMIT: RateLimitConfig = {
  limit: 5,
  windowSeconds: 60, // 5 requests per minute
  identifier: getIPKey,
}

/** Very strict rate limit for DDoS protection */
export const DDOS_PROTECTION: RateLimitConfig = {
  limit: 1000,
  windowSeconds: 60, // 1000 requests per minute per IP
  identifier: getIPKey,
}

// ============================================================================
// Middleware Helper
// ============================================================================

/**
 * Create rate limit response headers
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  }
}

/**
 * Create a 429 Too Many Requests response
 */
export function createRateLimitResponse(result: RateLimitResult): NextResponse {
  const retryAfter = Math.max(0, result.reset - Math.floor(Date.now() / 1000))

  return NextResponse.json(
    {
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please slow down.',
      code: 'RATE_LIMIT_EXCEEDED',
      retry_after: retryAfter,
    },
    {
      status: 429,
      headers: {
        ...getRateLimitHeaders(result),
        'Retry-After': retryAfter.toString(),
      },
    },
  )
}

/**
 * Apply rate limiting to a request (async - uses distributed Redis)
 * Returns null if allowed, or a 429 response if rate limited
 */
export async function applyEdgeRateLimit(
  req: NextRequest,
  config: RateLimitConfig,
): Promise<NextResponse | null> {
  // Check if we should skip rate limiting
  if (config.skip?.(req)) {
    return null
  }

  const identifier = config.identifier(req)
  const result = await checkEdgeRateLimit(identifier, config.limit, config.windowSeconds)

  if (!result.success) {
    return createRateLimitResponse(result)
  }

  return null
}

// ============================================================================
// Suspicious Request Detection
// ============================================================================

/** Patterns that indicate potentially malicious requests */
const SUSPICIOUS_PATTERNS = [
  /\.\.\//g, // Path traversal
  /<script/gi, // XSS attempts
  /union\s+select/gi, // SQL injection
  /exec\s*\(/gi, // Command injection
  /eval\s*\(/gi, // Code injection
  /javascript:/gi, // XSS via protocol
  /on\w+\s*=/gi, // Event handler injection
  // eslint-disable-next-line no-control-regex
  /\u0000/g, // Null byte injection
]

/** User agents that indicate bots/scanners */
const SUSPICIOUS_USER_AGENTS = [
  /sqlmap/i,
  /nikto/i,
  /nmap/i,
  /masscan/i,
  /zgrab/i,
  /gobuster/i,
  /dirbuster/i,
  /wpscan/i,
  /nuclei/i,
  /httpx/i,
]

/**
 * Check if a request appears suspicious
 */
export function isSuspiciousRequest(req: NextRequest): boolean {
  const url = req.url
  const userAgent = req.headers.get('user-agent') || ''

  // Check URL for suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(url)) {
      return true
    }
  }

  // Check user agent for known scanners
  for (const pattern of SUSPICIOUS_USER_AGENTS) {
    if (pattern.test(userAgent)) {
      return true
    }
  }

  // Check for missing or empty user agent (often bots)
  if (!userAgent || userAgent.length < 10) {
    // Allow some legitimate short user agents
    const allowedShort = ['curl', 'wget', 'httpie']
    if (!allowedShort.some((ua) => userAgent.toLowerCase().includes(ua))) {
      // Don't block, but flag as suspicious for stricter rate limiting
      return false // Changed to false to avoid blocking legitimate API clients
    }
  }

  return false
}

/**
 * Get rate limit config based on request characteristics
 */
export function getDynamicRateLimit(req: NextRequest): RateLimitConfig {
  const path = new URL(req.url).pathname

  // SKIP rate limiting for OAuth callbacks and GMB endpoints
  // They are already protected by state tokens and rate limiting breaks the OAuth flow
  if (
    path.includes('/auth/callback') ||
    path.includes('/oauth-callback') ||
    path.includes('/api/gmb/oauth-callback') ||
    path.includes('/api/youtube/oauth-callback') ||
    path.startsWith('/api/gmb')
  ) {
    return {
      limit: 500,
      windowSeconds: 60, // Very permissive for OAuth and GMB
      identifier: getIPKey,
    }
  }

  // Stricter limits for auth endpoints (login/signup only)
  if (path.includes('/login') || path.includes('/signup') || path.includes('/auth/reset')) {
    return AUTH_RATE_LIMIT
  }

  // Stricter limits for sensitive operations
  if (path.includes('/admin') || path.includes('/delete')) {
    return SENSITIVE_RATE_LIMIT
  }

  // API endpoints
  if (path.startsWith('/api/')) {
    return API_RATE_LIMIT
  }

  // Default DDoS protection for all other requests
  return DDOS_PROTECTION
}
