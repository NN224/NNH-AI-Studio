/**
 * API Versioning Configuration
 *
 * Provides versioning support for API endpoints to prevent breaking changes
 */

import { NextRequest, NextResponse } from 'next/server'

// Current API version
export const CURRENT_API_VERSION = 'v1'

// Supported API versions
export const SUPPORTED_VERSIONS = ['v1'] as const

export type ApiVersion = (typeof SUPPORTED_VERSIONS)[number]

/**
 * Extract API version from request
 */
export function getApiVersion(request: NextRequest): ApiVersion {
  // Check header first (preferred method)
  const headerVersion = request.headers.get('X-API-Version')
  if (headerVersion && isValidVersion(headerVersion)) {
    return headerVersion as ApiVersion
  }

  // Check URL path
  const path = request.nextUrl.pathname
  const versionMatch = path.match(/\/api\/(v\d+)\//)
  if (versionMatch && isValidVersion(versionMatch[1])) {
    return versionMatch[1] as ApiVersion
  }

  // Check query parameter (fallback)
  const queryVersion = request.nextUrl.searchParams.get('api_version')
  if (queryVersion && isValidVersion(queryVersion)) {
    return queryVersion as ApiVersion
  }

  // Default to current version
  return CURRENT_API_VERSION
}

/**
 * Check if version is valid
 */
function isValidVersion(version: string): boolean {
  return SUPPORTED_VERSIONS.includes(version as ApiVersion)
}

/**
 * Version-aware API handler
 */
export function withApiVersion<T = unknown>(
  handlers: Record<ApiVersion, (request: NextRequest) => Promise<NextResponse<T>>>,
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const version = getApiVersion(request)

    // Check if handler exists for this version
    const handler = handlers[version]
    if (!handler) {
      return NextResponse.json(
        {
          error: 'Unsupported API version',
          supported: SUPPORTED_VERSIONS,
          requested: version,
        },
        {
          status: 400,
          headers: {
            'X-API-Version': CURRENT_API_VERSION,
            'X-Supported-Versions': SUPPORTED_VERSIONS.join(', '),
          },
        },
      )
    }

    // Execute versioned handler
    const response = await handler(request)

    // Add version headers to response
    response.headers.set('X-API-Version', version)
    response.headers.set('X-Current-Version', CURRENT_API_VERSION)

    return response
  }
}

/**
 * Deprecation notice for old API versions
 */
export function addDeprecationWarning(
  response: NextResponse,
  version: ApiVersion,
  deprecationDate: string,
  alternativeVersion: ApiVersion = CURRENT_API_VERSION,
): void {
  response.headers.set('X-API-Deprecated', 'true')
  response.headers.set('X-API-Deprecation-Date', deprecationDate)
  response.headers.set('X-API-Alternative-Version', alternativeVersion)
  response.headers.set(
    'Warning',
    `299 - "This API version (${version}) is deprecated and will be removed after ${deprecationDate}. Please migrate to ${alternativeVersion}."`,
  )
}

/**
 * Create versioned API route path
 */
export function versionedRoute(path: string, version: ApiVersion = CURRENT_API_VERSION): string {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path

  // Remove 'api/' prefix if present
  const pathWithoutApi = cleanPath.startsWith('api/') ? cleanPath.slice(4) : cleanPath

  return `/api/${version}/${pathWithoutApi}`
}

/**
 * Middleware to redirect unversioned routes to versioned ones
 */
export function redirectToVersionedApi(request: NextRequest): NextResponse | null {
  const path = request.nextUrl.pathname

  // Skip if already versioned
  if (path.match(/\/api\/v\d+\//)) {
    return null
  }

  // Skip certain paths that shouldn't be versioned
  const excludedPaths = ['/api/health', '/api/csrf-token', '/api/auth']

  if (excludedPaths.some((excluded) => path.startsWith(excluded))) {
    return null
  }

  // Redirect to versioned endpoint
  const versionedPath = path.replace('/api/', `/api/${CURRENT_API_VERSION}/`)
  const url = request.nextUrl.clone()
  url.pathname = versionedPath

  return NextResponse.redirect(url, { status: 308 }) // Permanent redirect
}
