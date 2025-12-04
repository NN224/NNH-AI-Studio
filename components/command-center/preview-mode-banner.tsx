"use client";

/**
 * 🎭 PREVIEW MODE BANNER
 *
 * Sticky banner shown at the top of the Command Center when in preview mode.
 * Informs users they're viewing demo data and provides CTA to connect GMB.
 */

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Info, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

export function PreviewModeBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-50 bg-gradient-to-r from-orange-500/20 to-purple-500/20 border-b border-orange-500/30 backdrop-blur-sm"
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Info Section */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-orange-400" />
              <Info className="h-4 w-4 text-orange-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-100">
                Preview Mode - Demo Data
              </p>
              <p className="text-xs text-zinc-300">
                Connect your Google Business Profile to unlock the full AI
                Command Center
              </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center gap-2">
            <Link href="/en/onboarding">
              <Button
                size="sm"
                className="bg-gradient-to-r from-orange-500 to-purple-500 hover:from-orange-600 hover:to-purple-600 text-white gap-2"
              >
                Connect Google Business
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                // Dismiss banner for this session
                sessionStorage.setItem("preview-banner-dismissed", "true");
                window.location.reload();
              }}
              className="text-zinc-300 hover:text-zinc-100"
            >
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
