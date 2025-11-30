"use server";

/**
 * Settings Server Actions
 *
 * Handles all user settings mutations. Replaces the API routes at:
 * - PUT /api/settings
 * - GET /api/settings (for data fetching in Server Components)
 */

import { logAction } from "@/lib/monitoring/audit";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ============================================================================
// Validation Schemas
// ============================================================================

const settingsSchema = z.object({
  // General Settings
  businessName: z.string().optional().nullable(),
  primaryCategory: z.string().optional().nullable(),
  businessDescription: z.string().optional().nullable(),
  defaultReplyTemplate: z.string().optional().nullable(),
  timezone: z.string().optional().nullable(),
  language: z.string().optional().nullable(),
  syncSchedule: z
    .enum(["manual", "hourly", "daily", "twice-daily", "weekly"])
    .optional(),
  autoPublish: z.boolean().optional(),

  // AI & Automation Settings
  autoReply: z.boolean().optional(),
  aiResponseTone: z
    .enum(["professional", "friendly", "casual", "formal", "empathetic"])
    .optional(),
  responseLength: z.enum(["brief", "medium", "detailed"]).optional(),
  creativityLevel: z.enum(["low", "medium", "high"]).optional(),

  // Notifications Settings
  reviewNotifications: z.boolean().optional(),
  emailDigest: z
    .enum(["realtime", "daily", "weekly", "monthly", "never"])
    .optional(),
  emailDeliveryTime: z.string().optional().nullable(),
  negativePriority: z.boolean().optional(),
  replyReminders: z.boolean().optional(),
  browserNotifications: z.boolean().optional(),
  soundAlerts: z.boolean().optional(),
  quietHours: z.boolean().optional(),
  quietHoursStart: z.string().optional().nullable(),
  quietHoursEnd: z.string().optional().nullable(),
  notifyReviews: z.boolean().optional(),
  notifyQuestions: z.boolean().optional(),
  notifyMessages: z.boolean().optional(),
  notifyMentions: z.boolean().optional(),
  notifyInsights: z.boolean().optional(),
  notifyTips: z.boolean().optional(),

  // Data Management Settings
  retentionDays: z.number().int().min(0).max(365).optional(),
  deleteOnDisconnect: z.boolean().optional(),

  // Branding
  branding: z
    .object({
      brandName: z.string().optional().nullable(),
      primaryColor: z.string().optional().nullable(),
      secondaryColor: z.string().optional().nullable(),
      logoUrl: z.string().optional().nullable(),
      coverImageUrl: z.string().optional().nullable(),
    })
    .optional(),
});

export type SettingsPayload = z.infer<typeof settingsSchema>;

// ============================================================================
// Types
// ============================================================================

export interface SettingsResult {
  success: boolean;
  error?: string;
  settings?: AllSettings;
}

export interface AllSettings {
  // General Settings
  businessName: string | null;
  primaryCategory: string | null;
  businessDescription: string | null;
  defaultReplyTemplate: string | null;
  timezone: string;
  language: string;
  syncSchedule: string;
  autoPublish: boolean;

  // AI & Automation
  autoReply: boolean;
  aiResponseTone: string;
  responseLength: string;
  creativityLevel: string;

  // Notifications
  reviewNotifications: boolean;
  emailDigest: string;
  emailDeliveryTime: string;
  negativePriority: boolean;
  replyReminders: boolean;
  browserNotifications: boolean;
  soundAlerts: boolean;
  quietHours: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  notifyReviews: boolean;
  notifyQuestions: boolean;
  notifyMessages: boolean;
  notifyMentions: boolean;
  notifyInsights: boolean;
  notifyTips: boolean;

  // Data Management
  retentionDays: number;
  deleteOnDisconnect: boolean;

  // Branding
  branding: {
    brandName: string | null;
    primaryColor: string;
    secondaryColor: string;
    logoUrl: string | null;
    coverImageUrl: string | null;
  };
}

// ============================================================================
// Server Actions
// ============================================================================

/**
 * Get all settings for the authenticated user
 */
