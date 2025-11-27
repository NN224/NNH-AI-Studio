/**
 * Safe redirect utilities to prevent Open Redirect vulnerabilities
 */

// Whitelist of allowed domains for redirects
const ALLOWED_DOMAINS = [
  "localhost",
  "127.0.0.1",
  "nnh.ae",
  "www.nnh.ae",
  "app.nnh.ae",
  "api.nnh.ae",
  "admin.nnh.ae",
  // Add any other subdomains you use
  // Example: 'yourdomain.com', 'www.yourdomain.com'
];

// Allowed protocols
const ALLOWED_PROTOCOLS = ["http:", "https:"];

/**
 * Validates if a URL is safe for redirect
 */
export function isSafeRedirectUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);

    // Check protocol
    if (!ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
      return false;
    }

    // Check domain
    const hostname = parsedUrl.hostname.toLowerCase();

    // Allow exact matches or subdomains of allowed domains
    const isAllowed = ALLOWED_DOMAINS.some((domain) => {
      return hostname === domain || hostname.endsWith(`.${domain}`);
    });

    return isAllowed;
  } catch {
    // Invalid URL
    return false;
  }
}

/**
 * Gets a safe base URL for redirects
 */
export function getSafeBaseUrl(request: Request): string {
  // Always prefer environment variable for production
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    const envUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (isSafeRedirectUrl(envUrl)) {
      return envUrl;
    }
  }

  // Fallback to request headers with validation
  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = request.headers.get("host") || requestUrl.host;

  const proto = forwardedProto || requestUrl.protocol.replace(":", "");
  const finalHost = forwardedHost || host;

  const constructedUrl = `${proto}://${finalHost}`;

  // Validate the constructed URL
  if (isSafeRedirectUrl(constructedUrl)) {
    return constructedUrl;
  }

  // Safe fallback - use environment or production domain
  return process.env.NEXT_PUBLIC_BASE_URL || "https://nnh.ae";
}

/**
 * Creates a safe redirect response
 */
export function createSafeRedirect(
  url: string,
  fallbackUrl: string = "/",
): Response {
  const redirectUrl = isSafeRedirectUrl(url) ? url : fallbackUrl;
  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectUrl,
    },
  });
}

/**
 * Builds a validated redirect URL from a safe base URL and path components.
 * This function ensures the final URL is safe by:
 * 1. Using a pre-validated base URL from getSafeBaseUrl()
 * 2. Only allowing hardcoded path segments (not user input)
 * 3. Properly encoding any query parameters
 *
 * @param baseUrl - Must be from getSafeBaseUrl() which validates against allowlist
 * @param path - Hardcoded path (e.g., '/en/settings')
 * @param queryParams - Optional query parameters to append (will be encoded)
 * @returns The complete validated URL string
 */
export function buildSafeRedirectUrl(
  baseUrl: string,
  path: string,
  queryParams?: Record<string, string>,
): string {
  // Double-check the base URL is valid (defense in depth)
  if (!isSafeRedirectUrl(baseUrl)) {
    // Fallback to production domain if somehow invalid
    baseUrl = "https://nnh.ae";
  }

  // Ensure path starts with /
  const safePath = path.startsWith("/") ? path : `/${path}`;

  // Build query string if params provided
  let queryString = "";
  if (queryParams && Object.keys(queryParams).length > 0) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(queryParams)) {
      params.set(key, value);
    }
    queryString = `?${params.toString()}`;
  }

  return `${baseUrl}${safePath}${queryString}`;
}
