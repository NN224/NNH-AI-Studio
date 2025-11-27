import { z } from "zod";

/**
 * Onboarding task schema
 */
export const OnboardingTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
  description: z.string().optional(),
  impact: z.string().optional(),
  estimatedMinutes: z.number().int().min(0).optional(),
  actionLabel: z.string().optional(),
  actionUrl: z.string().optional(),
  aiSuggestion: z.string().optional(),
  locked: z.boolean().optional(),
});

/**
 * Onboarding data schema for complete onboarding
 * Note: The current implementation doesn't accept data,
 * but this schema is prepared for future enhancements
 */
export const OnboardingDataSchema = z.object({
  // User identification (will be set from authenticated user)
  user_id: z.string().uuid().optional(),

  // Business information
  business_name: z.string().min(1).max(255).optional(),
  business_type: z.string().max(100).optional(),
  industry: z.string().max(100).optional(),

  // Preferences
  preferred_language: z.enum(["en", "ar"]).default("en"),
  timezone: z.string().max(50).optional(),

  // Features to enable
  enable_auto_reply: z.boolean().default(false),
  enable_auto_answer: z.boolean().default(false),

  // Onboarding progress
  completed_steps: z.array(z.string()).default([]),
  onboarding_completed: z.boolean().default(true),

  // Metadata
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Type inference
 */
export type OnboardingTask = z.infer<typeof OnboardingTaskSchema>;
export type OnboardingData = z.infer<typeof OnboardingDataSchema>;
