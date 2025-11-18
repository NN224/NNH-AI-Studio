export function getBaseUrl(): string {
  // Allow explicit override via environment variable
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL
  }
  
  // In production, use the custom domain
  if (process.env.NODE_ENV === 'production') {
    return 'https://nnh.ae'
  }
  
  // In development/preview, return localhost or preview URL
  // (This will be used for SSR/server actions, client should use window.location.origin)
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  
  // Fallback for server-side in development (e.g., during build)
  // This should ideally be passed from the request context
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:5050'
}
