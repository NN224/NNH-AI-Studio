import LandingPage from "./landing";
import { landingMetadata } from "@/components/seo/landing-seo";
import type { Metadata } from "next";

export const metadata: Metadata = landingMetadata;

export default function LocaleRootPage() {
  // Show professional landing page
  return <LandingPage />;
}
