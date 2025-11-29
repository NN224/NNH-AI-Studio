"use server";

// New Dashboard Actions - Clean, Type-Safe, and Modular
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Import our new services
import { DashboardService } from "./services/dashboard.service";
import { LocationService } from "./services/location.service";
import { OAuthService } from "./services/oauth.service";

// Import types
import type {
  DashboardDataResult,
  LocationWithGMBAccount,
  RefreshTokenActionResult,
} from "./types";

import { DashboardServiceError } from "./utils/error-handler";

/**
 * Get comprehensive dashboard data
 */
export async function getDashboardData(): Promise<DashboardDataResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new DashboardServiceError("User not authenticated", "AUTH_ERROR");
    }

    const dashboardService = new DashboardService(supabase);
    return await dashboardService.getDashboardData(user.id);
  } catch (error) {
    console.error("[getDashboardData] Error:", error);
    throw error instanceof DashboardServiceError
      ? error
      : new DashboardServiceError(
          "Failed to fetch dashboard data",
          "FETCH_ERROR",
        );
  }
}

/**
 * Refresh access token for a specific location
 */
export async function refreshTokenAction(
  locationId: string,
  forceRefresh: boolean = false,
): Promise<RefreshTokenActionResult> {
  try {
    const supabase = await createClient();
    const adminClient = await createAdminClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        message: "User not authenticated",
      };
    }

    // Get location with account details
    const locationService = new LocationService(supabase, adminClient);
    const location = await locationService.getLocationWithAccount(
      locationId,
      user.id,
    );

    if (!location) {
      return {
        success: false,
        message: "Location not found or access denied",
      };
    }

    // Refresh token
    const oauthService = new OAuthService(supabase);
    const refreshResult = await oauthService.refreshAccessToken(
      location.gmb_accounts.id,
      user.id,
      forceRefresh,
    );

    // Revalidate dashboard data
    revalidatePath("/dashboard");

    return {
      success: true,
      message: "Token refreshed successfully",
      newToken: refreshResult.access_token,
      expiresAt: new Date(
        Date.now() + refreshResult.expires_in * 1000,
      ).toISOString(),
    };
  } catch (error) {
    console.error("[refreshTokenAction] Error:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Get user locations with pagination
 */
export async function getUserLocations(
  page: number = 1,
  pageSize: number = 20,
): Promise<LocationWithGMBAccount[]> {
  try {
    const supabase = await createClient();
    const adminClient = await createAdminClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new DashboardServiceError("User not authenticated", "AUTH_ERROR");
    }

    const locationService = new LocationService(supabase, adminClient);
    return await locationService.getUserLocations(user.id, page, pageSize);
  } catch (error) {
    console.error("[getUserLocations] Error:", error);
    throw error instanceof DashboardServiceError
      ? error
      : new DashboardServiceError("Failed to fetch locations", "FETCH_ERROR");
  }
}

/**
 * Refresh all expired tokens for user
 */
export async function refreshAllExpiredTokens(): Promise<
  RefreshTokenActionResult[]
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return [
        {
          success: false,
          message: "User not authenticated",
        },
      ];
    }

    const oauthService = new OAuthService(supabase);
    const results = await oauthService.refreshAllExpiredTokens(user.id);

    // Revalidate dashboard data if any tokens were refreshed
    if (results.some((r) => r.success)) {
      revalidatePath("/dashboard");
    }

    return results;
  } catch (error) {
    console.error("[refreshAllExpiredTokens] Error:", error);
    return [
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
    ];
  }
}

/**
 * Check token status for all user accounts
 */
export async function checkTokenStatus(): Promise<{
  valid: number;
  expired: number;
  invalid: number;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new DashboardServiceError("User not authenticated", "AUTH_ERROR");
    }

    const oauthService = new OAuthService(supabase);
    return await oauthService.validateAllUserTokens(user.id);
  } catch (error) {
    console.error("[checkTokenStatus] Error:", error);
    return { valid: 0, expired: 0, invalid: 0 };
  }
}

/**
 * Update location metadata
 */
export async function updateLocationMetadata(
  locationId: string,
  metadata: Record<string, unknown>,
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = await createClient();
    const adminClient = await createAdminClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        message: "User not authenticated",
      };
    }

    const locationService = new LocationService(supabase, adminClient);

    // Verify ownership
    const isOwner = await locationService.isLocationOwnedByUser(
      locationId,
      user.id,
    );
    if (!isOwner) {
      return {
        success: false,
        message: "Location not found or access denied",
      };
    }

    await locationService.updateLocationMetadata(locationId, user.id, metadata);

    // Revalidate dashboard data
    revalidatePath("/dashboard");

    return {
      success: true,
      message: "Location metadata updated successfully",
    };
  } catch (error) {
    console.error("[updateLocationMetadata] Error:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Disconnect a location
 */
export async function disconnectLocation(
  locationId: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        message: "User not authenticated",
      };
    }

    const { error } = await supabase
      .from("gmb_locations")
      .update({ is_active: false })
      .eq("id", locationId)
      .eq("user_id", user.id);

    if (error) {
      throw error;
    }

    revalidatePath("/dashboard");

    return {
      success: true,
      message: "Location disconnected successfully",
    };
  } catch (error) {
    console.error("[disconnectLocation] Error:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Get best time to post (placeholder implementation)
 */
export async function getBestTimeToPost(): Promise<{
  success: boolean;
  data?: unknown;
  message?: string;
}> {
  try {
    // Placeholder implementation - return mock data for now
    return {
      success: true,
      data: {
        bestHours: [9, 12, 15, 18],
        bestDays: ["Tuesday", "Wednesday", "Thursday"],
        timezone: "UTC",
      },
    };
  } catch (error) {
    console.error("[getBestTimeToPost] Error:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Generate weekly tasks (placeholder implementation)
 */
export async function generateWeeklyTasks(
  _accountId: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        message: "User not authenticated",
      };
    }

    // Placeholder implementation - just return success for now
    // In real implementation, this would generate tasks based on account data

    revalidatePath("/dashboard");

    return {
      success: true,
      message: "Weekly tasks generated successfully",
    };
  } catch (error) {
    console.error("[generateWeeklyTasks] Error:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