export async function getSettings(): Promise<SettingsResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get active GMB account settings
    const { data: accounts, error: accountsError } = await supabase
      .from("gmb_accounts")
      .select("id, settings, data_retention_days, delete_on_disconnect")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1);

    if (accountsError) {
      await logAction("settings_view", "settings", "global", {
        status: "failed",
        error: accountsError.message,
      });
      return { success: false, error: "Failed to load settings" };
    }

    const account = accounts?.[0];
    const accountSettings =
      (account?.settings as Record<string, unknown>) || {};

    // Get profile
    let profile: { full_name?: string; avatar_url?: string } | null = null;
    try {
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (
        profileError &&
        profileError.code !== "PGRST116" &&
        profileError.code !== "PGRST205"
      ) {
        console.error("[Settings] Failed to fetch profile:", profileError);
      } else {
        profile = data;
      }
    } catch {
      // Table doesn't exist, skip it
    }

    // Combine all settings
    const allSettings: AllSettings = {
      // General Settings
      businessName:
        profile?.full_name || (accountSettings.businessName as string) || null,
      primaryCategory: (accountSettings.primaryCategory as string) || null,
      businessDescription:
        (accountSettings.businessDescription as string) || null,
      defaultReplyTemplate:
        (accountSettings.defaultReplyTemplate as string) || null,
      timezone: (accountSettings.timezone as string) || "utc",
      language: (accountSettings.language as string) || "en",
      syncSchedule: (accountSettings.syncSchedule as string) || "manual",
      autoPublish: (accountSettings.autoPublish as boolean) || false,

      // AI & Automation
      autoReply: (accountSettings.autoReply as boolean) || false,
      aiResponseTone:
        (accountSettings.aiResponseTone as string) || "professional",
      responseLength: (accountSettings.responseLength as string) || "medium",
      creativityLevel: (accountSettings.creativityLevel as string) || "medium",

      // Notifications
      reviewNotifications: accountSettings.reviewNotifications !== false,
      emailDigest: (accountSettings.emailDigest as string) || "daily",
      emailDeliveryTime:
        (accountSettings.emailDeliveryTime as string) || "09:00",
      negativePriority: accountSettings.negativePriority !== false,
      replyReminders: accountSettings.replyReminders !== false,
      browserNotifications:
        (accountSettings.browserNotifications as boolean) || false,
      soundAlerts: (accountSettings.soundAlerts as boolean) || false,
      quietHours: (accountSettings.quietHours as boolean) || false,
      quietHoursStart: (accountSettings.quietHoursStart as string) || "22:00",
      quietHoursEnd: (accountSettings.quietHoursEnd as string) || "08:00",
      notifyReviews: accountSettings.notifyReviews !== false,
      notifyQuestions: accountSettings.notifyQuestions !== false,
      notifyMessages: accountSettings.notifyMessages !== false,
      notifyMentions: (accountSettings.notifyMentions as boolean) || false,
      notifyInsights: accountSettings.notifyInsights !== false,
      notifyTips: (accountSettings.notifyTips as boolean) || false,

      // Data Management
      retentionDays: account?.data_retention_days || 30,
      deleteOnDisconnect: account?.delete_on_disconnect || false,

      // Branding
      branding: {
        brandName: profile?.full_name || null,
        primaryColor: "#FFA500",
        secondaryColor: "#1A1A1A",
        logoUrl: profile?.avatar_url || null,
        coverImageUrl: null,
      },
    };

    await logAction("settings_view", "settings", "global", {
      status: "success",
    });

    return { success: true, settings: allSettings };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logAction("settings_view", "settings", "global", {
      status: "failed",
      error: errorMessage,
    });
    return { success: false, error: "Unexpected error while loading settings" };
  }
}

/**
 * Update settings for the authenticated user
 */
