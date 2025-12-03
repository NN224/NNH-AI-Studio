/**
 * Onboarding Page
 *
 * This page is shown to new users who haven't connected any accounts yet.
 * They must connect at least GMB or YouTube, or choose Demo Mode.
 */

import { OnboardingScreen } from "@/components/onboarding/onboarding-screen";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Get Started | NNH - AI Studio",
  description: "Connect your business accounts to get started",
};

export default async function OnboardingPage({
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

  // Check if user already has locations imported (completed full flow)
  const [{ count: locationsCount }, { data: youtubeToken }, { data: profile }] =
    await Promise.all([
      supabase
        .from("gmb_locations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_active", true),
      supabase
        .from("oauth_tokens")
        .select("id")
        .eq("user_id", userId)
        .eq("provider", "youtube")
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("full_name, onboarding_completed")
        .eq("id", userId)
        .maybeSingle(),
    ]);

  const hasLocations = (locationsCount || 0) > 0;
  const hasYouTube = !!youtubeToken;

  // If user already has locations or completed onboarding, redirect to home
  if (hasLocations || hasYouTube || profile?.onboarding_completed) {
    redirect(`/${locale}/home`);
  }

  return <OnboardingScreen userName={profile?.full_name || undefined} />;
}
