/**
 * 🎭 PREVIEW MODE SERVICE
 *
 * Provides curated demo data for users to experience the AI Command Center
 * before connecting their Google Business Profile account.
 *
 * Purpose:
 * - Showcase key features with realistic data
 * - Reduce onboarding friction
 * - Demonstrate value immediately
 */

import type { SafeCommandCenterStats } from "@/lib/utils/data-guards";
import type { PendingAction } from "./pending-actions-service";

// ============================================
// TYPES
// ============================================

export interface PreviewModeData {
  proactiveGreeting: {
    greeting: string;
    insight?: {
      title: string;
      message: string;
      priority: "high" | "medium" | "low";
    };
  };
  pendingApprovals: PendingAction[];
  stats: SafeCommandCenterStats;
  autopilotStatus: {
    enabled: boolean;
    actionsToday: number;
  };
}

// ============================================
// DEMO DATA
// ============================================

/**
 * Get curated preview mode data showcasing key features
 */
export function getPreviewModeData(): PreviewModeData {
  return {
    proactiveGreeting: {
      greeting:
        "👋 Welcome! This is a preview of your AI Command Center. I've prepared 3 review replies for you to approve.",
      insight: {
        title: "Pattern Detected: Excellent Service",
        message:
          "I analyzed 500+ reviews and found customers love your friendly staff and quick service. This is your strongest advantage!",
        priority: "medium",
      },
    },

    pendingApprovals: [
      // Positive 5-star review
      {
        id: "preview-1",
        userId: "preview-user",
        actionType: "review_reply",
        referenceId: "preview-review-1",
        referenceData: {
          reviewerName: "Sarah Johnson",
          rating: 5,
          reviewText:
            "Amazing experience! The staff was incredibly friendly and the service was fast. Will definitely come back!",
        },
        aiGeneratedContent:
          "Thank you so much for your wonderful review, Sarah! We're thrilled to hear you enjoyed our friendly service. Our team works hard to make every visit special, and your feedback means the world to us. We can't wait to welcome you back soon! 🌟",
        aiConfidence: 92,
        aiReasoning:
          "High confidence - positive review with specific praise. Response acknowledges their compliments and invites return visit.",
        status: "pending",
        requiresAttention: false,
        createdAt: new Date(),
      },

      // Neutral 3-star review
      {
        id: "preview-2",
        userId: "preview-user",
        actionType: "review_reply",
        referenceId: "preview-review-2",
        referenceData: {
          reviewerName: "Michael Chen",
          rating: 3,
          reviewText:
            "Food was good but the wait time was longer than expected. Service could be faster.",
        },
        aiGeneratedContent:
          "Thank you for your feedback, Michael. We're glad you enjoyed the food! We sincerely apologize for the wait time - we're actively working on improving our service speed during peak hours. Your patience and feedback help us get better. We'd love the opportunity to provide you with a faster experience next time!",
        aiConfidence: 85,
        aiReasoning:
          "Medium-high confidence - neutral review with constructive feedback. Response acknowledges issue and shows commitment to improvement.",
        status: "pending",
        requiresAttention: false,
        createdAt: new Date(Date.now() - 3600000), // 1 hour ago
      },

      // Negative 2-star review (requires attention)
      {
        id: "preview-3",
        userId: "preview-user",
        actionType: "review_reply",
        referenceId: "preview-review-3",
        referenceData: {
          reviewerName: "David Martinez",
          rating: 2,
          reviewText:
            "Very disappointed. Order was wrong and staff seemed uninterested in fixing it. Not what I expected.",
        },
        aiGeneratedContent:
          "David, we're truly sorry to hear about your disappointing experience. This falls short of our standards, and we take full responsibility. We'd like to make this right - please contact us directly at [your-email] or [phone] so we can resolve this properly. Your feedback is invaluable in helping us improve. Thank you for giving us the chance to do better.",
        aiConfidence: 78,
        aiReasoning:
          "Lower confidence - negative review requires careful, empathetic response with direct action offer.",
        status: "pending",
        requiresAttention: true,
        attentionReason:
          "Negative review (2 stars) with service complaint - requires personal attention",
        createdAt: new Date(Date.now() - 7200000), // 2 hours ago
      },
    ],

    stats: {
      rating: 4.6,
      ratingChange: 0.3, // Improved by 0.3 stars
      totalReviews: 523,
      pendingCount: 3,
      responseRate: 94,
      attentionCount: 1,
    },

    autopilotStatus: {
      enabled: false,
      actionsToday: 0,
    },
  };
}

/**
 * Check if user is in preview mode
 */
export function isPreviewMode(searchParams?: URLSearchParams): boolean {
  if (!searchParams) return false;
  return (
    searchParams.get("preview") === "true" ||
    searchParams.get("demo") === "true"
  );
}

/**
 * Get preview mode benefits for marketing
 */
export function getPreviewModeBenefits() {
  return {
    timesSaved: "90%",
    averageResponseTime: "2 minutes",
    reviewsAnalyzed: "500+",
    confidenceScore: "92%",
    features: [
      {
        icon: "🤖",
        title: "AI-Generated Replies",
        description: "Smart responses that match your business voice",
      },
      {
        icon: "🧠",
        title: "Business DNA Learning",
        description: "Learns from 500+ reviews to understand your strengths",
      },
      {
        icon: "🔍",
        title: "Pattern Detection",
        description: "Identifies trends and issues before they become problems",
      },
      {
        icon: "⚡",
        title: "One-Click Approval",
        description: "Review and publish multiple replies in seconds",
      },
      {
        icon: "🎯",
        title: "Smart Prioritization",
        description: "Flags reviews that need your personal attention",
      },
      {
        icon: "📈",
        title: "Time Savings",
        description: "Reduce review management from 60 min to 2-5 min daily",
      },
    ],
  };
}

/**
 * Get preview mode call-to-action messaging
 */
export function getPreviewModeCTA() {
  return {
    primary: "Connect Your Google Business Profile",
    secondary: "Continue Exploring Preview",
    bannerMessage:
      "You're viewing a preview with sample data. Connect your Google Business Profile to unlock the full AI Command Center for your business.",
  };
}
