/**
 * 🚀 ONBOARDING SERVICE
 *
 * Manages user onboarding progress and feature discovery.
 *
 * Progressive Onboarding Stages:
 * 1. Preview Mode - Experience with demo data
 * 2. GMB Connection - Connect account
 * 3. Initial Sync - Business DNA building (500+ reviews)
 * 4. Feature Discovery - Contextual tips and tours
 */

import { createAdminClient } from "@/lib/supabase/server";

// ============================================
// TYPES
// ============================================

export type OnboardingStage = 1 | 2 | 3 | 4 | 5;

export interface OnboardingState {
  stage: OnboardingStage;
  completedSteps: string[];
  dismissedTips: string[];
  lastActivity: Date;
  completedAt?: Date;
}

export interface FeatureTip {
  id: string;
  feature:
    | "business-dna"
    | "pattern-detection"
    | "auto-pilot"
    | "batch-approval"
    | "confidence-scores"
    | "keyboard-shortcuts";
  trigger: "first-visit" | "milestone" | "contextual";
  title: string;
  message: string;
  ctaLabel?: string;
  ctaAction?: string;
}

// ============================================
// ONBOARDING STAGES
// ============================================

export const ONBOARDING_STAGES = {
  1: {
    name: "Preview Mode",
    description: "Experience the AI Command Center with demo data",
    estimatedTime: "2 minutes",
  },
  2: {
    name: "Connect GMB",
    description: "Link your Google Business Profile",
    estimatedTime: "3 minutes",
  },
  3: {
    name: "Initial Sync",
    description: "Building your Business DNA from reviews",
    estimatedTime: "5-10 minutes",
  },
  4: {
    name: "Feature Discovery",
    description: "Learn key features through contextual tips",
    estimatedTime: "Ongoing",
  },
  5: {
    name: "Fully Onboarded",
    description: "All setup complete!",
    estimatedTime: "Complete",
  },
} as const;

// ============================================
// ONBOARDING STEPS
// ============================================

export const ONBOARDING_STEPS = {
  // Stage 1: Preview Mode
  viewed_preview: "Viewed preview mode",
  interacted_with_demo: "Interacted with demo data",

  // Stage 2: GMB Connection
  started_gmb_connection: "Started GMB connection",
  completed_gmb_connection: "Completed GMB connection",

  // Stage 3: Initial Sync
  first_reviews_synced: "First reviews synced",
  business_dna_initiated: "Business DNA analysis started",
  business_dna_completed: "Business DNA completed (500+ reviews)",

  // Stage 4: Feature Discovery
  approved_first_reply: "Approved first review reply",
  used_batch_approval: "Used batch approval",
  viewed_pattern_detection: "Viewed pattern detection",
  customized_settings: "Customized AI settings",

  // Stage 5: Fully Onboarded
  completed_onboarding: "Completed full onboarding",
} as const;

// ============================================
// FEATURE TIPS
// ============================================

export const FEATURE_TIPS: Record<string, FeatureTip> = {
  business_dna_intro: {
    id: "business_dna_intro",
    feature: "business-dna",
    trigger: "milestone",
    title: "🧬 Your Business DNA is Building!",
    message:
      "I'm analyzing your reviews to learn your unique voice, strengths, and what makes your business special. The more reviews I analyze, the better my responses become!",
    ctaLabel: "View Progress",
    ctaAction: "view_business_dna",
  },

  business_dna_complete: {
    id: "business_dna_complete",
    feature: "business-dna",
    trigger: "milestone",
    title: "🎉 Business DNA Complete!",
    message:
      "I've analyzed 500+ reviews and learned your business voice! I now understand your strengths, common topics, and how to respond authentically as your business.",
    ctaLabel: "See What I Learned",
    ctaAction: "view_business_dna",
  },

  pattern_detection_first: {
    id: "pattern_detection_first",
    feature: "pattern-detection",
    trigger: "contextual",
    title: "🔍 Pattern Detected!",
    message:
      "I can detect patterns in your reviews - like recurring complaints, peak service times, or trending topics. This helps you spot issues early and capitalize on strengths.",
    ctaLabel: "View Patterns",
    ctaAction: "view_patterns",
  },

  auto_pilot_suggestion: {
    id: "auto_pilot_suggestion",
    feature: "auto-pilot",
    trigger: "milestone",
    title: "⚡ Ready for Auto-Pilot?",
    message:
      "You've manually approved 5 high-confidence replies. Want to enable Auto-Pilot? I'll automatically publish replies I'm 90%+ confident about, and only ask for your review on tricky ones.",
    ctaLabel: "Enable Auto-Pilot",
    ctaAction: "enable_auto_pilot",
  },

  batch_approval_tip: {
    id: "batch_approval_tip",
    feature: "batch-approval",
    trigger: "contextual",
    title: "💡 Pro Tip: Batch Approval",
    message:
      'Try clicking "Approve All" to publish multiple high-confidence replies at once. I only show you the ones that need your personal attention!',
    ctaLabel: "Got it",
    ctaAction: "dismiss",
  },

  confidence_scores_explain: {
    id: "confidence_scores_explain",
    feature: "confidence-scores",
    trigger: "first-visit",
    title: "📊 Understanding Confidence Scores",
    message:
      "Each reply shows my confidence level. 85%+ means I'm very sure it matches your voice. Below 80% means it might need your review. You can adjust these thresholds in settings.",
    ctaLabel: "Adjust Settings",
    ctaAction: "open_settings",
  },

  keyboard_shortcuts: {
    id: "keyboard_shortcuts",
    feature: "keyboard-shortcuts",
    trigger: "contextual",
    title: "⌨️ Keyboard Shortcuts",
    message:
      "Speed tip: Use 'A' to approve, 'R' to reject, 'E' to edit, and arrow keys to navigate between reviews. You'll fly through approvals!",
    ctaLabel: "Got it",
    ctaAction: "dismiss",
  },
};

