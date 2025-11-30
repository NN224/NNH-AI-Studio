import { getTranslations } from "next-intl/server";
import { ReactNode } from "react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo.analytics" });

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `https://nnh.ae/${locale}/analytics`,
      languages: {
        en: "https://nnh.ae/en/analytics",
        ar: "https://nnh.ae/ar/analytics",
      },
    },
  };
}

export default function AnalyticsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
