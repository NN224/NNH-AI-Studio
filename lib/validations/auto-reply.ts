import { z } from "zod";

/**
 * Auto-reply tone enum schema
 */
export const AutoReplyToneSchema = z.enum([
  "professional",
  "friendly",
  "apologetic",
  "marketing",
]);

/**
 * Auto-reply settings schema for validation
 */
export const AutoReplySettingsSchema = z
  .object({
    // Core settings
    enabled: z.boolean(),
    requireApproval: z.boolean().default(false),

    // Legacy fields (kept for backwards compatibility)
    minRating: z.number().int().min(1).max(5).default(4),
    replyToPositive: z.boolean().default(true),
    replyToNeutral: z.boolean().default(false),
    replyToNegative: z.boolean().default(false),

    // Per-rating controls (new system)
    autoReply1Star: z.boolean().optional(),
    autoReply2Star: z.boolean().optional(),
    autoReply3Star: z.boolean().optional(),
    autoReply4Star: z.boolean().optional(),
    autoReply5Star: z.boolean().optional(),

    // AI settings
    tone: AutoReplyToneSchema.default("professional"),

    // Location targeting
    locationId: z.string().uuid().optional().nullable(),
  })
  .strict();

/**
 * Input schema for saveAutoReplySettings (accepts unknown fields from frontend)
 */
export const SaveAutoReplySettingsInputSchema = z.object({
  enabled: z.boolean(),
  minRating: z.number().int().min(1).max(5).default(4),
  replyToPositive: z.boolean().default(true),
  replyToNeutral: z.boolean().default(false),
  replyToNegative: z.boolean().default(false),
  requireApproval: z.boolean().default(false),
  tone: AutoReplyToneSchema.default("friendly"),
  locationId: z.string().uuid().optional().nullable(),
  // New per-rating controls
  autoReply1Star: z.boolean().optional(),
  autoReply2Star: z.boolean().optional(),
  autoReply3Star: z.boolean().optional(),
  autoReply4Star: z.boolean().optional(),
  autoReply5Star: z.boolean().optional(),
});

/**
 * Type inference
 */
export type AutoReplyTone = z.infer<typeof AutoReplyToneSchema>;
export type AutoReplySettings = z.infer<typeof AutoReplySettingsSchema>;
export type SaveAutoReplySettingsInput = z.infer<
  typeof SaveAutoReplySettingsInputSchema
>;
