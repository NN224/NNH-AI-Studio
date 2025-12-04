/**
 * Client-side Configuration
 *
 * SECURITY: Only expose non-sensitive configuration to the client
 * Never expose API keys, secrets, or internal URLs
 */

// Public configuration that's safe to expose
export const clientConfig = {
  // Application
  appName: 'NNH AI Studio',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://nnh.ae',

  // Features
  features: {
    analytics: process.env.NEXT_PUBLIC_GA_ID ? true : false,
    maps: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? true : false,
    cdn: process.env.NEXT_PUBLIC_CDN_ENABLED === 'true',
  },

  // CDN (safe to expose)
  cdn: {
    enabled: process.env.NEXT_PUBLIC_CDN_ENABLED === 'true',
    domain: process.env.NEXT_PUBLIC_CDN_DOMAIN,
    provider: process.env.NEXT_PUBLIC_CDN_PROVIDER,
  },

  // Public API endpoints (no internal URLs)
  api: {
    baseUrl: '/api',
    version: 'v1',
  },

  // UI Configuration
  ui: {
    theme: 'light',
    locale: 'en',
  },
} as const

/**
 * Get safe configuration value
 */
export function getSafeConfig<K extends keyof typeof clientConfig>(
  key: K,
): (typeof clientConfig)[K] {
  return clientConfig[key]
}

/**
 * Check if feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof clientConfig.features): boolean {
  return clientConfig.features[feature] === true
}

/**
 * NEVER expose these in client code
 */
const FORBIDDEN_ENV_VARS = [
  'DATABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SENDGRID_API_KEY',
  'GOOGLE_CLIENT_SECRET',
  'INTERNAL_API_SECRET',
  'ENCRYPTION_KEY',
  'CSRF_SECRET',
  'ADMIN_EMAILS',
  'VIRUSTOTAL_API_KEY',
  'CDN_API_KEY',
  'CLOUDFLARE_ZONE_ID',
]

/**
 * Runtime check to prevent accidental exposure
 */
if (typeof window !== 'undefined') {
  FORBIDDEN_ENV_VARS.forEach((varName) => {
    if (process.env[varName]) {
      console.error(
        `🚨 SECURITY WARNING: ${varName} is exposed to the client! This is a critical security issue.`,
      )
    }
  })
}
