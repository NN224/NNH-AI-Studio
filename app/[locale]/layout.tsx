import type React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { Toaster } from "sonner";
import { Providers } from "../providers";
import { BetaIndicator } from "@/components/common/beta-badge";

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
      locale: locale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("og.title"),
      description: t("og.description"),
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
  const direction = locale === "ar" ? "rtl" : "ltr";

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
