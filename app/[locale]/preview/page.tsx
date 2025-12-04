/**
 * 🎭 PREVIEW PAGE - Public Demo (No Auth Required)
 *
 * Purpose: Show potential customers the AI Command Center
 * with realistic demo data BEFORE they sign up.
 *
 * Features:
 * - No authentication required
 * - Curated demo data showcasing key features
 * - CTA to sign up and connect real business
 */

import type { Metadata } from "next";
import { CommandCenterChat } from "@/components/command-center/command-center-chat";
import { getPreviewModeData } from "@/lib/services/preview-mode-service";
import { PreviewModeBanner } from "@/components/command-center/preview-mode-banner";

export const metadata: Metadata = {
  title: "Live Demo - AI Command Center | NNH AI Studio",
  description:
    "Experience the power of AI-driven review management with our interactive demo. No signup required.",
};

export default function PreviewPage() {
  // Get curated demo data
  const previewData = getPreviewModeData();

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black">
      {/* Preview Mode Banner */}
      <PreviewModeBanner />

      {/* Ambient Background - Subtle */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 opacity-30">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      {/* Main Content - Full Height Chat */}
      <div className="relative pt-16">
        {" "}
        {/* pt-16 for banner space */}
        <CommandCenterChat
          userId="preview-user"
          locationId={undefined}
          businessName="Demo Restaurant"
          businessLogo={undefined}
          userName="Demo User"
          isPreviewMode={true}
          previewData={previewData}
        />
      </div>
    </div>
  );
}
