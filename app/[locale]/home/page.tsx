/**
 * 🏠 NEW HOME PAGE - AI-First Design
 *
 * Clean, focused, AI-powered dashboard
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AIHomeDashboard } from "@/components/home/ai-home-dashboard";
import { buildBusinessDNA } from "@/lib/services/business-dna-service";

export const metadata: Metadata = {
  title: "Home | NNH - AI Studio",
  description: "Your AI-powered business management dashboard",
};

export default async function HomePage({
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

  // Check if user has locations (onboarding check)
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

  // Fetch essential data in parallel
  const [
    { data: profile },
    { data: primaryLocation },
    { data: todayBriefing },
    { count: reviewsCount },
    { count: pendingQuestionsCount },
  ] = await Promise.all([
    // User profile
    supabase
      .from("profiles")
      .select("full_name, email, avatar_url")
      .eq("id", userId)
      .maybeSingle(),

    // Primary location
    supabase
      .from("gmb_locations")
      .select("id, location_name, logo_url, rating, review_count")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),

    // Today's briefing (if exists)
    supabase
      .from("ai_daily_briefings")
      .select("*")
      .eq("user_id", userId)
      .eq("briefing_date", new Date().toISOString().split("T")[0])
      .maybeSingle(),

    // Reviews count
    supabase
      .from("gmb_reviews")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),

    // Pending questions
    supabase
      .from("gmb_questions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("answer_status", "pending"),
  ]);

  // Get or build Business DNA (async, don't block render)
  const { data: businessDNA } = await supabase
    .from("business_dna")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  // Get recent reviews for quick stats
  const { data: recentReviews } = await supabase
    .from("gmb_reviews")
    .select("rating, review_date, has_reply")
    .eq("user_id", userId)
    .order("review_date", { ascending: false })
    .limit(100);

  // Calculate stats
  const avgRating =
    recentReviews && recentReviews.length > 0
      ? (
          recentReviews.reduce((sum, r) => sum + (r.rating || 0), 0) /
          recentReviews.length
        ).toFixed(1)
      : "0.0";

  const responseRate =
    recentReviews && recentReviews.length > 0
      ? Math.round(
          (recentReviews.filter((r) => r.has_reply).length /
            recentReviews.length) *
            100,
        )
      : 0;

  // Reviews this week
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thisWeekReviews =
    recentReviews?.filter((r) => new Date(r.review_date) > weekAgo).length || 0;

  // Pending replies
  const pendingReplies = recentReviews?.filter((r) => !r.has_reply).length || 0;

  // User's first name for greeting
  const firstName = profile?.full_name?.split(" ")[0] || "there";

  // Time-based greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <AIHomeDashboard
      user={{
        id: userId,
        firstName,
        email: user.email || "",
        avatarUrl: profile?.avatar_url,
      }}
      business={{
        name: primaryLocation?.location_name || "Your Business",
        logoUrl: primaryLocation?.logo_url,
        locationId: primaryLocation?.id,
      }}
      stats={{
        rating: parseFloat(avgRating),
        totalReviews: reviewsCount || 0,
        responseRate,
        thisWeekReviews,
        pendingReplies,
        pendingQuestions: pendingQuestionsCount || 0,
      }}
      briefing={todayBriefing}
      businessDNA={businessDNA}
      greeting={greeting}
    />
  );
}
