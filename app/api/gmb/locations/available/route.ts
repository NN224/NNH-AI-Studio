/**
 * GMB Available Locations API
 *
 * Returns locations from Google that are NOT yet imported to the database.
 * Used by AddLocationDialog to show available locations for import.
 *
 * POST /api/gmb/locations/available
 * Body: { accountId: string }
 * Returns: { success: boolean, locations: GoogleLocation[] }
 */

import { ApiError, ErrorCode, withSecureApi } from "@/lib/api/secure-handler";
import { resolveTokenValue } from "@/lib/security/encryption";
import { createAdminClient } from "@/lib/supabase/server";
import { gmbLogger } from "@/lib/utils/logger";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Request schema
const AvailableLocationsSchema = z.object({
  accountId: z.string().uuid("Invalid account ID format"),
});

type AvailableLocationsBody = z.infer<typeof AvailableLocationsSchema>;

// Google API URLs
const GMB_ACCOUNTS_API =
  "https://mybusinessbusinessinformation.googleapis.com/v1";

interface GoogleLocation {
  name: string;
  title?: string;
  storefrontAddress?: {
    addressLines?: string[];
    locality?: string;
    administrativeArea?: string;
    postalCode?: string;
  };
  phoneNumbers?: {
    primaryPhone?: string;
  };
  websiteUri?: string;
  categories?: {
    primaryCategory?: {
      displayName?: string;
    };
  };
}

export const POST = withSecureApi<AvailableLocationsBody>(
  async (_request, { body, user }) => {
    if (!user) {
      throw new ApiError(
        ErrorCode.UNAUTHORIZED,
        "Authentication required",
        401,
      );
    }

    const { accountId } = body;
    const adminClient = createAdminClient();

    // Get GMB account with tokens
    const { data: gmbAccount, error: accountError } = await adminClient
      .from("gmb_accounts")
      .select("id, account_id, user_id")
      .eq("id", accountId)
      .single();

    if (accountError || !gmbAccount) {
      throw new ApiError(ErrorCode.NOT_FOUND, "GMB account not found", 404);
    }

    // Security check
    if (gmbAccount.user_id !== user.id) {
      throw new ApiError(
        ErrorCode.FORBIDDEN,
        "You do not have access to this account",
        403,
      );
    }

    // Get access token from secrets
    const { data: secrets, error: secretsError } = await adminClient
      .from("gmb_secrets")
      .select("access_token, refresh_token")
      .eq("gmb_account_id", accountId)
      .single();

    if (secretsError || !secrets?.access_token) {
      throw new ApiError(
        ErrorCode.UNAUTHORIZED,
        "No access token found. Please reconnect your account.",
        401,
      );
    }

    // Decrypt access token
    let accessToken: string;
    try {
      const decrypted = resolveTokenValue(secrets.access_token, {
        context: `gmb_secrets.access_token:${accountId}`,
      });
      if (!decrypted) {
        throw new Error("Token decryption returned null");
      }
      accessToken = decrypted;
    } catch {
      throw new ApiError(
        ErrorCode.INTERNAL_ERROR,
        "Failed to decrypt access token",
        500,
      );
    }

    // Fetch all locations from Google
    const googleAccountId = gmbAccount.account_id; // e.g., "accounts/12345"
    const locationsUrl = `${GMB_ACCOUNTS_API}/${googleAccountId}/locations?readMask=name,title,storefrontAddress,phoneNumbers,websiteUri,categories`;

    const googleResponse = await fetch(locationsUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!googleResponse.ok) {
      const errorText = await googleResponse.text();
      gmbLogger.error(
        "[Available Locations] Google API error",
        new Error(`HTTP ${googleResponse.status}`),
        {
          status: googleResponse.status,
          body: errorText.substring(0, 500),
          accountId,
        },
      );
      throw new ApiError(
        ErrorCode.EXTERNAL_SERVICE_ERROR,
        "Failed to fetch locations from Google",
        502,
      );
    }

    const googleData = await googleResponse.json();
    const allGoogleLocations: GoogleLocation[] = googleData.locations || [];

    // Get already imported location IDs
    const { data: importedLocations } = await adminClient
      .from("gmb_locations")
      .select("location_id")
      .eq("gmb_account_id", accountId);

    const importedLocationIds = new Set(
      (importedLocations || []).map((l) => l.location_id),
    );

    // Filter out already imported locations
    const availableLocations = allGoogleLocations.filter(
      (location) => !importedLocationIds.has(location.name),
    );

    gmbLogger.info("[Available Locations] Computed available locations", {
      available: availableLocations.length,
      totalFromGoogle: allGoogleLocations.length,
      alreadyImported: importedLocationIds.size,
      accountId,
    });

    return NextResponse.json({
      success: true,
      locations: availableLocations,
      totalFromGoogle: allGoogleLocations.length,
      alreadyImported: importedLocationIds.size,
    });
  },
  {
    requireAuth: true,
    bodySchema: AvailableLocationsSchema,
  },
);
