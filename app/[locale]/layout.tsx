import { BetaIndicator } from "@/components/common/beta-badge";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import type React from "react";
import { Toaster } from "sonner";
import { Providers } from "../providers";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: t("title"),
    description: t("description"),
    keywords: t("keywords"),
    openGraph: {
      title: t("og.title"),
      description: t("og.description"),
      locale: locale === "ar" ? "ar_AE" : "en_US",
      alternateLocale: locale === "ar" ? "en_US" : "ar_AE",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("og.title"),
      description: t("og.description"),
    },
    alternates: {
      canonical: `https://nnh.ae/${locale}`,
      languages: {
        en: "https://nnh.ae/en",
        ar: "https://nnh.ae/ar",
        "x-default": "https://nnh.ae/en",
      },
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (locale !== "en" && locale !== "ar") {
    notFound();
  }
  const messages = await getMessages({ locale });

  return (
    <div lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <NextIntlClientProvider messages={messages} locale={locale}>
        <Providers>
          <BetaIndicator />
          {children}
          <Toaster
            position={locale === "ar" ? "top-left" : "top-right"}
            richColors
            closeButton
          />
        </Providers>
      </NextIntlClientProvider>
    </div>
  );
}
