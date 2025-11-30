import { getTranslations } from "next-intl/server";
import { ReactNode } from "react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo.dashboard" });

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `https://nnh.ae/${locale}/dashboard`,
      languages: {
        en: "https://nnh.ae/en/dashboard",
        ar: "https://nnh.ae/ar/dashboard",
      },
    },
  };
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
