"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  UpdateSyncScheduleInputSchema,
  GetSyncSettingsInputSchema,
} from "@/lib/validations/gmb-settings";
import { z } from "zod";

export async function updateAccountSyncSettings(
  accountId: unknown,
  enabled: unknown,
  schedule: unknown = "hourly",
) {
  try {
    // ✅ Validate input with Zod
    const validated = UpdateSyncScheduleInputSchema.parse({
      accountId,
      enabled,
      schedule,
    });

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // Fetch current settings first to merge
    const { data: account, error: fetchError } = await supabase
      .from("gmb_accounts")
      .select("settings")
      .eq("id", validated.accountId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !account) {
      return { success: false, error: "Account not found" };
    }

    const currentSettings = account.settings || {};
    const newSettings = {
      ...currentSettings,
      syncSchedule: validated.enabled ? validated.schedule : "manual",
    };

    const { error: updateError } = await supabase
      .from("gmb_accounts")
      .update({ settings: newSettings })
      .eq("id", validated.accountId)
      .eq("user_id", user.id);

    if (updateError) {
      return { success: false, error: "Failed to update settings" };
    }

    revalidatePath("/dashboard");
    revalidatePath("/locations");

    return { success: true };
  } catch (error: any) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      console.error("[GMB Settings] Validation error:", error.errors);
      return {
        success: false,
        error: `Validation failed: ${error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
      };
    }

    console.error("Error updating sync settings:", error);
    return { success: false, error: error.message };
  }
}

export async function getAccountSyncSettings(accountId: unknown) {
  try {
    // ✅ Validate input with Zod
    const validated = GetSyncSettingsInputSchema.parse({ accountId });

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const { data: account, error } = await supabase
      .from("gmb_accounts")
      .select("settings")
      .eq("id", validated.accountId)
      .eq("user_id", user.id)
      .single();

    if (error || !account) {
      return { success: false, error: "Account not found" };
    }

    const settings = account.settings || {};
    return {
      success: true,
      enabled: settings.syncSchedule && settings.syncSchedule !== "manual",
      schedule: settings.syncSchedule || "manual",
    };
  } catch (error: any) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      console.error("[GMB Settings] Validation error:", error.errors);
      return {
        success: false,
        error: `Validation failed: ${error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
      };
    }

    return { success: false, error: error.message };
  }
}
