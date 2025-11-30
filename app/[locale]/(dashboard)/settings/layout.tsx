import { getTranslations } from "next-intl/server";
import { ReactNode } from "react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo.settings" });

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `https://nnh.ae/${locale}/settings`,
      languages: {
        en: "https://nnh.ae/en/settings",
        ar: "https://nnh.ae/ar/settings",
      },
    },
  };
}

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
