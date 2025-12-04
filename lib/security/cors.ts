/**
 * CORS (Cross-Origin Resource Sharing) Configuration
 *
 * Prevents unauthorized domains from accessing our APIs
 */

import { NextRequest, NextResponse } from 'next/server'

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://nnh.ae',
  'https://www.nnh.ae',
  'https://cdn.nnh.ae',
  // Add staging/preview URLs if needed
  ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
  // Development
  ...(process.env.NODE_ENV === 'development'
    ? ['http://localhost:3000', 'http://localhost:5050', 'http://127.0.0.1:3000']
    : []),
]

// Allowed methods
const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']

// Allowed headers
const ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-CSRF-Token',
  'X-Requested-With',
  'X-Request-Id',
]

/**
 * Check if origin is allowed
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false

  // Check exact match
  if (ALLOWED_ORIGINS.includes(origin)) {
    return true
  }

  // Check wildcard subdomains for Vercel preview deployments
  if (origin.match(/^https:\/\/nnh-ai-studio-.*\.vercel\.app$/)) {
    return true
  }

  return false
}

/**
 * Apply CORS headers to response
 */
export function corsHeaders(request: NextRequest): HeadersInit {
  const origin = request.headers.get('origin')
  const headers: HeadersInit = {}

  // Only set CORS headers if origin is allowed
  if (origin && isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Credentials'] = 'true'
  }

  // Always set these headers
  headers['Access-Control-Allow-Methods'] = ALLOWED_METHODS.join(', ')
  headers['Access-Control-Allow-Headers'] = ALLOWED_HEADERS.join(', ')
  headers['Access-Control-Max-Age'] = '86400' // 24 hours

  return headers
}

/**
 * Handle CORS preflight requests
 */
export function handleCorsPreflightRequest(request: NextRequest): NextResponse | null {
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(request),
    })
  }
  return null
}

/**
 * CORS middleware wrapper for API routes
 */
export function withCORS(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Handle preflight
    const preflightResponse = handleCorsPreflightRequest(request)
    if (preflightResponse) {
      return preflightResponse
    }

    // Process request
    const response = await handler(request)

    // Add CORS headers to response
    const headers = corsHeaders(request)
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value as string)
    })

    return response
  }
}

/**
 * Validate origin for WebSocket connections
 */
export function validateWebSocketOrigin(origin: string | null): boolean {
  if (!origin) return false
  return isOriginAllowed(origin)
}

/**
 * Get CORS policy for specific resource
 */
export function getCorsPolicy(resource: string): {
  origins: string[]
  methods: string[]
  credentials: boolean
} {
  // Different policies for different resources
  switch (resource) {
    case 'public-api':
      return {
        origins: ['*'], // Public API allows all origins
        methods: ['GET'],
        credentials: false,
      }

    case 'auth-api':
      return {
        origins: ALLOWED_ORIGINS,
        methods: ALLOWED_METHODS,
        credentials: true,
      }

    case 'upload':
      return {
        origins: ALLOWED_ORIGINS,
        methods: ['POST', 'OPTIONS'],
        credentials: true,
      }

    default:
      return {
        origins: ALLOWED_ORIGINS,
        methods: ALLOWED_METHODS,
        credentials: true,
      }
  }
}
