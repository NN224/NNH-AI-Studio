/**
 * Temporary i18n stub implementation
 *
 * This is a temporary solution to provide translation functionality
 * while the full next-intl integration is being completed.
 *
 * TODO: Replace with proper next-intl useTranslations implementation
 */

/**
 * Simple translation stub that returns the translation key as-is
 * @param key - Translation key
 * @param params - Optional parameters (ignored in stub implementation)
 * @returns The translation key (temporary implementation)
 */
export function t(key: string, params?: Record<string, any>): string {
  return key;
}

/**
 * Hook for scoped translations - returns a t function for the given namespace
 * @param namespace - Translation namespace
 * @returns Translation function for the namespace
 */
export function useTranslations(namespace?: string) {
  return (key: string, params?: Record<string, any>) => {
    return namespace ? `${namespace}.${key}` : key;
  };
}

/**
 * Export as default for convenience
 */
export default t;
