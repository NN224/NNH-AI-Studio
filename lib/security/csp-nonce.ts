import { headers } from 'next/headers';

/**
 * Generate a cryptographically secure nonce for CSP using Web Crypto API
 * Compatible with Edge Runtime
 */
export function generateNonce(): string {
  // Use Web Crypto API which is supported in Edge Runtime
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  }
  
  // Fallback for environments without crypto
  return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
}

/**
 * Get the current nonce from headers (set by middleware)
 */
export function getNonce(): string | undefined {
  try {
    const headersList = headers();
    return headersList.get('x-nonce') || undefined;
  } catch {
    // Headers not available (e.g., in static generation)
    return undefined;
  }
}

/**
 * Create a script tag with nonce
 */
export function createNonceScript(content: string, nonce?: string): string {
  const nonceAttr = nonce ? ` nonce="${nonce}"` : '';
  return `<script${nonceAttr}>${content}</script>`;
}

/**
 * CSP directives for Google services
 */
export const GOOGLE_CSP_SOURCES = {
  'script-src': [
    'https://*.googleapis.com',
    'https://*.gstatic.com', 
    'https://*.google.com',
    'https://*.googletagmanager.com',
    'https://accounts.google.com',
    'https://apis.google.com',
    'https://www.gstatic.com',
    'https://ssl.gstatic.com',
  ],
  'connect-src': [
    'https://*.googleapis.com',
    'https://accounts.google.com',
    'https://oauth2.googleapis.com',
    'https://www.googleapis.com',
    'https://mybusinessbusinessinformation.googleapis.com',
    'https://mybusinessqanda.googleapis.com',
    'https://mybusinessaccountmanagement.googleapis.com',
    'https://analytics.google.com',
    'https://analyticsreporting.googleapis.com',
    'https://maps.googleapis.com',
    'https://www.google-analytics.com',
  ],
  'frame-src': [
    'https://www.google.com',
    'https://maps.google.com', 
    'https://accounts.google.com',
    'https://*.google.com',
  ],
  'img-src': [
    'https://*.googleapis.com',
    'https://*.gstatic.com',
    'https://*.google.com',
    'https://maps.gstatic.com',
  ],
  'style-src': [
    'https://fonts.googleapis.com',
  ],
  'font-src': [
    'https://fonts.gstatic.com',
  ],
};
