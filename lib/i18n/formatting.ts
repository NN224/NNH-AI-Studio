/**
 * i18n Formatting Utilities
 * Provides locale-aware date, time, number, and currency formatting
 */

import { useFormatter, useLocale } from "next-intl";

/**
 * Hook for formatting dates, times, numbers, and currencies
 * Client-side only
 */
export function useI18nFormatter() {
  const format = useFormatter();
  const locale = useLocale();

  return {
    // Date formatting
    // Using any here because next-intl has complex internal types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    formatDate: (date: Date | string | number, options?: any) => {
      const dateObj =
        typeof date === "string" || typeof date === "number"
          ? new Date(date)
          : date;
      return format.dateTime(
        dateObj,
        options || {
          year: "numeric",
          month: "long",
          day: "numeric",
        },
      );
    },

    // Time formatting
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    formatTime: (date: Date | string | number, options?: any) => {
      const dateObj =
        typeof date === "string" || typeof date === "number"
          ? new Date(date)
          : date;
      return format.dateTime(
        dateObj,
        options || {
          hour: "2-digit",
          minute: "2-digit",
        },
      );
    },

    // DateTime formatting
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    formatDateTime: (date: Date | string | number, options?: any) => {
      const dateObj =
        typeof date === "string" || typeof date === "number"
          ? new Date(date)
          : date;
      return format.dateTime(
        dateObj,
        options || {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        },
      );
    },

    // Relative time formatting
    formatRelativeTime: (date: Date | string | number) => {
      const dateObj =
        typeof date === "string" || typeof date === "number"
          ? new Date(date)
          : date;
      return format.relativeTime(dateObj);
    },

    // Number formatting
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    formatNumber: (value: number, options?: any) => {
      return format.number(value, options);
    },

    // Currency formatting
    formatCurrency: (
      value: number,
      currency: string = "USD",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      options?: any,
    ) => {
      return format.number(value, {
        style: "currency",
        currency,
        ...options,
      });
    },

    // Percentage formatting
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    formatPercent: (value: number, options?: any) => {
      return format.number(value / 100, {
        style: "percent",
        ...options,
      });
    },

    // Compact number formatting (1K, 1M, etc.)
    formatCompactNumber: (value: number) => {
      return format.number(value, {
        notation: "compact",
        compactDisplay: "short",
      });
    },

    locale,
  };
}

/**
 * Server-side date formatting
 */
export function formatDateServer(
  date: Date | string | number,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
) {
  const dateObj =
    typeof date === "string" || typeof date === "number"
      ? new Date(date)
      : date;
  return new Intl.DateTimeFormat(
    locale,
    options || {
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  ).format(dateObj);
}

/**
 * Server-side time formatting
 */
export function formatTimeServer(
  date: Date | string | number,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
) {
  const dateObj =
    typeof date === "string" || typeof date === "number"
      ? new Date(date)
      : date;
  return new Intl.DateTimeFormat(
    locale,
    options || {
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(dateObj);
}

/**
 * Server-side number formatting
 */
export function formatNumberServer(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions,
) {
  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * Server-side currency formatting
 */
export function formatCurrencyServer(
  value: number,
  locale: string,
  currency: string = "USD",
  options?: Intl.NumberFormatOptions,
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    ...options,
  }).format(value);
}
