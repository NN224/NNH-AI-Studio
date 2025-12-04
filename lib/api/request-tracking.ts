/**
 * Request ID Tracking for API Endpoints
 *
 * Provides unique request IDs for tracking and debugging
 */

import { nanoid } from 'nanoid'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${nanoid(10)}`
}

/**
 * Extract request ID from headers or generate new one
 */
export function getRequestId(request: NextRequest): string {
  // Check if client provided a request ID
  const clientRequestId = request.headers.get('X-Request-Id')
  if (clientRequestId && isValidRequestId(clientRequestId)) {
    return clientRequestId
  }

  // Check if middleware already added one
  const middlewareRequestId = request.headers.get('X-Internal-Request-Id')
  if (middlewareRequestId) {
    return middlewareRequestId
  }

  // Generate new one
  return generateRequestId()
}

/**
 * Validate request ID format
 */
function isValidRequestId(id: string): boolean {
  // Must be alphanumeric with underscores/hyphens, max 100 chars
  return /^[a-zA-Z0-9_-]{1,100}$/.test(id)
}

/**
 * Add request ID to response headers
 */
export function addRequestIdToResponse(response: NextResponse, requestId: string): void {
  response.headers.set('X-Request-Id', requestId)
}

/**
 * Middleware wrapper to add request tracking
 */
export function withRequestTracking<T = unknown>(
  handler: (request: NextRequest, requestId: string) => Promise<NextResponse<T>>,
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const requestId = getRequestId(request)

    try {
      // Execute handler with request ID
      const response = await handler(request, requestId)

      // Add request ID to response
      addRequestIdToResponse(response, requestId)

      return response
    } catch (error) {
      // Create error response with request ID
      const errorResponse = NextResponse.json(
        {
          error: 'Internal server error',
          requestId,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )

      addRequestIdToResponse(errorResponse, requestId)

      // Log error with request ID
      console.error(`[${requestId}] Request failed:`, error)

      return errorResponse
    }
  }
}

/**
 * Create request context with tracking info
 */
export interface RequestContext {
  requestId: string
  timestamp: string
  method: string
  path: string
  userAgent?: string
  ip?: string
  userId?: string
}

/**
 * Extract request context from NextRequest
 */
export function getRequestContext(request: NextRequest, userId?: string): RequestContext {
  return {
    requestId: getRequestId(request),
    timestamp: new Date().toISOString(),
    method: request.method,
    path: request.nextUrl.pathname,
    userAgent: request.headers.get('user-agent') || undefined,
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    userId,
  }
}

/**
 * Format log message with request context
 */
export function formatLogMessage(
  message: string,
  context: RequestContext,
  data?: Record<string, unknown>,
): string {
  const logData = {
    message,
    ...context,
    ...(data || {}),
  }

  return JSON.stringify(logData)
}

/**
 * Correlation ID for distributed tracing
 */
export function generateCorrelationId(): string {
  return `corr_${nanoid(16)}`
}

/**
 * Add correlation headers for service-to-service calls
 */
export function addCorrelationHeaders(
  headers: HeadersInit,
  requestId: string,
  correlationId?: string,
): HeadersInit {
  return {
    ...headers,
    'X-Request-Id': requestId,
    'X-Correlation-Id': correlationId || generateCorrelationId(),
    'X-Originating-Service': 'nnh-ai-studio',
  }
}
