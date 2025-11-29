import { landingMetadata } from "@/components/seo/landing-seo";
import type { Metadata } from "next";

export const metadata: Metadata = landingMetadata;

/**
 * Marketing Layout
 *
 * This layout wraps the marketing pages (landing page, pricing, etc.)
 * Ensures proper code splitting - marketing bundle is separate from app bundle.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
