"use server";

import { resolveTokenValue } from "@/lib/security/encryption";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { API_TIMEOUTS, fetchWithTimeout } from "@/lib/utils/error-handling";
import { gmbLogger } from "@/lib/utils/logger";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type DisconnectOption = "keep" | "delete" | "export";

// Google OAuth revoke endpoint
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";

/**
 * Revoke Google OAuth token to invalidate access
 */
async function revokeGoogleToken(token: string): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(
      `${GOOGLE_REVOKE_URL}?token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
      API_TIMEOUTS.GOOGLE_API,
    );

    if (response.ok) {
      gmbLogger.info("Token revoked successfully");
      return true;
    }

    if (response.status === 400) {
      gmbLogger.info("Token already invalid or expired");
      return true;
    }

    gmbLogger.error(
      "Failed to revoke token",
      new Error(`HTTP ${response.status}`),
    );
    return false;
  } catch (error) {
    gmbLogger.error(
      "Error revoking token",
      error instanceof Error ? error : new Error(String(error)),
    );
    return false;
  }
}

// Validation schemas
const disconnectAccountSchema = z.object({
  accountId: z.string().uuid("Invalid account ID format"),
  option: z.enum(["keep", "delete", "export"]).default("keep"),
});

const dataRetentionSchema = z.object({
  accountId: z.string().uuid("Invalid account ID format"),
  retentionDays: z.number().int().min(1).max(365),
  deleteOnDisconnect: z.boolean(),
});

interface DisconnectResult {
  success: boolean;
  error?: string;
  message?: string;
  exportData?: Record<string, unknown> | null;
}

/**
 * Disconnect GMB Account with data retention options
 */
export async function disconnectGMBAccount(
  accountId: string,
  option: DisconnectOption = "keep",
): Promise<DisconnectResult> {
  const supabase = await createClient();
  const adminClient = createAdminClient(); // Needed to access gmb_secrets

  try {
    // Validate input
    const validation = disconnectAccountSchema.safeParse({ accountId, option });
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || "Invalid input",
      };
    }

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify account belongs to user (using standard client)
    const { data: account, error: accountError } = await supabase
      .from("gmb_accounts")
      .select("id, account_name, user_id") // ✅ FIXED: Removed access_token, refresh_token
      .eq("id", accountId)
      .eq("user_id", user.id)
      .single();

    if (accountError || !account) {
      return { success: false, error: "Account not found or access denied" };
    }

    // SECURITY: Get tokens from secrets table using Admin Client to revoke them
    const { data: secrets } = await adminClient
      .from("gmb_secrets")
      .select("access_token, refresh_token")
      .eq("account_id", accountId)
      .maybeSingle();

    const tokenToRevoke = secrets?.refresh_token || secrets?.access_token;
    if (tokenToRevoke) {
      const decryptedToken = resolveTokenValue(tokenToRevoke);
      if (decryptedToken) {
        await revokeGoogleToken(decryptedToken);
      }
    }

    // Export data if requested
    let exportData = null;
    if (option === "export") {
      exportData = await exportAccountData(accountId, user.id);
    }

    // Start updates
    const updates = [];

    // 1. Update GMB account status
    updates.push(
      supabase
        .from("gmb_accounts")
        .update({
          is_active: false,
          disconnected_at: new Date().toISOString(),
          // ✅ FIXED: Removed access_token, refresh_token, token_expires_at updates
          updated_at: new Date().toISOString(),
        })
        .eq("id", accountId)
        .eq("user_id", user.id),
    );

    // 2. ✅ NEW: Delete secrets permanently
    updates.push(
      adminClient.from("gmb_secrets").delete().eq("account_id", accountId),
    );

    // 3. Handle locations based on option
    if (option === "delete") {
      updates.push(
        supabase.from("gmb_locations").delete().eq("gmb_account_id", accountId),
      );
    } else {
      updates.push(
        supabase
          .from("gmb_locations")
          .update({
            is_active: false,
            is_archived: true,
            archived_at: new Date().toISOString(),
            last_synced_at: null,
          })
          .eq("gmb_account_id", accountId),
      );
    }

    // Get location IDs for child records
    const { data: locationIds } = await supabase
      .from("gmb_locations")
      .select("id")
      .eq("gmb_account_id", accountId);

    const locationIdList = locationIds?.map((l) => l.id) || [];

    // 4. Handle reviews
    if (locationIdList.length > 0) {
      if (option === "delete") {
        updates.push(
          supabase
            .from("gmb_reviews")
            .delete()
            .in("location_id", locationIdList),
        );
      } else {
        updates.push(
          supabase
            .from("gmb_reviews")
            .update({
              is_archived: true,
              status: "archived", // Ensure status matches constraints
              archived_at: new Date().toISOString(),
              reviewer_name: "Anonymous User", // Anonymize
            })
            .in("location_id", locationIdList),
        );
      }
    }

    // 5. Handle questions
    if (locationIdList.length > 0) {
      if (option === "delete") {
        updates.push(
          supabase
            .from("gmb_questions")
            .delete()
            .in("location_id", locationIdList),
        );
      } else {
        updates.push(
          supabase
            .from("gmb_questions")
            .update({
              status: "archived", // Ensure status matches constraints
              metadata: { archived: true }, // Store archive flag in metadata if no column
              author_name: "Anonymous User",
            })
            .in("location_id", locationIdList),
        );
      }
    }

    // 6. Handle posts
    if (locationIdList.length > 0) {
      if (option === "delete") {
        updates.push(
          supabase.from("gmb_posts").delete().in("location_id", locationIdList),
        );
      } else {
        // Posts might not have is_archived column, check schema or use metadata
        updates.push(
          supabase
            .from("gmb_posts")
            .update({
              status: "archived", // Assuming 'archived' is a valid status or use 'draft'
              metadata: {
                archived: true,
                archived_at: new Date().toISOString(),
              },
            })
            .in("location_id", locationIdList),
        );
      }
    }

    // Execute updates
    await Promise.allSettled(updates);

    // Revalidate paths
    revalidatePath("/dashboard");
    revalidatePath("/settings");
    revalidatePath("/locations");
    revalidatePath("/reviews");

    const message =
      option === "delete"
        ? "Account disconnected and all data deleted successfully"
        : option === "export"
          ? "Account disconnected and data exported successfully"
          : "Account disconnected. Historical data has been anonymized and archived.";

    return {
      success: true,
      message,
      exportData,
    };
  } catch (error) {
    gmbLogger.error(
      "Error disconnecting GMB account",
      error instanceof Error ? error : new Error(String(error)),
      { accountId },
    );
    const err = error as Error;
    return {
      success: false,
      error: err.message || "Failed to disconnect account",
    };
  }
}

/**
 * Export account data before disconnect
 */
async function exportAccountData(
  accountId: string,
  userId: string,
): Promise<Record<string, unknown> | null> {
  const supabase = await createClient();

  try {
    const { data: locationData } = await supabase
      .from("gmb_locations")
      .select("id")
      .eq("gmb_account_id", accountId)
      .eq("user_id", userId);

    const locationIdList = locationData?.map((l) => l.id) || [];

    const [locations, reviews, questions, posts] = await Promise.all([
      supabase
        .from("gmb_locations")
        .select("*")
        .eq("gmb_account_id", accountId)
        .eq("user_id", userId),

      locationIdList.length > 0
        ? supabase
            .from("gmb_reviews")
            .select("*")
            .in("location_id", locationIdList)
        : Promise.resolve({ data: [] }),

      locationIdList.length > 0
        ? supabase
            .from("gmb_questions")
            .select("*")
            .in("location_id", locationIdList)
        : Promise.resolve({ data: [] }),

      locationIdList.length > 0
        ? supabase
            .from("gmb_posts")
            .select("*")
            .in("location_id", locationIdList)
        : Promise.resolve({ data: [] }),
    ]);

    return {
      exportDate: new Date().toISOString(),
      locations: locations.data || [],
      reviews: reviews.data || [],
      questions: questions.data || [],
      posts: posts.data || [],
    } as Record<string, unknown>;
  } catch (error) {
    gmbLogger.error(
      "Error exporting account data",
      error instanceof Error ? error : new Error(String(error)),
      { accountId },
    );
    return null;
  }
}

/**
 * Get GMB connection status and data info
 */
export async function getGMBConnectionStatus() {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { isConnected: false };
    }

    // ✅ FIXED: Removed access_token, refresh_token from selection
    const { data: accounts } = await supabase
      .from("gmb_accounts")
      .select(
        "id, account_name, is_active, disconnected_at, data_retention_days",
      )
      .eq("user_id", user.id);

    const activeAccounts = accounts?.filter((a) => a.is_active) || [];
    const disconnectedAccounts =
      accounts?.filter((a) => !a.is_active && a.disconnected_at) || [];

    // Check for archived data
    const { count: archivedLocations } = await supabase
      .from("gmb_locations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_archived", true);

    const { data: userLocationIds } = await supabase
      .from("gmb_locations")
      .select("id")
      .eq("user_id", user.id);

    const userLocationIdList = userLocationIds?.map((l) => l.id) || [];

    // For reviews/posts/questions, check appropriate archive flags or status
    // Note: Adjust 'status' check based on your exact schema for these tables
    const { count: archivedReviews } =
      userLocationIdList.length > 0
        ? await supabase
            .from("gmb_reviews")
            .select("id", { count: "exact", head: true })
            .eq("status", "archived") // Assuming 'archived' status is used
            .in("location_id", userLocationIdList)
        : { count: 0 };

    return {
      isConnected: activeAccounts.length > 0,
      activeAccounts,
      disconnectedAccounts,
      hasArchivedData: (archivedLocations || 0) > 0,
      archivedLocationsCount: archivedLocations || 0,
      archivedReviewsCount: archivedReviews || 0,
    };
  } catch (error) {
    gmbLogger.error(
      "Error getting GMB connection status",
      error instanceof Error ? error : new Error(String(error)),
    );
    return { isConnected: false };
  }
}

/**
 * Permanently delete all archived data
 */
export async function permanentlyDeleteArchivedData() {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data: locationData } = await supabase
      .from("gmb_locations")
      .select("id")
      .eq("user_id", user.id);

    const locationIdList = locationData?.map((l) => l.id) || [];

    const deletePromises = [];

    if (locationIdList.length > 0) {
      // Delete archived items based on status/flags
      deletePromises.push(
        supabase
          .from("gmb_reviews")
          .delete()
          .eq("status", "archived")
          .in("location_id", locationIdList),

        supabase
          .from("gmb_questions")
          .delete()
          .eq("status", "archived")
          .in("location_id", locationIdList),

        // Posts table might use different archive flag
        supabase
          .from("gmb_posts")
          .delete()
          .contains("metadata", { archived: true })
          .in("location_id", locationIdList),
      );
    }

    deletePromises.push(
      supabase
        .from("gmb_locations")
        .delete()
        .eq("is_archived", true)
        .eq("user_id", user.id),
    );

    await Promise.all(deletePromises);

    revalidatePath("/settings");

    return {
      success: true,
      message: "All archived data has been permanently deleted",
    };
  } catch (error: unknown) {
    gmbLogger.error(
      "Error deleting archived data",
      error instanceof Error ? error : new Error(String(error)),
    );
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete archived data",
    };
  }
}

/**
 * Update data retention settings
 */
export async function updateDataRetentionSettings(
  accountId: string,
  retentionDays: number,
  deleteOnDisconnect: boolean,
) {
  const supabase = await createClient();

  try {
    const validation = dataRetentionSchema.safeParse({
      accountId,
      retentionDays,
      deleteOnDisconnect,
    });

    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || "Invalid input",
      };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { error } = await supabase
      .from("gmb_accounts")
      .update({
        data_retention_days: retentionDays,
        // delete_on_disconnect: deleteOnDisconnect, // Ensure this column exists in DB
        updated_at: new Date().toISOString(),
      })
      .eq("id", accountId)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/settings");

    return {
      success: true,
      message: "Data retention settings updated successfully",
    };
  } catch (error) {
    gmbLogger.error(
      "Error updating data retention settings",
      error instanceof Error ? error : new Error(String(error)),
    );
    const err = error as Error;
    return {
      success: false,
      error: err.message || "Failed to update settings",
    };
  }
}
