import { NextRequest } from 'next/server';

/**
 * Dynamically determines the base URL for the current request, prioritizing:
 * 1. NEXT_PUBLIC_BASE_URL environment variable.
 * 2. Request headers (for Vercel/Codespaces environments).
 * 3. Fallback to http://localhost:5050.
 * 
 * @param request The NextRequest object.
 * @returns The determined base URL string.
 */
export function getBaseUrlDynamic(request: NextRequest): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }

  const host = request.headers.get('host');
  if (host) {
    // Check for secure connection (Codespaces/Vercel typically use x-forwarded-proto)
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    return `${protocol}://${host}`;
  }

  // Fallback for local development or if headers are missing
  return process.env.NODE_ENV === 'production' ? 'https://nnh.ae' : 'http://localhost:5050';
}
