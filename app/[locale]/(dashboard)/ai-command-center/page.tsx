/**
 * 🎛️ AI COMMAND CENTER PAGE
 *
 * Chat-First AI Experience
 * الواجهة الرئيسية للتحكم بكل شي
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CommandCenterChat } from "@/components/command-center/command-center-chat";

export const metadata: Metadata = {
  title: "AI Command Center | NNH AI Studio",
  description: "Your AI-powered business command center",
};

export default async function CommandCenterPage({
  params,
}: {
  params: { locale: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  const locale =
    typeof params.locale === "string" ? params.locale : (await params).locale;

  if (error || !user) {
    redirect(`/${locale}/auth/login`);
  }

  const userId = user.id;

  // Check if user has locations
  const { count: locationsCount } = await supabase
    .from("gmb_locations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_active", true);

  if (!locationsCount || locationsCount === 0) {
    const { data: profileCheck } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", userId)
      .maybeSingle();

    if (!profileCheck?.onboarding_completed) {
      redirect(`/${locale}/onboarding`);
    }
  }

  // Fetch user profile and primary location
  const [{ data: profile }, { data: primaryLocation }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email, avatar_url")
      .eq("id", userId)
      .maybeSingle(),

    supabase
      .from("gmb_locations")
      .select("id, location_name, logo_url")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const userName = profile?.full_name?.split(" ")[0] || "there";
  const businessName = primaryLocation?.location_name || "Your Business";
  const businessLogo = primaryLocation?.logo_url;
  const locationId = primaryLocation?.id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-orange-500/3 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        <CommandCenterChat
          userId={userId}
          locationId={locationId}
          businessName={businessName}
          businessLogo={businessLogo}
          userName={userName}
        />
      </div>
    </div>
  );
}
