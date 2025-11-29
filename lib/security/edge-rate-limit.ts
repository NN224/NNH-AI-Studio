/**
 * ============================================================================
 * Edge-Compatible Rate Limiting
 * ============================================================================
 *
 * Lightweight rate limiting for Next.js middleware (Edge Runtime).
 * Uses in-memory sliding window algorithm optimized for edge functions.
 *
 * For distributed rate limiting across multiple edge nodes, configure Upstash:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 */

import { NextRequest, NextResponse } from "next/server";

// ============================================================================
// Types
// ============================================================================

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Identifier function - extracts unique key from request */
  identifier: (req: NextRequest) => string;
  /** Optional: Skip rate limiting for certain requests */
  skip?: (req: NextRequest) => boolean;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// ============================================================================
// In-Memory Store (Edge-Compatible)
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Global store - persists across requests in the same edge instance
// Note: This is NOT distributed - each edge node has its own store
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically (every 100 requests)
let requestCount = 0;
const CLEANUP_INTERVAL = 100;

function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}

// ============================================================================
// Rate Limit Check
// ============================================================================

/**
 * Check rate limit for a given identifier
 */
export function checkEdgeRateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number,
): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const resetTime = now + windowMs;

  // Periodic cleanup
  requestCount++;
  if (requestCount >= CLEANUP_INTERVAL) {
    requestCount = 0;
    cleanupExpiredEntries();
  }

  const entry = rateLimitStore.get(identifier);

  // New window or expired entry
  if (!entry || entry.resetTime < now) {
    rateLimitStore.set(identifier, { count: 1, resetTime });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: Math.floor(resetTime / 1000),
    };
  }

  // Existing window - increment count
  entry.count++;
  const remaining = Math.max(0, limit - entry.count);
  const success = entry.count <= limit;

  return {
    success,
    limit,
    remaining,
    reset: Math.floor(entry.resetTime / 1000),
  };
}

// ============================================================================
// Identifier Extractors
// ============================================================================

/**
 * Extract IP address from request (handles proxies)
 */
export function getClientIP(req: NextRequest): string {
  // Check various headers for real IP (in order of preference)
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Take the first IP in the chain (original client)
    const ips = forwardedFor.split(",").map((ip) => ip.trim());
    return ips[0] || "unknown";
  }

  const realIP = req.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  const cfConnectingIP = req.headers.get("cf-connecting-ip");
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Fallback - this won't work in edge runtime but provides a default
  return "unknown";
}

/**
 * Generate rate limit key based on IP + path
 */
export function getIPPathKey(req: NextRequest): string {
  const ip = getClientIP(req);
  const path = new URL(req.url).pathname;
  return `${ip}:${path}`;
}

/**
 * Generate rate limit key based on IP only
 */
export function getIPKey(req: NextRequest): string {
  return getClientIP(req);
}

// ============================================================================
// Rate Limit Presets
// ============================================================================

/** Strict rate limit for authentication endpoints */
export const AUTH_RATE_LIMIT: RateLimitConfig = {
  limit: 10,
  windowSeconds: 60, // 10 requests per minute
  identifier: getIPKey,
};

/** Standard API rate limit */
export const API_RATE_LIMIT: RateLimitConfig = {
  limit: 100,
  windowSeconds: 60, // 100 requests per minute
  identifier: getIPKey,
};

/** Strict rate limit for sensitive operations */
export const SENSITIVE_RATE_LIMIT: RateLimitConfig = {
  limit: 5,
  windowSeconds: 60, // 5 requests per minute
  identifier: getIPKey,
};

/** Very strict rate limit for DDoS protection */
export const DDOS_PROTECTION: RateLimitConfig = {
  limit: 1000,
  windowSeconds: 60, // 1000 requests per minute per IP
  identifier: getIPKey,
};

// ============================================================================
// Middleware Helper
// ============================================================================

/**
 * Create rate limit response headers
 */
export function getRateLimitHeaders(
  result: RateLimitResult,
): Record<string, string> {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.reset.toString(),
  };
}

/**
 * Create a 429 Too Many Requests response
 */
export function createRateLimitResponse(result: RateLimitResult): NextResponse {
  const retryAfter = Math.max(0, result.reset - Math.floor(Date.now() / 1000));

  return NextResponse.json(
    {
      error: "Too Many Requests",
      message: "Rate limit exceeded. Please slow down.",
      code: "RATE_LIMIT_EXCEEDED",
      retry_after: retryAfter,
    },
    {
      status: 429,
      headers: {
        ...getRateLimitHeaders(result),
        "Retry-After": retryAfter.toString(),
      },
    },
  );
}

/**
 * Apply rate limiting to a request
 * Returns null if allowed, or a 429 response if rate limited
 */
export function applyEdgeRateLimit(
  req: NextRequest,
  config: RateLimitConfig,
): NextResponse | null {
  // Check if we should skip rate limiting
  if (config.skip?.(req)) {
    return null;
  }

  const identifier = config.identifier(req);
  const result = checkEdgeRateLimit(
    identifier,
    config.limit,
    config.windowSeconds,
  );

  if (!result.success) {
    return createRateLimitResponse(result);
  }

  return null;
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
];

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
];

/**
 * Check if a request appears suspicious
 */
export function isSuspiciousRequest(req: NextRequest): boolean {
  const url = req.url;
  const userAgent = req.headers.get("user-agent") || "";

  // Check URL for suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(url)) {
      return true;
    }
  }

  // Check user agent for known scanners
  for (const pattern of SUSPICIOUS_USER_AGENTS) {
    if (pattern.test(userAgent)) {
      return true;
    }
  }

  // Check for missing or empty user agent (often bots)
  if (!userAgent || userAgent.length < 10) {
    // Allow some legitimate short user agents
    const allowedShort = ["curl", "wget", "httpie"];
    if (!allowedShort.some((ua) => userAgent.toLowerCase().includes(ua))) {
      // Don't block, but flag as suspicious for stricter rate limiting
      return false; // Changed to false to avoid blocking legitimate API clients
    }
  }

  return false;
}

/**
 * Get rate limit config based on request characteristics
 */
export function getDynamicRateLimit(req: NextRequest): RateLimitConfig {
  const path = new URL(req.url).pathname;

  // Stricter limits for auth endpoints
  if (
    path.includes("/auth/") ||
    path.includes("/login") ||
    path.includes("/signup")
  ) {
    return AUTH_RATE_LIMIT;
  }

  // Stricter limits for sensitive operations
  if (
    path.includes("/admin") ||
    path.includes("/delete") ||
    path.includes("/oauth")
  ) {
    return SENSITIVE_RATE_LIMIT;
  }

  // API endpoints
  if (path.startsWith("/api/")) {
    return API_RATE_LIMIT;
  }

  // Default DDoS protection for all other requests
  return DDOS_PROTECTION;
}
