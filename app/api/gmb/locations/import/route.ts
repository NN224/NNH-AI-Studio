/**
 * GMB Locations Import API
 *
 * This endpoint imports user-selected locations into the database
 * and triggers the initial sync for each location.
 *
 * POST /api/gmb/locations/import
 * Body: { accountId: string, locations: GMBLocationData[] }
 * Returns: { success: boolean, importedCount: number, syncQueueIds: string[] }
 */

import { ApiError, ErrorCode, withSecureApi } from "@/lib/api/secure-handler";
import { createAdminClient } from "@/lib/supabase/server";
import { addToSyncQueue } from "@/server/actions/sync-queue";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Schema for location data from Google API
const GoogleLocationSchema = z.object({
  name: z.string(), // e.g., "locations/12345" or "accounts/xxx/locations/12345"
  title: z.string().optional(),
  storefrontAddress: z
    .object({
      addressLines: z.array(z.string()).optional(),
      locality: z.string().optional(),
      administrativeArea: z.string().optional(),
      postalCode: z.string().optional(),
      regionCode: z.string().optional(),
    })
    .optional(),
  phoneNumbers: z
    .object({
      primaryPhone: z.string().optional(),
      additionalPhones: z.array(z.string()).optional(),
    })
    .optional(),
  websiteUri: z.string().optional(),
  categories: z
    .object({
      primaryCategory: z
        .object({
          displayName: z.string().optional(),
          categoryId: z.string().optional(),
        })
        .optional(),
      additionalCategories: z
        .array(
          z.object({
            displayName: z.string().optional(),
            categoryId: z.string().optional(),
          }),
        )
        .optional(),
    })
    .optional(),
});

// Request body schema
const ImportLocationsSchema = z.object({
  accountId: z.string().uuid("Invalid account ID format"),
  locations: z
    .array(GoogleLocationSchema)
    .min(1, "At least one location must be selected"),
});

type ImportLocationsBody = z.infer<typeof ImportLocationsSchema>;
type GoogleLocationData = z.infer<typeof GoogleLocationSchema>;

/**
 * Format address from Google location data
 */
function formatAddress(
  storefrontAddress: GoogleLocationData["storefrontAddress"],
): string | null {
  if (!storefrontAddress) return null;

  const parts = [
    storefrontAddress.addressLines?.join(", "),
    storefrontAddress.locality,
    storefrontAddress.administrativeArea,
    storefrontAddress.postalCode,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : null;
}

export const POST = withSecureApi<ImportLocationsBody>(
  async (_request, { body, user }) => {
    if (!user) {
      throw new ApiError(
        ErrorCode.UNAUTHORIZED,
        "Authentication required",
        401,
      );
    }

    const { accountId, locations } = body;

    const adminClient = createAdminClient();

    // Verify the account exists and belongs to the user
    const { data: gmbAccount, error: accountError } = await adminClient
      .from("gmb_accounts")
      .select("id, account_id, user_id")
      .eq("id", accountId)
      .single();

    if (accountError || !gmbAccount) {
      console.error("[Import Locations] Account not found:", accountError);
      throw new ApiError(ErrorCode.NOT_FOUND, "GMB account not found", 404);
    }

    // Security check: Ensure the account belongs to the authenticated user
    if (gmbAccount.user_id !== user.id) {
      console.error(
        "[Import Locations] User mismatch - account belongs to different user",
      );
      throw new ApiError(
        ErrorCode.FORBIDDEN,
        "You do not have access to this account",
        403,
      );
    }

    console.warn(
      `[Import Locations] Importing ${locations.length} locations for account ${accountId}`,
    );

    const importedLocationIds: string[] = [];
    const syncQueueIds: string[] = [];
    const errors: string[] = [];

    // Process each selected location
    for (const location of locations) {
      const locationData = {
        gmb_account_id: accountId,
        user_id: user.id,
        location_name: location.title || "Unnamed Location",
        location_id: location.name,
        address: formatAddress(location.storefrontAddress),
        phone: location.phoneNumbers?.primaryPhone || null,
        category: location.categories?.primaryCategory?.displayName || null,
        website: location.websiteUri || null,
        is_active: true,
        metadata: location, // Store full Google response for reference
        updated_at: new Date().toISOString(),
      };

      // Upsert the location (insert or update if exists)
      const { data: upsertedLocation, error: upsertError } = await adminClient
        .from("gmb_locations")
        .upsert(locationData, {
          onConflict: "location_id",
          ignoreDuplicates: false,
        })
        .select("id")
        .single();

      if (upsertError) {
        console.error(
          `[Import Locations] Error upserting location ${location.name}:`,
          upsertError,
        );
        errors.push(`Failed to import ${location.title || location.name}`);
        continue;
      }

      if (upsertedLocation) {
        importedLocationIds.push(upsertedLocation.id);
        console.warn(
          `[Import Locations] Imported location ${upsertedLocation.id}`,
        );

        // Add to sync queue with high priority for initial sync
        const syncResult = await addToSyncQueue(
          accountId,
          "full",
          10, // High priority for initial sync
          user.id,
        );

        if (syncResult.success && syncResult.queueId) {
          syncQueueIds.push(syncResult.queueId);
          console.warn(
            `[Import Locations] Added to sync queue: ${syncResult.queueId}`,
          );
        } else {
          console.error(
            `[Import Locations] Failed to add to sync queue:`,
            syncResult.error,
          );
        }
      }
    }

    // Check if any locations were imported
    if (importedLocationIds.length === 0) {
      throw new ApiError(
        ErrorCode.INTERNAL_ERROR,
        "Failed to import any locations. Please try again.",
        500,
      );
    }

    console.warn(
      `[Import Locations] Successfully imported ${importedLocationIds.length}/${locations.length} locations`,
    );

    // Return success response
    return NextResponse.json({
      success: true,
      importedCount: importedLocationIds.length,
      totalRequested: locations.length,
      importedLocationIds,
      syncQueueIds,
      errors: errors.length > 0 ? errors : undefined,
    });
  },
  {
    requireAuth: true,
    bodySchema: ImportLocationsSchema,
  },
);
