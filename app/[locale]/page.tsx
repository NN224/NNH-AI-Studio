import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * Root Page - Redirects based on authentication status
 *
 * This ensures proper code splitting:
 * - Authenticated users → /home (app bundle)
 * - Unauthenticated users → /(marketing) (marketing bundle)
 *
 * The actual landing page is in app/[locale]/(marketing)/page.tsx
 */
export default async function LocaleRootPage({
  params,
}: {
  params: { locale: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const locale = params.locale || "en";

  if (user) {
    // Authenticated - redirect to app
    redirect(`/${locale}/home`);
  } else {
    // Not authenticated - show marketing landing page
    redirect(`/${locale}/(marketing)`);
  }
}
