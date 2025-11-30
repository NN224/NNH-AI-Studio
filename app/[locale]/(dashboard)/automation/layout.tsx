import { getTranslations } from "next-intl/server";
import { ReactNode } from "react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo.automation" });

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `https://nnh.ae/${locale}/automation`,
      languages: {
        en: "https://nnh.ae/en/automation",
        ar: "https://nnh.ae/ar/automation",
      },
    },
  };
}

export default function AutomationLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
