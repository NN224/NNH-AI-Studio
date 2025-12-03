"use client";

/**
 * 🤖 AI HOME DASHBOARD - The New AI-First Experience
 *
 * Features:
 * - AI Daily Briefing
 * - Smart Chat Interface
 * - Quick Stats
 * - Suggested Actions
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AIBriefingCard } from "./ai-briefing-card";
import { AIChatBox } from "./ai-chat-box";
import { QuickStatsGrid } from "./quick-stats-grid";
import { SmartActionsBar } from "./smart-actions-bar";
import { BusinessHeader } from "./business-header";

interface AIHomeDashboardProps {
  user: {
    id: string;
    firstName: string;
    email: string;
    avatarUrl?: string;
  };
  business: {
    name: string;
    logoUrl?: string;
    locationId?: string;
  };
  stats: {
    rating: number;
    totalReviews: number;
    responseRate: number;
    thisWeekReviews: number;
    pendingReplies: number;
    pendingQuestions: number;
  };
  briefing: any;
  businessDNA: any;
  greeting: string;
}

export function AIHomeDashboard({
  user,
  business,
  stats,
  briefing,
  businessDNA,
  greeting,
}: AIHomeDashboardProps) {
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentBriefing, setCurrentBriefing] = useState(briefing);

  // Load briefing if not exists
  useEffect(() => {
    if (!currentBriefing) {
      fetch("/api/ai/assistant/briefing")
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.briefing) {
            setCurrentBriefing(data.briefing);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [currentBriefing]);

  // Build DNA if needed
  useEffect(() => {
    if (!businessDNA) {
      fetch("/api/ai/assistant/business-dna", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceRefresh: false }),
      }).catch(console.error);
    }
  }, [businessDNA]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header with Business Info */}
        <BusinessHeader
          greeting={greeting}
          firstName={user.firstName}
          businessName={business.name}
          businessLogo={business.logoUrl}
        />

        {/* Main Content Grid */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Briefing & Stats */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Briefing Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <AIBriefingCard
                briefing={currentBriefing}
                isLoading={isLoading}
                stats={stats}
                businessDNA={businessDNA}
              />
            </motion.div>

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <QuickStatsGrid stats={stats} />
            </motion.div>

            {/* Smart Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <SmartActionsBar
                pendingReplies={stats.pendingReplies}
                pendingQuestions={stats.pendingQuestions}
              />
            </motion.div>
          </div>

          {/* Right Column - AI Chat */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="sticky top-6"
            >
              <AIChatBox
                userId={user.id}
                locationId={business.locationId}
                businessName={business.name}
                isExpanded={isChatExpanded}
                onToggleExpand={() => setIsChatExpanded(!isChatExpanded)}
              />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
