// Location Service - Handles location-related operations
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LocationWithGMBAccount } from "../types";
import { apiLogger } from "@/lib/utils/logger";
import {
  DashboardServiceError,
  handleSupabaseError,
} from "../utils/error-handler";

export class LocationService {
  constructor(
    private supabase: SupabaseClient,
    private adminClient: SupabaseClient,
  ) {}

  /**
   * Fetch location with GMB account details for a specific user
   */
  async getLocationWithAccount(
    locationId: string,
    userId: string,
  ): Promise<LocationWithGMBAccount | null> {
    try {
      // First try with user's own supabase client
      const { data: location, error } = await this.supabase
        .from("gmb_locations")
        .select(
          `
          id, user_id, location_name, location_id, address, phone, website, is_active, metadata,
          gmb_accounts!inner(id, user_id, access_token, refresh_token, token_expires_at)
        `,
        )
        .eq("id", locationId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        apiLogger.error(
          "[LocationService] User query error",
          error instanceof Error ? error : new Error(String(error)),
          { locationId, userId },
        );
      }

      if (location) {
        return this.transformLocationData(location);
      }

      // Fallback to admin client if user query fails
      const { data: adminLocation, error: adminError } = await this.adminClient
        .from("gmb_locations")
        .select(
          `
          id, user_id, location_name, location_id, address, phone, website, is_active, metadata,
          gmb_accounts!inner(id, user_id, access_token, refresh_token, token_expires_at)
        `,
        )
        .eq("id", locationId)
        .maybeSingle();

      if (adminError) {
        handleSupabaseError(adminError, "getLocationWithAccount-admin");
      }

      return adminLocation ? this.transformLocationData(adminLocation) : null;
    } catch (error) {
      handleSupabaseError(error, "LocationService.getLocationWithAccount");
    }
  }

  /**
   * Get all locations for a user with pagination
   */
  async getUserLocations(
    userId: string,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<LocationWithGMBAccount[]> {
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await this.supabase
        .from("gmb_locations")
        .select(
          `
          id, user_id, location_name, location_id, address, phone, website, is_active, metadata,
          gmb_accounts!inner(id, user_id, access_token, refresh_token, token_expires_at)
        `,
        )
        .eq("user_id", userId)
        .eq("is_active", true)
        .range(from, to)
        .order("location_name");

      if (error) {
        handleSupabaseError(error, "getUserLocations");
      }

      return (data || []).map((location) =>
        this.transformLocationData(location),
      );
    } catch (error) {
      handleSupabaseError(error, "LocationService.getUserLocations");
    }
  }

  /**
   * Check if location belongs to user
   */
  async isLocationOwnedByUser(
    locationId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      const { count, error } = await this.supabase
        .from("gmb_locations")
        .select("*", { count: "exact", head: true })
        .eq("id", locationId)
        .eq("user_id", userId)
        .eq("is_active", true);

      if (error) {
        handleSupabaseError(error, "isLocationOwnedByUser");
      }

      return (count || 0) > 0;
    } catch (error) {
      handleSupabaseError(error, "LocationService.isLocationOwnedByUser");
    }
  }

  /**
   * Get locations that need token refresh
   */
  async getLocationsNeedingRefresh(
    userId: string,
  ): Promise<LocationWithGMBAccount[]> {
    try {
      const now = new Date().toISOString();

      const { data, error } = await this.supabase
        .from("gmb_locations")
        .select(
          `
          id, user_id, location_name, location_id, address, phone, website, is_active, metadata,
          gmb_accounts!inner(id, user_id, access_token, refresh_token, token_expires_at)
        `,
        )
        .eq("user_id", userId)
        .eq("is_active", true)
        .lt("gmb_accounts.token_expires_at", now);

      if (error) {
        handleSupabaseError(error, "getLocationsNeedingRefresh");
      }

      return (data || []).map((location) =>
        this.transformLocationData(location),
      );
    } catch (error) {
      handleSupabaseError(error, "LocationService.getLocationsNeedingRefresh");
    }
  }

  /**
   * Update location metadata
   */
  async updateLocationMetadata(
    locationId: string,
    userId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from("gmb_locations")
        .update({
          metadata,
          updated_at: new Date().toISOString(),
        })
        .eq("id", locationId)
        .eq("user_id", userId);

      if (error) {
        handleSupabaseError(error, "updateLocationMetadata");
      }
    } catch (error) {
      handleSupabaseError(error, "LocationService.updateLocationMetadata");
    }
  }

  /**
   * Transform raw location data to typed interface
   */
  private transformLocationData(
    rawData: Record<string, unknown>,
  ): LocationWithGMBAccount {
    const gmb_accounts = rawData.gmb_accounts as Record<string, unknown>;

    if (!gmb_accounts) {
      throw new DashboardServiceError(
        "Location missing GMB account data",
        "MISSING_GMB_ACCOUNT",
        {
          locationId: rawData.id,
        },
      );
    }

    return {
      id: rawData.id as string,
      user_id: rawData.user_id as string,
      location_name: rawData.location_name as string,
      location_id: rawData.location_id as string,
      address: rawData.address as string | null,
      phone: rawData.phone as string | null,
      website: rawData.website as string | null,
      is_active: rawData.is_active as boolean,
      metadata: (rawData.metadata as Record<string, unknown>) || {},
      gmb_accounts: {
        id: gmb_accounts.id as string,
        user_id: gmb_accounts.user_id as string,
        access_token: gmb_accounts.access_token as string,
        refresh_token: gmb_accounts.refresh_token as string,
        token_expires_at: gmb_accounts.token_expires_at as string,
      },
    };
  }
}
