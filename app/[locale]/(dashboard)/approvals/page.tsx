/**
 * 📋 APPROVALS PAGE
 *
 * Dedicated page for managing all pending AI actions.
 * Surfaces data from pending_ai_actions table.
 */

import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ApprovalsDashboard } from "@/components/approvals/approvals-dashboard";

export const metadata: Metadata = {
  title: "Approvals | NNH AI Studio",
  description: "Review and approve AI-generated content",
};

export default async function ApprovalsPage() {
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
        <h1 className="text-3xl font-bold text-white mb-2">
          Pending Approvals
        </h1>
        <p className="text-zinc-400">
          Review and approve AI-generated content before it goes live
        </p>
      </div>

      {/* Dashboard */}
      <ApprovalsDashboard />
    </div>
  );
}
