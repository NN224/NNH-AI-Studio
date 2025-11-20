/**
 * i18n Utility Functions
 * Helper functions for locale management
 */

import { locales } from "@/i18n";

/**
 * Remove locale prefix from pathname
 * @param pathname - The pathname with locale (e.g., /ar/home)
 * @returns The pathname without locale (e.g., /home)
 */
export function removeLocaleFromPathname(pathname: string): string {
  if (!pathname) return "/";

  // Remove locale prefix
  for (const locale of locales) {
    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.substring(locale.length + 1);
    }
    if (pathname === `/${locale}`) {
      return "/";
    }
  }

  return pathname;
}

/**
 * Add locale prefix to pathname
 * @param pathname - The pathname without locale (e.g., /home)
 * @param locale - The locale to add (e.g., 'ar')
 * @returns The pathname with locale (e.g., /ar/home)
 */
export function addLocaleToPathname(pathname: string, locale: string): string {
  const cleanPath = removeLocaleFromPathname(pathname);
  return `/${locale}${cleanPath === "/" ? "" : cleanPath}`;
}

/**
 * Switch locale in pathname
 * @param pathname - Current pathname (e.g., /ar/home)
 * @param newLocale - New locale (e.g., 'en')
 * @returns The pathname with new locale (e.g., /en/home)
 */
export function switchLocaleInPathname(
  pathname: string,
  newLocale: string,
): string {
  const pathWithoutLocale = removeLocaleFromPathname(pathname);
  return addLocaleToPathname(pathWithoutLocale, newLocale);
}

/**
 * Get current locale from pathname
 * @param pathname - The pathname (e.g., /ar/home)
 * @returns The locale (e.g., 'ar') or null if not found
 */
export function getLocaleFromPathname(pathname: string): string | null {
  if (!pathname) return null;

  for (const locale of locales) {
    if (pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`) {
      return locale;
    }
  }

  return null;
}

/**
 * Check if pathname has locale prefix
 * @param pathname - The pathname to check
 * @returns True if pathname has locale prefix
 */
export function hasLocalePrefix(pathname: string): boolean {
  return getLocaleFromPathname(pathname) !== null;
}
