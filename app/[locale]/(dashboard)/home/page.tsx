/**
 * 🏠 HOME PAGE - Chat-First AI Command Center
 *
 * الواجهة الرئيسية للتحكم بكل شي
 * Chat-First Experience
 *
 * Note: Auth and location checks are handled by (dashboard)/layout.tsx
 */

import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { CommandCenterChat } from "@/components/command-center/command-center-chat";

export const metadata: Metadata = {
  title: "AI Command Center | NNH AI Studio",
  description:
    "Your AI-powered business command center - Chat with your 10-year veteran AI assistant",
};

export default async function HomePage() {
  const supabase = await createClient();

  // Get user (already authenticated by layout)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null; // Should never happen (layout handles this)

  const userId = user.id;

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
    <div className="relative -mx-4 -my-6 lg:-mx-6 lg:-my-8">
      {/* Ambient Background - Subtle */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 opacity-30">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      {/* Main Content - Full Height Chat */}
      <div className="relative">
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