export async function updateSettings(
  input: unknown,
): Promise<{ success: boolean; error?: string }> {
  // Validate input
  const parsed = settingsSchema.partial().safeParse(input);

  if (!parsed.success) {
    await logAction("settings_update", "settings", "global", {
      status: "failed",
      error: "Invalid settings payload",
      details: parsed.error.flatten(),
    });
    return { success: false, error: "Invalid settings data" };
  }

  const settings = parsed.data;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      await logAction("settings_update", "settings", "global", {
        status: "failed",
        error: authError?.message || "Unauthorized",
      });
      return { success: false, error: "Not authenticated" };
    }

    // Get active GMB accounts
    const { data: accounts, error: accountsError } = await supabase
      .from("gmb_accounts")
      .select("id, settings")
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (accountsError) {
      await logAction("settings_update", "settings", "global", {
        status: "failed",
        error: accountsError.message,
      });
      return { success: false, error: "Failed to update settings" };
    }

    if (!accounts || accounts.length === 0) {
      await logAction("settings_update", "settings", "global", {
        status: "failed",
        error: "No active GMB account found",
      });
      return { success: false, error: "No active GMB account found" };
    }

    // Separate settings by storage location
    const {
      businessName,
      retentionDays,
      deleteOnDisconnect,
      branding,
      ...accountSettings
    } = settings;

    // Update gmb_accounts.settings (JSONB)
    const updatedAccountSettings = {
      ...((accounts[0].settings as Record<string, unknown>) || {}),
      ...accountSettings,
      updatedAt: new Date().toISOString(),
    };

    // Update all active accounts
    for (const account of accounts) {
      const updateData: Record<string, unknown> = {
        settings: updatedAccountSettings,
        updated_at: new Date().toISOString(),
      };

      if (retentionDays !== undefined) {
        updateData.data_retention_days = retentionDays;
      }
      if (deleteOnDisconnect !== undefined) {
        updateData.delete_on_disconnect = deleteOnDisconnect;
      }

      const { error: updateError } = await supabase
        .from("gmb_accounts")
        .update(updateData)
        .eq("id", account.id)
        .eq("user_id", user.id);

      if (updateError) {
        await logAction("settings_update", "settings", account.id, {
          status: "failed",
          error: updateError.message,
        });
        return { success: false, error: "Failed to update settings" };
      }
    }

    // Update profiles if branding or businessName is provided
    if (businessName !== undefined || branding) {
      const profileData: Record<string, unknown> = {};

      if (businessName !== undefined) {
        profileData.full_name = businessName;
      }
      if (branding) {
        // Store branding in profiles or a separate table as needed
        // For now, we only update full_name and avatar_url
        if (branding.brandName !== undefined) {
          profileData.full_name = branding.brandName;
        }
        if (branding.logoUrl !== undefined) {
          profileData.avatar_url = branding.logoUrl;
        }
      }

      if (Object.keys(profileData).length > 0) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update(profileData)
          .eq("id", user.id);

        if (profileError && profileError.code !== "PGRST116") {
          console.error("[Settings] Failed to update profile:", profileError);
          // Don't fail the whole request if profile update fails
        }
      }
    }

    const changedKeys = Object.keys(settings);
    await logAction("settings_update", "settings", "global", {
      status: "success",
      changed_keys: changedKeys,
      retention_days: settings.retentionDays,
      delete_on_disconnect: settings.deleteOnDisconnect,
    });

    revalidatePath("/settings");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logAction("settings_update", "settings", "global", {
      status: "failed",
      error: errorMessage,
    });
    return {
      success: false,
      error: "Unexpected error while updating settings",
    };
  }
}

/**
 * Reset settings to defaults
 */
export async function resetSettings(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const defaultSettings = {
      timezone: "utc",
      language: "en",
      syncSchedule: "manual",
      autoPublish: false,
      autoReply: false,
      aiResponseTone: "professional",
      responseLength: "medium",
      creativityLevel: "medium",
      reviewNotifications: true,
      emailDigest: "daily",
      emailDeliveryTime: "09:00",
      negativePriority: true,
      replyReminders: true,
      browserNotifications: false,
      soundAlerts: false,
      quietHours: false,
      quietHoursStart: "22:00",
      quietHoursEnd: "08:00",
      notifyReviews: true,
      notifyQuestions: true,
      notifyMessages: true,
      notifyMentions: false,
      notifyInsights: true,
      notifyTips: false,
      updatedAt: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from("gmb_accounts")
      .update({
        settings: defaultSettings,
        data_retention_days: 30,
        delete_on_disconnect: false,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (updateError) {
      await logAction("settings_reset", "settings", "global", {
        status: "failed",
        error: updateError.message,
      });
      return { success: false, error: "Failed to reset settings" };
    }

    await logAction("settings_reset", "settings", "global", {
      status: "success",
    });

    revalidatePath("/settings");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logAction("settings_reset", "settings", "global", {
      status: "failed",
      error: errorMessage,
    });
    return {
      success: false,
      error: "Unexpected error while resetting settings",
    };
  }
}
