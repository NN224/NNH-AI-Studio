import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { BusinessAttributesValidator } from "@/lib/services/business-attributes-validation";
import { apiLogger } from "@/lib/utils/logger";
import { NextRequest, NextResponse } from "next/server";

const BulkUpdateSchema = z.object({
  locationIds: z.array(z.string()).min(1).max(50),
  updates: z.object({
    // Basic info
    shortDescription: z.string().optional(),
    description: z.string().optional(),
    phone: z.string().optional(),
    website: z.string().optional(),
    email: z.string().email().optional(),

    // Business hours
    businessHours: z
      .record(
        z.object({
          open: z.string(),
          close: z.string(),
        }),
      )
      .optional(),

    // Features
    features: z
      .object({
        amenities: z.array(z.string()).optional(),
        payment_methods: z.array(z.string()).optional(),
        services: z.array(z.string()).optional(),
        atmosphere: z.array(z.string()).optional(),
      })
      .optional(),

    // Categories
    categories: z.array(z.string()).optional(),

    // Additional
    yearEstablished: z.number().optional(),
    priceRange: z.enum(["$", "$$", "$$$", "$$$$"]).optional(),
    languages: z.array(z.string()).optional(),
  }),
  options: z
    .object({
      validateBefore: z.boolean().default(true),
      createBackup: z.boolean().default(true),
      dryRun: z.boolean().default(false),
      skipErrors: z.boolean().default(false),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request
    const body = await request.json();
    const validation = BulkUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 },
      );
    }

    const { locationIds, updates, options = {} } = validation.data;
    const {
      validateBefore = true,
      createBackup = true,
      dryRun = false,
      skipErrors = false,
    } = options as {
      validateBefore?: boolean;
      createBackup?: boolean;
      dryRun?: boolean;
      skipErrors?: boolean;
    };

    // Verify user has access to these locations
    const { data: locations, error: locationsError } = await supabase
      .from("gmb_locations")
      .select(
        `
        id,
        location_name,
        metadata,
        business_type,
        description,
        phone,
        website,
        address,
        business_hours,
        attributes
      `,
      )
      .in("id", locationIds)
      .eq("user_id", user.id);

    if (locationsError || !locations) {
      return NextResponse.json(
        { error: "Failed to fetch locations" },
        { status: 500 },
      );
    }

    if (locations.length !== locationIds.length) {
      return NextResponse.json(
        { error: "Some locations not found or access denied" },
        { status: 403 },
      );
    }

    const results = {
      success: [] as { id: string; name: string }[],
      failed: [] as { id: string; name: string; error: string }[],
      skipped: [] as { id: string; name: string; reason: string }[],
      validationErrors: {} as Record<string, unknown>,
      backupId: null as string | null,
    };

    // Create backup if requested
    if (createBackup && !dryRun) {
      const backupData = locations.map((loc) => ({
        location_id: loc.id,
        location_name: loc.location_name,
        data: {
          metadata: loc.metadata,
          business_type: loc.business_type,
          description: loc.description,
          phone: loc.phone,
          website: loc.website,
          address: loc.address,
          business_hours: loc.business_hours,
          attributes: loc.attributes,
        },
        created_by: user.id,
        operation_type: "bulk_update",
      }));

      const { data: backup, error: backupError } = await supabase
        .from("business_profile_history")
        .insert(backupData)
        .select("id")
        .single();

      if (!backupError && backup) {
        results.backupId = backup.id;
      }
    }

    // Process each location
    for (const location of locations) {
      try {
        // Apply updates to location data
        const updatedLocation = {
          ...location,
          ...updates,
          metadata: {
            ...((location.metadata as Record<string, unknown>) || {}),
            lastBulkUpdate: new Date().toISOString(),
            updatedBy: user.id,
          },
        };

        // Validate if requested
        if (validateBefore) {
          const validationResult = BusinessAttributesValidator.validate({
            locationName: location.location_name,
            shortDescription: updatedLocation.description || "",
            description: updatedLocation.description || "",
            phone: updatedLocation.phone || "",
            website: updatedLocation.website || "",
            email: updates.email,
            businessHours: updatedLocation.business_hours,
            categories: updates.categories,
            features: updates.features,
            yearEstablished: updates.yearEstablished,
            priceRange: updates.priceRange,
            languages: updates.languages,
          });

          if (!validationResult.isValid) {
            if (skipErrors) {
              results.skipped.push({
                id: location.id,
                name: location.location_name,
                reason: `Validation failed: ${validationResult.errors.map((e) => e.message).join(", ")}`,
              });
              continue;
            } else {
              results.failed.push({
                id: location.id,
                name: location.location_name,
                error: "Validation failed",
              });
              results.validationErrors[location.id] = validationResult;
              continue;
            }
          }
        }

        // Skip if dry run
        if (dryRun) {
          results.success.push({
            id: location.id,
            name: location.location_name,
          });
          continue;
        }

        // Update in database
        const updateData: Record<string, unknown> = {
          metadata: updatedLocation.metadata,
          updated_at: new Date().toISOString(),
        };

        // Add optional fields
        if (updates.shortDescription)
          updateData.description = updates.shortDescription;
        if (updates.phone) updateData.phone = updates.phone;
        if (updates.website) updateData.website = updates.website;
        if (updates.businessHours)
          updateData.business_hours = updates.businessHours;
        if (updates.categories)
          updateData.business_type = updates.categories.join(", ");

        // Update attributes
        if (updates.features) {
          const currentAttributes =
            (location.attributes as Record<string, unknown>) || {};
          updateData.attributes = {
            ...currentAttributes,
            ...updates.features,
          };
        }

        const { error: updateError } = await supabase
          .from("gmb_locations")
          .update(updateData)
          .eq("id", location.id)
          .eq("user_id", user.id);

        if (updateError) {
          results.failed.push({
            id: location.id,
            name: location.location_name,
            error: updateError.message,
          });
        } else {
          results.success.push({
            id: location.id,
            name: location.location_name,
          });

          // Record in history
          await supabase.from("business_profile_history").insert({
            location_id: location.id,
            location_name: location.location_name,
            data: updateData,
            created_by: user.id,
            operation_type: "update",
            metadata: {
              bulkUpdate: true,
              updatesApplied: Object.keys(updates),
            },
          });
        }
      } catch (error) {
        results.failed.push({
          id: location.id,
          name: location.location_name,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const summary = {
      totalLocations: locationIds.length,
      successful: results.success.length,
      failed: results.failed.length,
      skipped: results.skipped.length,
      dryRun,
      backupId: results.backupId,
    };

    return NextResponse.json({
      success: true,
      summary,
      results,
      message: dryRun
        ? `Dry run completed. ${results.success.length} locations would be updated.`
        : `Bulk update completed: ${results.success.length} succeeded, ${results.failed.length} failed`,
    });
  } catch (error) {
    apiLogger.error(
      "Bulk update error",
      error instanceof Error ? error : new Error(String(error)),
      { requestId: request.headers.get("x-request-id") || undefined },
    );
    return NextResponse.json(
      { error: "Failed to process bulk update" },
      { status: 500 },
    );
  }
}