// ============================================
// SERVICE FUNCTIONS
// ============================================

/**
 * Get user's current onboarding state
 */
export async function getOnboardingState(
  userId: string,
): Promise<OnboardingState | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "onboarding_stage, completed_onboarding_steps, dismissed_feature_tips, onboarding_completed_at, updated_at",
    )
    .eq("id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    stage: (data.onboarding_stage as OnboardingStage) || 1,
    completedSteps: data.completed_onboarding_steps || [],
    dismissedTips: data.dismissed_feature_tips || [],
    lastActivity: new Date(data.updated_at),
    completedAt: data.onboarding_completed_at
      ? new Date(data.onboarding_completed_at)
      : undefined,
  };
}

/**
 * Update onboarding progress
 */
export async function updateOnboardingProgress(
  userId: string,
  step: keyof typeof ONBOARDING_STEPS,
): Promise<{ success: boolean; newStage?: OnboardingStage }> {
  const supabase = createAdminClient();

  // Get current state
  const currentState = await getOnboardingState(userId);
  if (!currentState) {
    return { success: false };
  }

  // Add step if not already completed
  const completedSteps = currentState.completedSteps.includes(step)
    ? currentState.completedSteps
    : [...currentState.completedSteps, step];

  // Determine new stage based on completed steps
  const newStage = determineStage(completedSteps);

  // Update database
  const { error } = await supabase
    .from("profiles")
    .update({
      onboarding_stage: newStage,
      completed_onboarding_steps: completedSteps,
      onboarding_completed_at:
        newStage === 5 && !currentState.completedAt
          ? new Date().toISOString()
          : currentState.completedAt,
    })
    .eq("id", userId);

  if (error) {
    console.error("Error updating onboarding progress:", error);
    return { success: false };
  }

  return { success: true, newStage };
}

/**
 * Dismiss a feature tip
 */
export async function dismissFeatureTip(
  userId: string,
  tipId: string,
): Promise<{ success: boolean }> {
  const supabase = createAdminClient();

  const currentState = await getOnboardingState(userId);
  if (!currentState) {
    return { success: false };
  }

  const dismissedTips = currentState.dismissedTips.includes(tipId)
    ? currentState.dismissedTips
    : [...currentState.dismissedTips, tipId];

  const { error } = await supabase
    .from("profiles")
    .update({ dismissed_feature_tips: dismissedTips })
    .eq("id", userId);

  return { success: !error };
}

/**
 * Get relevant feature tips for user
 */
export async function getRelevantFeatureTips(
  userId: string,
  context?: {
    firstVisit?: boolean;
    approvalCount?: number;
    hasPatternsDetected?: boolean;
  },
): Promise<FeatureTip[]> {
  const state = await getOnboardingState(userId);
  if (!state) return [];

  const tips: FeatureTip[] = [];

  // Don't show tips that were already dismissed
  const availableTips = Object.values(FEATURE_TIPS).filter(
    (tip) => !state.dismissedTips.includes(tip.id),
  );

  // Stage 3: Business DNA tips
  if (state.stage === 3) {
    if (!state.completedSteps.includes("business_dna_completed")) {
      tips.push(FEATURE_TIPS.business_dna_intro);
    }
  }

  // Stage 4+: Feature discovery tips
  if (state.stage >= 4) {
    // First visit tip
    if (context?.firstVisit) {
      tips.push(FEATURE_TIPS.confidence_scores_explain);
    }

    // After 5 approvals, suggest auto-pilot
    if (
      context?.approvalCount &&
      context.approvalCount >= 5 &&
      !state.completedSteps.includes("used_batch_approval")
    ) {
      tips.push(FEATURE_TIPS.auto_pilot_suggestion);
    }

    // If patterns detected, show pattern tip
    if (context?.hasPatternsDetected) {
      tips.push(FEATURE_TIPS.pattern_detection_first);
    }

    // Show keyboard shortcuts tip randomly (20% chance)
    if (Math.random() < 0.2) {
      tips.push(FEATURE_TIPS.keyboard_shortcuts);
    }
  }

  // Filter out dismissed tips
  return tips.filter((tip) =>
    availableTips.some((available) => available.id === tip.id),
  );
}

/**
 * Check if onboarding is complete
 */
export async function isOnboardingComplete(userId: string): Promise<boolean> {
  const state = await getOnboardingState(userId);
  return state?.stage === 5 || false;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Determine stage based on completed steps
 */
function determineStage(completedSteps: string[]): OnboardingStage {
  // Stage 5: Fully onboarded
  if (completedSteps.includes("completed_onboarding")) {
    return 5;
  }

  // Stage 4: Feature discovery (GMB connected + some activity)
  if (
    completedSteps.includes("completed_gmb_connection") &&
    completedSteps.includes("approved_first_reply")
  ) {
    return 4;
  }

  // Stage 3: Initial sync (GMB connected, syncing reviews)
  if (completedSteps.includes("completed_gmb_connection")) {
    return 3;
  }

  // Stage 2: GMB connection in progress or needed
  if (completedSteps.includes("viewed_preview")) {
    return 2;
  }

  // Stage 1: Preview mode (default)
  return 1;
}
