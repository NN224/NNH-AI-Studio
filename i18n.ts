import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";

// Can be imported from a shared config
export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ locale }) => {
  // Use 'en' as fallback if locale is undefined
  const validLocale =
    locale && locales.includes(locale as Locale) ? locale : "en";

  return {
    locale: validLocale as string,
    messages: (await import(`./messages/${validLocale}.json`)).default,
    timeZone: "Asia/Dubai",
    now: new Date(),
  };
});
