/**
 * GMB Locations Fetch from Google API
 *
 * This endpoint fetches locations directly from Google Business Profile API
 * without saving them to the database. Used in the "Select-Then-Import" flow.
 *
 * POST /api/gmb/locations/fetch-google
 * Body: { accountId: string }
 * Returns: { locations: GoogleLocation[] }
 */

import { ApiError, ErrorCode, withSecureApi } from "@/lib/api/secure-handler";
import { decryptToken } from "@/lib/security/encryption";
import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const GMB_LOCATIONS_URL =
  "https://mybusinessbusinessinformation.googleapis.com/v1";

// Request body schema
const FetchGoogleLocationsSchema = z.object({
  accountId: z.string().uuid("Invalid account ID format"),
});

type FetchGoogleLocationsBody = z.infer<typeof FetchGoogleLocationsSchema>;

// Google API response types
interface GoogleAddress {
  addressLines?: string[];
  locality?: string;
  administrativeArea?: string;
  postalCode?: string;
  regionCode?: string;
}

interface GoogleCategory {
  displayName?: string;
  categoryId?: string;
}

interface GooglePhoneNumbers {
  primaryPhone?: string;
  additionalPhones?: string[];
}

export interface GoogleLocation {
  name: string; // e.g., "locations/12345" or "accounts/xxx/locations/12345"
  title?: string;
  storefrontAddress?: GoogleAddress;
  phoneNumbers?: GooglePhoneNumbers;
  websiteUri?: string;
  categories?: {
    primaryCategory?: GoogleCategory;
    additionalCategories?: GoogleCategory[];
  };
}

interface GoogleLocationsResponse {
  locations?: GoogleLocation[];
  nextPageToken?: string;
}

export const POST = withSecureApi<FetchGoogleLocationsBody>(
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

    // Fetch the GMB account to get the Google account_id (e.g., "accounts/12345")
    const { data: gmbAccount, error: accountError } = await adminClient
      .from("gmb_accounts")
      .select("id, account_id, user_id")
      .eq("id", accountId)
      .single();

    if (accountError || !gmbAccount) {
      console.error(
        "[Fetch Google Locations] Account not found:",
        accountError,
      );
      throw new ApiError(ErrorCode.NOT_FOUND, "GMB account not found", 404);
    }

    // Security check: Ensure the account belongs to the authenticated user
    if (gmbAccount.user_id !== user.id) {
      console.error(
        "[Fetch Google Locations] User mismatch - account belongs to different user",
      );
      throw new ApiError(
        ErrorCode.FORBIDDEN,
        "You do not have access to this account",
        403,
      );
    }

    // Fetch the decrypted access token from gmb_secrets
    const { data: secrets, error: secretsError } = await adminClient
      .from("gmb_secrets")
      .select("access_token")
      .eq("account_id", accountId)
      .single();

    if (secretsError || !secrets?.access_token) {
      console.error(
        "[Fetch Google Locations] Failed to fetch secrets:",
        secretsError,
      );
      throw new ApiError(
        ErrorCode.INTERNAL_ERROR,
        "Failed to retrieve account credentials. Please reconnect your Google account.",
        500,
      );
    }

    // Decrypt the access token
    let accessToken: string;
    try {
      const decrypted = decryptToken(secrets.access_token);
      if (!decrypted) {
        throw new Error("Decryption returned null");
      }
      accessToken = decrypted;
    } catch (decryptError) {
      console.error(
        "[Fetch Google Locations] Failed to decrypt token:",
        decryptError,
      );
      throw new ApiError(
        ErrorCode.INTERNAL_ERROR,
        "Failed to decrypt credentials. Please reconnect your Google account.",
        500,
      );
    }

    // Fetch locations from Google Business Profile API
    const googleAccountId = gmbAccount.account_id; // e.g., "accounts/12345"
    const locationsUrl = new URL(
      `${GMB_LOCATIONS_URL}/${googleAccountId}/locations`,
    );
    locationsUrl.searchParams.set(
      "readMask",
      "name,title,storefrontAddress,phoneNumbers,websiteUri,categories",
    );
    locationsUrl.searchParams.set("alt", "json");

    console.warn(
      `[Fetch Google Locations] Fetching locations for account ${googleAccountId}`,
    );

    const locationsResponse = await fetch(locationsUrl.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!locationsResponse.ok) {
      const errorText = await locationsResponse.text();
      console.error("[Fetch Google Locations] Google API error:", {
        status: locationsResponse.status,
        body: errorText.substring(0, 500),
      });

      // Handle specific error cases
      if (locationsResponse.status === 401) {
        throw new ApiError(
          ErrorCode.UNAUTHORIZED,
          "Google access token expired. Please reconnect your account.",
          401,
        );
      }

      throw new ApiError(
        ErrorCode.EXTERNAL_SERVICE_ERROR,
        `Failed to fetch locations from Google: ${locationsResponse.status}`,
        502,
      );
    }

    const locationsData: GoogleLocationsResponse =
      await locationsResponse.json();
    const locations = locationsData.locations || [];

    console.warn(
      `[Fetch Google Locations] Found ${locations.length} locations from Google`,
    );

    // Return the raw locations to the client
    return NextResponse.json({
      success: true,
      locations: locations,
      accountId: accountId,
      googleAccountId: googleAccountId,
    });
  },
  {
    requireAuth: true,
    bodySchema: FetchGoogleLocationsSchema,
  },
);
