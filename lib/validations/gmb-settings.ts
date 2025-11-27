import { z } from "zod";

/**
 * Sync schedule enum schema
 */
export const SyncScheduleSchema = z.enum([
  "manual",
  "hourly",
  "daily",
  "weekly",
  "realtime",
]);

/**
 * Update sync schedule input schema
 */
export const UpdateSyncScheduleInputSchema = z.object({
  accountId: z.string().uuid({
    message: "Invalid account ID format",
  }),
  enabled: z.boolean(),
  schedule: SyncScheduleSchema.default("hourly"),
});

/**
 * Get sync settings input schema
 */
export const GetSyncSettingsInputSchema = z.object({
  accountId: z.string().uuid({
    message: "Invalid account ID format",
  }),
});

/**
 * Type inference
 */
export type SyncSchedule = z.infer<typeof SyncScheduleSchema>;
export type UpdateSyncScheduleInput = z.infer<
  typeof UpdateSyncScheduleInputSchema
>;
export type GetSyncSettingsInput = z.infer<typeof GetSyncSettingsInputSchema>;
