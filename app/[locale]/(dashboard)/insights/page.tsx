/**
 * 📊 INSIGHTS PAGE
 *
 * Dedicated page for viewing AI proactive insights history.
 * Surfaces data from ai_proactive_insights table.
 */

import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { InsightsDashboard } from "@/components/insights/insights-dashboard";

export const metadata: Metadata = {
  title: "AI Insights | NNH AI Studio",
  description: "View AI-generated proactive insights and pattern detections",
};

export default async function InsightsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">AI Insights</h1>
        <p className="text-zinc-400">
          Proactive insights and pattern detections from your business data
        </p>
      </div>

      {/* Dashboard */}
      <InsightsDashboard />
    </div>
  );
}
