/**
 * i18n Pluralization Utilities
 * Provides pluralization support for different languages
 */

/**
 * Arabic pluralization rules
 * Arabic has 6 plural forms: zero, one, two, few, many, other
 */
export function getArabicPluralForm(
  count: number,
): "zero" | "one" | "two" | "few" | "many" | "other" {
  if (count === 0) return "zero";
  if (count === 1) return "one";
  if (count === 2) return "two";
  if (count >= 3 && count <= 10) return "few";
  if (count >= 11 && count <= 99) return "many";
  return "other";
}

/**
 * English pluralization rules
 * English has 2 plural forms: one, other
 */
export function getEnglishPluralForm(count: number): "one" | "other" {
  return count === 1 ? "one" : "other";
}

/**
 * Get plural form based on locale
 */
export function getPluralForm(count: number, locale: string): string {
  if (locale === "ar") {
    return getArabicPluralForm(count);
  }
  return getEnglishPluralForm(count);
}

/**
 * Type for plural rules
 */
export type PluralRules<T extends string = string> = {
  [key in "zero" | "one" | "two" | "few" | "many" | "other"]?: T;
};

/**
 * Format a message with pluralization
 * Example:
 * ```
 * formatPlural(5, 'en', {
 *   one: '1 item',
 *   other: '{count} items'
 * })
 * // Returns: "5 items"
 * ```
 */
export function formatPlural(
  count: number,
  locale: string,
  rules: PluralRules,
  replacements?: Record<string, string | number>,
): string {
  const form = getPluralForm(count, locale);
  let message = rules[form as keyof PluralRules] || rules.other || "";

  // Replace {count} with actual count
  message = message.replace("{count}", count.toString());

  // Replace other placeholders
  if (replacements) {
    Object.entries(replacements).forEach(([key, value]) => {
      message = message.replace(`{${key}}`, String(value));
    });
  }

  return message;
}

/**
 * Hook for pluralization in client components
 */
export function usePluralization(locale: string) {
  return {
    formatPlural: (
      count: number,
      rules: PluralRules,
      replacements?: Record<string, string | number>,
    ) => formatPlural(count, locale, rules, replacements),
    getPluralForm: (count: number) => getPluralForm(count, locale),
  };
}
