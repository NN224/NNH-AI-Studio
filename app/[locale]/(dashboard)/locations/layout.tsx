import { getTranslations } from "next-intl/server";
import { ReactNode } from "react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo.locations" });

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `https://nnh.ae/${locale}/locations`,
      languages: {
        en: "https://nnh.ae/en/locations",
        ar: "https://nnh.ae/ar/locations",
      },
    },
  };
}

export default function LocationsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
