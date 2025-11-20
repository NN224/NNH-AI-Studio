/**
 * Navigation utilities for consistent routing across the application
 */

export type Locale = 'en' | 'ar';

/**
 * Get authentication page URL
 */
export function getAuthUrl(
  locale: Locale, 
  page: 'login' | 'signup' | 'forgot-password' | 'reset-password' | 'update-password'
): string {
  return `/${locale}/auth/${page}`;
}

/**
 * Get dashboard URL with optional path
 */
export function getDashboardUrl(locale: Locale, path?: string): string {
  const basePath = `/${locale}/dashboard`;
  return path ? `${basePath}/${path}` : basePath;
}

/**
 * Get settings URL with optional tab
 */
export function getSettingsUrl(locale: Locale, tab?: string): string {
  const basePath = `/${locale}/settings`;
  return tab ? `${basePath}/${tab}` : basePath;
}

/**
 * Get reviews URL
 */
export function getReviewsUrl(locale: Locale): string {
  return `/${locale}/reviews`;
}

/**
 * Get questions URL
 */
export function getQuestionsUrl(locale: Locale): string {
  return `/${locale}/questions`;
}

/**
 * Get posts URL
 */
export function getPostsUrl(locale: Locale): string {
  return `/${locale}/posts`;
}

/**
 * Get onboarding URL
 */
export function getOnboardingUrl(locale: Locale, step?: number): string {
  const basePath = `/${locale}/onboarding`;
  return step ? `${basePath}?step=${step}` : basePath;
}

/**
 * Extract locale from pathname
 */
export function getLocaleFromPathname(pathname: string): Locale {
  const segments = pathname.split('/').filter(Boolean);
  const locale = segments[0];
  return (locale === 'en' || locale === 'ar') ? locale : 'en';
}

/**
 * Add redirect parameter to URL
 */
export function addRedirectParam(url: string, from: string): string {
  const urlObj = new URL(url, 'http://localhost');
  urlObj.searchParams.set('redirectedFrom', from);
  return urlObj.pathname + urlObj.search;
}

/**
 * Get redirect URL from search params or default
 */
export function getRedirectUrl(
  searchParams: URLSearchParams | null,
  locale: Locale,
  defaultPath: string = '/dashboard'
): string {
  const redirectedFrom = searchParams?.get('redirectedFrom');
  
  if (redirectedFrom) {
    // Ensure the redirect URL includes the locale
    if (redirectedFrom.startsWith(`/${locale}/`)) {
      return redirectedFrom;
    }
    // If it doesn't have locale, add it
    return `/${locale}${redirectedFrom.startsWith('/') ? redirectedFrom : `/${redirectedFrom}`}`;
  }
  
  return `/${locale}${defaultPath}`;
}

/**
 * Check if user should see onboarding
 */
export function shouldShowOnboarding(
  hasCompletedOnboarding: boolean,
  hasGMBConnection: boolean
): boolean {
  return !hasCompletedOnboarding || !hasGMBConnection;
}
