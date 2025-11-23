"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateAccountSyncSettings(
  accountId: string,
  enabled: boolean,
  schedule: string = "hourly",
) {
  try {
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
      .eq("id", accountId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !account) {
      return { success: false, error: "Account not found" };
    }

    const currentSettings = account.settings || {};
    const newSettings = {
      ...currentSettings,
      syncSchedule: enabled ? schedule : "manual",
    };

    const { error: updateError } = await supabase
      .from("gmb_accounts")
      .update({ settings: newSettings })
      .eq("id", accountId)
      .eq("user_id", user.id);

    if (updateError) {
      return { success: false, error: "Failed to update settings" };
    }

    revalidatePath("/dashboard");
    revalidatePath("/locations");

    return { success: true };
  } catch (error: any) {
    console.error("Error updating sync settings:", error);
    return { success: false, error: error.message };
  }
}

export async function getAccountSyncSettings(accountId: string) {
  try {
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
      .eq("id", accountId)
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
    return { success: false, error: error.message };
  }
}
