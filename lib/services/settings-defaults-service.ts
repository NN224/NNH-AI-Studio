/**
 * ⚙️ SETTINGS DEFAULTS SERVICE
 *
 * Provides smart default settings based on Business DNA and user profile.
 * Reduces cognitive load by pre-configuring optimal settings.
 *
 * Purpose:
 * - Generate intelligent defaults for new users
 * - Adapt settings based on business type and DNA
 * - Simplify onboarding experience
 */

import { createAdminClient } from "@/lib/supabase/server";

// ============================================
// TYPES
// ============================================

export type SettingsTier = "essential" | "common" | "advanced";

export interface SmartDefaults {
  // Essential (Always visible)
  autoReplyEnabled: boolean;
  responseTone:
    | "professional"
    | "friendly"
    | "casual"
    | "formal"
    | "empathetic";
  responseLength: "short" | "medium" | "long";

  // Common (Collapsed by default)
  creativityLevel: "conservative" | "balanced" | "creative";
  language: string;
  includeEmojis: boolean;
  personalizationLevel: "minimal" | "moderate" | "high";
  useBusinessDNA: boolean;

  // Advanced (Hidden by default)
  aiProvider: "openai" | "anthropic" | "google";
  model: string;
  temperature: number;
  maxTokens: number;
  minConfidenceScore: number;
}

export interface SettingsRecommendation {
  defaults: SmartDefaults;
  reasoning: string;
  confidence: number;
  businessDNAScore?: number;
}

// ============================================
// PRESET PROFILES
// ============================================

/**
 * Predefined profiles for different business types
 */
const PRESET_PROFILES = {
  restaurant: {
    responseTone: "friendly" as const,
    responseLength: "medium" as const,
    creativityLevel: "balanced" as const,
    includeEmojis: true,
    personalizationLevel: "high" as const,
    reasoning:
      "Restaurants benefit from friendly, personalized responses with emojis",
  },

  professional_services: {
    responseTone: "professional" as const,
    responseLength: "medium" as const,
    creativityLevel: "conservative" as const,
    includeEmojis: false,
    personalizationLevel: "moderate" as const,
    reasoning: "Professional services require formal, consistent communication",
  },

  retail: {
    responseTone: "friendly" as const,
    responseLength: "short" as const,
    creativityLevel: "balanced" as const,
    includeEmojis: true,
    personalizationLevel: "moderate" as const,
    reasoning: "Retail businesses benefit from quick, friendly responses",
  },

  healthcare: {
    responseTone: "empathetic" as const,
    responseLength: "medium" as const,
    creativityLevel: "conservative" as const,
    includeEmojis: false,
    personalizationLevel: "high" as const,
    reasoning: "Healthcare requires empathetic, careful communication",
  },

  default: {
    responseTone: "professional" as const,
    responseLength: "medium" as const,
    creativityLevel: "balanced" as const,
    includeEmojis: false,
    personalizationLevel: "moderate" as const,
    reasoning: "Balanced settings suitable for most businesses",
  },
};

// ============================================
// SERVICE FUNCTIONS
// ============================================

/**
 * Get smart default settings for a user
 * Based on Business DNA, business type, and user profile
 */
export async function getSmartDefaults(
  userId: string,
): Promise<SettingsRecommendation> {
  const supabase = createAdminClient();

  // Fetch user's Business DNA
  const { data: businessDNA } = await supabase
    .from("business_dna")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch user's primary location (for business type)
  const { data: location } = await supabase
    .from("gmb_locations")
    .select("location_name, primary_category, total_review_count")
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  // Determine business type from category
  const businessType = inferBusinessType(location?.primary_category);
  const preset = PRESET_PROFILES[businessType] || PRESET_PROFILES.default;

  // Calculate confidence based on available data
  const confidence = calculateConfidence(businessDNA, location);

  // Build smart defaults
  const defaults: SmartDefaults = {
    // Essential
    autoReplyEnabled: false, // Start disabled for safety
    responseTone: preset.responseTone,
    responseLength: preset.responseLength,

    // Common
    creativityLevel: preset.creativityLevel,
    language: "en", // TODO: Detect from location
    includeEmojis: preset.includeEmojis,
    personalizationLevel: preset.personalizationLevel,
    useBusinessDNA: businessDNA ? true : false,

    // Advanced
    aiProvider: "openai",
    model: "gpt-4",
    temperature:
      preset.creativityLevel === "creative"
        ? 0.8
        : preset.creativityLevel === "conservative"
          ? 0.5
          : 0.7,
    maxTokens:
      preset.responseLength === "short"
        ? 150
        : preset.responseLength === "long"
          ? 300
          : 200,
    minConfidenceScore: 85,
  };

  return {
    defaults,
    reasoning: preset.reasoning,
    confidence,
    businessDNAScore: businessDNA?.confidence_score,
  };
}

/**
 * Infer business type from GMB category
 */
function inferBusinessType(category?: string): keyof typeof PRESET_PROFILES {
  if (!category) return "default";

  const lowerCategory = category.toLowerCase();

  if (
    lowerCategory.includes("restaurant") ||
    lowerCategory.includes("food") ||
    lowerCategory.includes("cafe") ||
    lowerCategory.includes("bar")
  ) {
    return "restaurant";
  }

  if (
    lowerCategory.includes("law") ||
    lowerCategory.includes("accounting") ||
    lowerCategory.includes("consulting") ||
    lowerCategory.includes("finance")
  ) {
    return "professional_services";
  }

  if (
    lowerCategory.includes("store") ||
    lowerCategory.includes("shop") ||
    lowerCategory.includes("retail")
  ) {
    return "retail";
  }

  if (
    lowerCategory.includes("doctor") ||
    lowerCategory.includes("dentist") ||
    lowerCategory.includes("clinic") ||
    lowerCategory.includes("hospital") ||
    lowerCategory.includes("medical")
  ) {
    return "healthcare";
  }

  return "default";
}

/**
 * Calculate confidence score based on available data
 */
function calculateConfidence(businessDNA: any, location: any): number {
  let confidence = 0;

  // Base confidence
  confidence += 40;

  // Business DNA boosts confidence
  if (businessDNA) {
    confidence += 30;
    if (businessDNA.confidence_score >= 80) {
      confidence += 10;
    }
  }

  // Location data boosts confidence
  if (location) {
    confidence += 10;
    if (location.total_review_count >= 50) {
      confidence += 10;
    }
  }

  return Math.min(confidence, 95); // Cap at 95
}

/**
 * Get setting tier (essential, common, advanced)
 */
export function getSettingTier(settingKey: string): SettingsTier {
  const ESSENTIAL_SETTINGS = [
    "autoReplyEnabled",
    "responseTone",
    "responseLength",
    "businessDNAScore",
  ];

  const COMMON_SETTINGS = [
    "creativityLevel",
    "language",
    "includeEmojis",
    "personalizationLevel",
    "useBusinessDNA",
    "minConfidenceScore",
    "priorityRules",
    "patternAlerts",
  ];

  if (ESSENTIAL_SETTINGS.includes(settingKey)) {
    return "essential";
  }

  if (COMMON_SETTINGS.includes(settingKey)) {
    return "common";
  }

  return "advanced";
}

/**
 * Check if user has customized their settings
 */
export async function hasCustomSettings(userId: string): Promise<boolean> {
  const supabase = createAdminClient();

  const { data: autoReplySettings } = await supabase
    .from("auto_reply_settings")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  return !!autoReplySettings;
}
