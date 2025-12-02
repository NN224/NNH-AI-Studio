/**
 * Diagnostics Endpoints Protection
 *
 * SECURITY: Blocks all diagnostic endpoints in production
 * unless the user is an authenticated admin
 */

import { isCurrentUserAdmin } from '@/lib/auth/admin-check'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Protect diagnostic endpoints from unauthorized access
 */
export async function protectDiagnosticEndpoint(): Promise<NextResponse | null> {
  // In development, allow access
  if (process.env.NODE_ENV === 'development') {
    return null // Allow access
  }

  // In production, require admin
  const { isAdmin, error } = await isCurrentUserAdmin()

  if (error || !isAdmin) {
    return NextResponse.json(
      {
        success: false,
        error: 'Forbidden',
        message: 'This endpoint is not available in production',
      },
      { status: 403 },
    )
  }

  return null // Allow access for admin
}

/**
 * Higher-order function to wrap diagnostic handlers
 */
export function withDiagnosticProtection(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Check protection
    const protectionResponse = await protectDiagnosticEndpoint()
    if (protectionResponse) {
      return protectionResponse
    }

    // Execute handler
    return handler(request)
  }
}

/**
 * List of diagnostic endpoints that should be protected
 */
export const DIAGNOSTIC_ENDPOINTS = [
  '/api/diagnostics/ai-health',
  '/api/diagnostics/database-health',
  '/api/diagnostics/missing-tables',
  '/api/diagnostics/oauth-advanced',
  '/api/diagnostics/table-schema',
  '/api/diagnostics/test-encryption',
  '/api/diagnostics/test-error',
]

/**
 * Check if a path is a diagnostic endpoint
 */
export function isDiagnosticEndpoint(path: string): boolean {
  return DIAGNOSTIC_ENDPOINTS.some((endpoint) => path.startsWith(endpoint))
}
