import { getValidAccessToken } from "@/lib/gmb/helpers";
import { createClient } from "@/lib/supabase/server";
import { ApiError, errorResponse, successResponse } from "@/utils/api-error";
import { gmbLogger } from "@/lib/utils/logger";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const NOTIFICATIONS_API_BASE =
  "https://mybusinessnotifications.googleapis.com/v1";

/**
 * GET - Fetch current notification settings
 * Returns the Pub/Sub notification settings for the GMB account
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse(new ApiError("Authentication required", 401));
    }

    // Get active GMB account
    const { data: account, error: accountError } = await supabase
      .from("gmb_accounts")
      .select("id, account_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (accountError) {
      gmbLogger.error(
        "Failed to load GMB account for notifications",
        accountError instanceof Error
          ? accountError
          : new Error(String(accountError)),
        { userId: user.id },
      );
      return errorResponse(new ApiError("Failed to load GMB account", 500));
    }

    if (!account) {
      return errorResponse(new ApiError("No active GMB account found", 404));
    }

    const accessToken = await getValidAccessToken(supabase, account.id);

    // Get current notification settings from Google
    const url = `${NOTIFICATIONS_API_BASE}/accounts/${account.account_id}/notificationSetting`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      let errorData: Record<string, unknown> = {};
      try {
        errorData = errorText ? JSON.parse(errorText) : {};
      } catch {
        errorData = { message: errorText };
      }

      gmbLogger.error(
        "Notifications setup Google response error",
        new Error(`HTTP ${response.status}`),
        {
          status: response.status,
          errorData,
          accountId: account.id,
        },
      );

      if (response.status === 401) {
        return errorResponse(
          new ApiError(
            "Authentication expired. Please reconnect your Google account.",
            401,
            errorData,
          ),
        );
      }

      if (response.status === 404) {
        // No settings configured yet - return empty settings
        return successResponse({
          name: `accounts/${account.account_id}/notificationSetting`,
          pubsubTopic: "",
          notificationTypes: [],
        });
      }

      const errorMessage = String(
        (errorData.error as Record<string, unknown>)?.message ||
          errorData.message ||
          "Failed to fetch notification settings",
      );
      return errorResponse(
        new ApiError(errorMessage, response.status, errorData),
      );
    }

    const settings = await response.json();

    return successResponse(settings);
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    gmbLogger.error("Notifications setup GET error", err);

    return errorResponse(
      new ApiError(err.message || "Failed to fetch notification settings", 500),
    );
  }
}

/**
 * PATCH - Update notification settings
 * Configures the Pub/Sub topic and notification types for the GMB account
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse(new ApiError("Authentication required", 401));
    }

    const body = await request.json();
    const { pubsubTopic, notificationTypes } = body;

    // Validate input
    if (!Array.isArray(notificationTypes)) {
      return errorResponse(
        new ApiError("notificationTypes must be an array", 400),
      );
    }

    // Get active GMB account
    const { data: account, error: accountError } = await supabase
      .from("gmb_accounts")
      .select("id, account_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (accountError) {
      gmbLogger.error(
        "Failed to load GMB account for notifications update",
        accountError instanceof Error
          ? accountError
          : new Error(String(accountError)),
        { userId: user.id },
      );
      return errorResponse(new ApiError("Failed to load GMB account", 500));
    }

    if (!account) {
      return errorResponse(new ApiError("No active GMB account found", 404));
    }

    const accessToken = await getValidAccessToken(supabase, account.id);

    // Update notification settings in Google
    const url = `${NOTIFICATIONS_API_BASE}/accounts/${account.account_id}/notificationSetting?updateMask=pubsubTopic,notificationTypes`;

    const requestBody = {
      name: `accounts/${account.account_id}/notificationSetting`,
      pubsubTopic: pubsubTopic || "",
      notificationTypes: notificationTypes || [],
    };

    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      let errorData: Record<string, unknown> = {};
      try {
        errorData = errorText ? JSON.parse(errorText) : {};
      } catch {
        errorData = { message: errorText };
      }

      gmbLogger.error(
        "Notifications setup Google response error",
        new Error(`HTTP ${response.status}`),
        {
          status: response.status,
          errorData,
          accountId: account.id,
        },
      );

      if (response.status === 401) {
        return errorResponse(
          new ApiError(
            "Authentication expired. Please reconnect your Google account.",
            401,
            errorData,
          ),
        );
      }

      const errorMessage = String(
        (errorData.error as Record<string, unknown>)?.message ||
          errorData.message ||
          "Failed to update notification settings",
      );
      return errorResponse(
        new ApiError(errorMessage, response.status, errorData),
      );
    }

    const settings = await response.json();

    // Store settings in database for reference
    await supabase
      .from("gmb_accounts")
      .update({
        notification_settings: settings,
        updated_at: new Date().toISOString(),
      })
      .eq("id", account.id);

    return successResponse(settings);
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    gmbLogger.error("Notifications setup PATCH error", err);

    return errorResponse(
      new ApiError(
        err.message || "Failed to update notification settings",
        500,
      ),
    );
  }
}
