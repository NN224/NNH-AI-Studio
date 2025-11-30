import { MediaGalleryClient } from "@/components/media/MediaGalleryClient";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo.media" });

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `https://nnh.ae/${locale}/media`,
      languages: {
        en: "https://nnh.ae/en/media",
        ar: "https://nnh.ae/ar/media",
      },
    },
  };
}

export default async function MediaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: locations } = await supabase
    .from("gmb_locations")
    .select("id, location_name")
    .eq("user_id", user.id);

  const { data: media } = await supabase
    .from("gmb_media")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <MediaGalleryClient
      locations={locations || []}
      initialMedia={media || []}
    />
  );
}
