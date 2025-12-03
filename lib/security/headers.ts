import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * Security headers configuration
 */
export const SECURITY_HEADERS = {
  // Prevent iframes to protect against clickjacking
  'X-Frame-Options': 'DENY',

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Enable XSS protection (legacy browsers)
  'X-XSS-Protection': '1; mode=block',

  // DNS prefetching control
  'X-DNS-Prefetch-Control': 'on',

  // Referrer policy for privacy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions policy - restrict all sensitive APIs
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',

  // Remove server header for security
  'X-Powered-By': '',

  // Prevent downloads of HTML files as attachments
  'X-Download-Options': 'noopen',

  // Require user consent for cookies (EU GDPR)
  'X-Permitted-Cross-Domain-Policies': 'none',
}

/**
 * HSTS header (only in production)
 */
export const HSTS_HEADER = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
}

/**
 * Get Content Security Policy directives
 */
export function getCSPDirectives(): Record<string, string[]> {
  return {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'", // Required for Next.js inline scripts
      "'unsafe-eval'", // Required for Next.js development and some features
      'https://*.googleapis.com',
      'https://*.gstatic.com',
      'https://*.google.com',
      'https://*.googletagmanager.com',
      'https://accounts.google.com',
      'https://apis.google.com',
      'https://www.gstatic.com',
      'https://ssl.gstatic.com',
      'https://*.sentry.io',
      'https://*.ingest.sentry.io',
      'https://*.ingest.de.sentry.io',
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for Next.js and UI libraries
      'https://fonts.googleapis.com',
    ],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https:',
      'http:', // Some user content might be HTTP
    ],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    'connect-src': [
      "'self'",
      'https://*.supabase.co',
      'wss://*.supabase.co',
      'https://maps.googleapis.com',
      'https://www.google-analytics.com',
      'https://*.googleapis.com',
      'https://accounts.google.com',
      'https://oauth2.googleapis.com',
      'https://www.googleapis.com',
      'https://mybusinessbusinessinformation.googleapis.com',
      'https://mybusinessqanda.googleapis.com',
      'https://mybusinessaccountmanagement.googleapis.com',
      'https://analytics.google.com',
      'https://analyticsreporting.googleapis.com',
    ],
    'media-src': ["'self'"],
    'object-src': ["'none'"],
    'frame-src': [
      "'self'",
      'https://www.google.com',
      'https://maps.google.com',
      'https://accounts.google.com',
      'https://*.google.com',
    ],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  }
}

/**
 * Generate CSP header value
 */
export function generateCSP(): string {
  const directives = getCSPDirectives()
  const parts: string[] = []

  for (const [key, values] of Object.entries(directives)) {
    if (values.length > 0) {
      parts.push(`${key} ${values.join(' ')}`)
    }
  }

  // Add upgrade-insecure-requests in production
  if (process.env.NODE_ENV === 'production') {
    parts.push('upgrade-insecure-requests')
  }

  return parts.join('; ')
}

/**
 * Apply security headers to a response
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  // Apply basic security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    if (value) {
      response.headers.set(key, value)
    } else {
      // Remove header if value is empty
      response.headers.delete(key)
    }
  })

  // Apply HSTS in production
  if (process.env.NODE_ENV === 'production') {
    Object.entries(HSTS_HEADER).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
  }

  // Apply CSP
  response.headers.set('Content-Security-Policy', generateCSP())

  return response
}

/**
 * Middleware helper to add security headers
 */
export function withSecurityHeaders(
  handler: (request: NextRequest) => Promise<NextResponse> | NextResponse,
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const response = await handler(request)
    return applySecurityHeaders(response)
  }
}

/**
 * Get CORS headers for API routes
 */
export function getCORSHeaders(origin?: string): Record<string, string> {
  const allowedOrigin =
    process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_APP_URL || 'https://nnh.ae'
      : 'http://localhost:5050'

  return {
    'Access-Control-Allow-Origin': origin && isOriginAllowed(origin) ? origin : allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers':
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 hours
  }
}

/**
 * Check if an origin is allowed for CORS
 */
function isOriginAllowed(origin: string): boolean {
  const allowedOrigins = [
    'http://localhost:5050',
    'http://localhost:3001',
    'https://nnh.ae',
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter(Boolean)

  return allowedOrigins.includes(origin)
}

/**
 * API route cache headers
 */
export function getAPICacheHeaders(maxAge = 0, sMaxAge = 0): Record<string, string> {
  if (maxAge === 0 && sMaxAge === 0) {
    return {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    }
  }

  return {
    'Cache-Control': `public, max-age=${maxAge}, s-maxage=${sMaxAge}`,
  }
}

/**
 * Static asset cache headers
 */
export function getStaticCacheHeaders(): Record<string, string> {
  return {
    'Cache-Control': 'public, max-age=31536000, immutable',
  }
}
