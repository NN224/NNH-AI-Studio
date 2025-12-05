import {
  ALL_FEATURE_KEYS,
  FEATURE_CATALOG,
} from "@/lib/features/feature-definitions";
import { extractFeatureKeysFromGMBAttributes } from "@/lib/features/gmb-attribute-mapper";
import { createClient } from "@/lib/supabase/server";
import { GMBLocation } from "@/lib/types/database";
import { apiLogger } from "@/lib/utils/logger";
import {
  buildSocialLinks,
  buildSpecialLinks,
  ensureStringArray,
  extractAttributeStrings,
  normalizeBoolean,
  normalizeFeatureSelection,
  parseRecord,
  sanitizePhone,
  sanitizeWebsite,
} from "@/lib/utils/profile-utils";
import {
  BusinessProfileMetadata,
  BusinessProfilePayload,
  BusinessProfileSchema,
  GmbAttribute,
} from "@/lib/validations/profile";
import type {
  BusinessProfile,
  FeatureCategoryKey,
  FeatureSelection,
} from "@/types/features";
import { NextRequest, NextResponse } from "next/server";

const FEATURE_CATEGORY_KEYS: readonly FeatureCategoryKey[] = [
  "amenities",
  "payment_methods",
  "services",
  "atmosphere",
];

function computeCompleteness(profile: BusinessProfile): {
  score: number;
  breakdown: {
    basicsFilled: boolean;
    categoriesSet: boolean;
    featuresAdded: boolean;
    linksAdded: boolean;
  };
} {
  const basicsFilled = Boolean(
    profile.locationName.trim() &&
      profile.description.trim() &&
      profile.phone.trim() &&
      profile.website.trim(),
  );
  const categoriesSet =
    Boolean(profile.primaryCategory.trim()) &&
    profile.additionalCategories.length > 0;
  const featuresAdded = FEATURE_CATEGORY_KEYS.some(
    (category) => profile.features[category]?.length,
  );
  const linksAdded = Object.values(profile.specialLinks).some((link) =>
    Boolean(link),
  );

  const breakdown = {
    basicsFilled,
    categoriesSet,
    featuresAdded,
    linksAdded,
  };

  const totalChecks = Object.values(breakdown).length;
  const completed = Object.values(breakdown).filter(Boolean).length;
  const score = Math.round((completed / totalChecks) * 100);

  return {
    score,
    breakdown,
  };
}

function normalizeBusinessProfile(
  row: Record<string, unknown>,
): BusinessProfilePayload {
  const metadata = parseRecord(row.metadata) as BusinessProfileMetadata;
  // enhancedMetadata contains the full location object, so profile is at metadata.profile
  // But also check if metadata itself is the profile object (legacy format)
  const profileMetadata = parseRecord(
    metadata.profile ?? metadata,
  ) as BusinessProfileMetadata;

  const baseProfile: BusinessProfilePayload = {
    id: String(row.id ?? row.location_id ?? ""),
    locationResourceId:
      typeof row.location_id === "string"
        ? row.location_id
        : (metadata.location_id ?? null),
    locationName:
      (row.location_name as string) ??
      profileMetadata.locationName ??
      metadata.name ??
      profileMetadata.title ??
      "Unnamed location",
    description: (() => {
      // Priority 1: Direct column
      if (row.description) return String(row.description).trim();

      // Priority 2: Check metadata.profile directly (if it's an object, not parsed)
      const directProfile = metadata.profile;
      if (
        directProfile &&
        typeof directProfile === "object" &&
        !Array.isArray(directProfile)
      ) {
        const profileObj = directProfile as Record<string, unknown>;
        if (profileObj.description)
          return String(profileObj.description).trim();
        if (profileObj.merchantDescription)
          return String(profileObj.merchantDescription).trim();
      }

      // Priority 3: Metadata profile.description (from parseRecord)
      if (profileMetadata.description)
        return String(profileMetadata.description).trim();

      // Priority 4: Metadata description (direct)
      if (metadata.description) return String(metadata.description).trim();

      // Priority 5: Metadata profile.merchantDescription
      if (profileMetadata.merchantDescription)
        return String(profileMetadata.merchantDescription).trim();

      // Priority 6: Check nested metadata.profile.description (if metadata.profile is nested)
      if (metadata.profile && typeof metadata.profile === "object") {
        const nestedProfile = parseRecord(metadata.profile);
        if (nestedProfile.description)
          return String(nestedProfile.description).trim();
        if (nestedProfile.merchantDescription)
          return String(nestedProfile.merchantDescription).trim();
      }

      return "";
    })(),
    shortDescription:
      (row.short_description as string) ??
      profileMetadata.shortDescription ??
      profileMetadata.merchantDescription ??
      metadata.shortDescription ??
      "",
    phone: sanitizePhone(
      (row.phone as string) ?? metadata.phone ?? profileMetadata.phone ?? "",
    ),
    website: sanitizeWebsite(
      (row.website as string) ?? metadata.website ?? metadata.websiteUri ?? "",
    ),
    primaryCategory:
      (row.category as string) ??
      metadata.primary_category ??
      metadata.primaryCategory ??
      metadata.categories?.primary ??
      "",
    additionalCategories: (() => {
      // Priority 1: Direct column
      if (row.additional_categories) {
        return ensureStringArray(row.additional_categories);
      }
      // Priority 2: Metadata arrays (already strings)
      if (metadata.additional_categories) {
        return ensureStringArray(metadata.additional_categories);
      }
      if (metadata.additionalCategories) {
        return ensureStringArray(metadata.additionalCategories);
      }
      // Priority 3: Metadata categories.additional
      if (metadata.categories?.additional) {
        return ensureStringArray(metadata.categories.additional);
      }
      // Priority 4: Metadata categories.additionalCategories (objects with displayName)
      if (metadata.categories?.additionalCategories) {
        const cats = Array.isArray(metadata.categories.additionalCategories)
          ? metadata.categories.additionalCategories
          : [];
        const processed = cats
          .map((cat) => {
            if (typeof cat === "string") return cat;
            if (cat && typeof cat === "object") {
              const catObj = cat as Record<string, unknown>;
              if (catObj.displayName) return String(catObj.displayName);
              if (catObj.name) return String(catObj.name);
            }
            return String(cat || "").trim();
          })
          .filter((cat) => cat.length > 0);
        if (processed.length > 0) return processed;
      }
      // Priority 5: Check if stored in metadata.profile (parsed)
      const profileMeta = parseRecord(metadata.profile);
      if (profileMeta.additionalCategories) {
        return ensureStringArray(profileMeta.additionalCategories);
      }
      return [];
    })(),
    features: (() => {
      // Try multiple sources for features
      // Priority 1: If metadata.features is already structured
      const featuresFromMetadata = normalizeFeatureSelection(
        metadata.features ?? {},
        ALL_FEATURE_KEYS,
        FEATURE_CATEGORY_KEYS,
      );

      // Priority 2: Extract from attributes array (from Attributes API)
      // Use the GMB attribute mapper to convert GMB attribute names to feature keys
      let featureKeysFromGMB: string[] = [];
      if (Array.isArray(metadata.attributes)) {
        featureKeysFromGMB = extractFeatureKeysFromGMBAttributes(
          metadata.attributes as GmbAttribute[],
        );

        if (process.env.NODE_ENV !== "production") {
          apiLogger.info(
            "[normalizeBusinessProfile] Extracted feature keys from GMB attributes:",
            {
              count: featureKeysFromGMB.length,
            },
          );
        }
      }

      // Priority 3: Check from_the_business column (legacy string-based attributes)
      const fromBusiness = (() => {
        if (row.from_the_business) {
          return ensureStringArray(row.from_the_business);
        }
        if (metadata.from_the_business) {
          return ensureStringArray(metadata.from_the_business);
        }
        if (profileMetadata.fromTheBusiness) {
          return ensureStringArray(profileMetadata.fromTheBusiness);
        }
        return [];
      })();

      // Merge all feature key sources
      const allFeatureKeys = Array.from(
        new Set([...featureKeysFromGMB, ...fromBusiness]),
      );

      // If we have structured features from metadata, use them
      const hasMetadataFeatures = FEATURE_CATEGORY_KEYS.some(
        (category) => featuresFromMetadata[category].length > 0,
      );
      if (hasMetadataFeatures) {
        // Convert readonly arrays to mutable arrays
        return {
          amenities: [...featuresFromMetadata.amenities],
          payment_methods: [...featuresFromMetadata.payment_methods],
          services: [...featuresFromMetadata.services],
          atmosphere: [...featuresFromMetadata.atmosphere],
        };
      }

      // Otherwise, build feature selection from extracted keys
      if (allFeatureKeys.length > 0) {
        // Build an index of feature keys to categories
        const index = new Map<string, FeatureCategoryKey>();
        FEATURE_CATEGORY_KEYS.forEach((category) => {
          FEATURE_CATALOG[category].forEach((definition) => {
            index.set(definition.key, category);
          });
        });

        const selection: FeatureSelection = {
          amenities: [],
          payment_methods: [],
          services: [],
          atmosphere: [],
        };

        allFeatureKeys.forEach((featureKey: string) => {
          const category = index.get(featureKey.trim());
          if (category) {
            selection[category] = Array.from(
              new Set([...selection[category], featureKey.trim()]),
            );
          }
        });

        if (process.env.NODE_ENV !== "production") {
          apiLogger.info(
            "[normalizeBusinessProfile] Built feature selection:",
            {
              amenities: selection.amenities.length,
              payment_methods: selection.payment_methods.length,
              services: selection.services.length,
              atmosphere: selection.atmosphere.length,
            },
          );
        }

        return selection;
      }

      return featuresFromMetadata;
    })(),
    specialLinks: buildSpecialLinks(metadata, row),
    socialLinks: buildSocialLinks(metadata),
    fromTheBusiness: (() => {
      // Priority 1: Direct column
      if (row.from_the_business) {
        return ensureStringArray(row.from_the_business);
      }
      // Priority 2: Metadata from_the_business
      if (metadata.from_the_business) {
        return ensureStringArray(metadata.from_the_business);
      }
      // Priority 3: Metadata fromBusiness
      if (metadata.fromTheBusiness) {
        return ensureStringArray(metadata.fromTheBusiness);
      }
      // Priority 4: Metadata profile.fromTheBusiness
      if (profileMetadata.fromTheBusiness) {
        return ensureStringArray(profileMetadata.fromTheBusiness);
      }
      // Priority 5: Extract from attributes array (from Attributes API)
      if (Array.isArray(metadata.attributes)) {
        return extractAttributeStrings(metadata.attributes as GmbAttribute[]);
      }
      // Priority 6: Metadata profile.attributes (if it's an array)
      if (
        profileMetadata.attributes &&
        Array.isArray(profileMetadata.attributes)
      ) {
        return extractAttributeStrings(
          profileMetadata.attributes as GmbAttribute[],
        );
      }
      return [];
    })(),
    openingDate: (() => {
      // Priority 1: Direct column
      if (row.opening_date) return String(row.opening_date).trim() || null;
      // Priority 2: Metadata opening_date
      if (metadata.opening_date)
        return String(metadata.opening_date).trim() || null;
      // Priority 3: Metadata profile.openingDate
      if (profileMetadata.openingDate)
        return String(profileMetadata.openingDate).trim() || null;
      return null;
    })(),
    serviceAreaEnabled: (() => {
      // Priority 1: Direct column
      if (
        row.service_area_enabled !== undefined &&
        row.service_area_enabled !== null
      ) {
        return normalizeBoolean(row.service_area_enabled, false);
      }
      // Priority 2: Metadata service_area_enabled
      if (
        metadata.service_area_enabled !== undefined &&
        metadata.service_area_enabled !== null
      ) {
        return normalizeBoolean(metadata.service_area_enabled, false);
      }
      // Priority 3: Metadata serviceAreaEnabled
      if (
        metadata.serviceAreaEnabled !== undefined &&
        metadata.serviceAreaEnabled !== null
      ) {
        return normalizeBoolean(metadata.serviceAreaEnabled, false);
      }
      return false;
    })(),
    regularHours: (() => {
      const hours =
        metadata.regularHours || row.business_hours || row.regularhours;
      if (process.env.NODE_ENV !== "production" && hours) {
        apiLogger.info("[normalizeBusinessProfile] regularHours found:", {
          type: typeof hours,
          keys: Object.keys(hours || {}),
        });
      }
      return hours as Record<string, unknown> | undefined;
    })(),
    moreHours: (() => {
      const hours = metadata.moreHours;
      if (process.env.NODE_ENV !== "production" && hours) {
        apiLogger.info("[normalizeBusinessProfile] moreHours found:", {
          isArray: Array.isArray(hours),
          hours,
        });
      }
      return hours as Record<string, unknown> | undefined;
    })(),
    serviceItems: (() => {
      const items = metadata.serviceItems;
      if (process.env.NODE_ENV !== "production" && items) {
        apiLogger.info("[normalizeBusinessProfile] serviceItems found:", {
          isArray: Array.isArray(items),
          count: Array.isArray(items) ? items.length : 0,
        });
      }
      return items as unknown[] | undefined;
    })(),
    profileCompleteness:
      Number(row.profile_completeness ?? metadata.profileCompleteness ?? 0) ||
      0,
  };

  const completeness = computeCompleteness(baseProfile);

  return {
    ...baseProfile,
    profileCompleteness: completeness.score,
    profileCompletenessBreakdown: completeness.breakdown,
  };
}

function mergeMetadata(
  original: Record<string, unknown>,
  profile: BusinessProfilePayload,
  completeness: {
    score: number;
    breakdown: {
      basicsFilled: boolean;
      categoriesSet: boolean;
      featuresAdded: boolean;
      linksAdded: boolean;
    };
  },
): Record<string, unknown> {
  const current = parseRecord(original);
  return {
    ...current,
    profile: {
      ...parseRecord(current.profile),
      description: profile.description,
      shortDescription: profile.shortDescription,
    },
    features: profile.features,
    specialLinks: profile.specialLinks,
    primaryCategory: profile.primaryCategory,
    additionalCategories: profile.additionalCategories,
    from_the_business: profile.fromTheBusiness,
    service_area_enabled: profile.serviceAreaEnabled,
    opening_date: profile.openingDate,
    profileCompleteness: completeness.score,
    profileCompletenessBreakdown: completeness.breakdown,
  };
}

async function getAuthorizedLocation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  locationId: string,
): Promise<GMBLocation> {
  const { data, error } = await supabase
    .from("gmb_locations")
    .select("*")
    .eq("id", locationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to query location");
  }

  if (!data) {
    throw new Error("Location not found");
  }

  return data as GMBLocation;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { locationId: string } },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { locationId } = params;
    if (!locationId) {
      return NextResponse.json(
        { error: "Location ID required" },
        { status: 400 },
      );
    }

    const row = (await getAuthorizedLocation(
      supabase,
      user.id,
      locationId,
    )) as unknown as Record<string, unknown>;

    // Debug logging in development
    if (process.env.NODE_ENV !== "production") {
      const metadata = parseRecord(row.metadata);
      const profileMetadata = parseRecord(metadata.profile ?? metadata);
      apiLogger.info("[GET /api/features/profile] Row data:", {
        id: row.id,
        location_name: row.location_name,
        description: row.description || "EMPTY",
        additional_categories: row.additional_categories || "EMPTY",
        phone: row.phone || "EMPTY",
        website: row.website || "EMPTY",
        category: row.category || "EMPTY",
        menu_url: row.menu_url || "NULL",
        booking_url: row.booking_url || "NULL",
        order_url: row.order_url || "NULL",
        appointment_url: row.appointment_url || "NULL",
        from_the_business: row.from_the_business || "EMPTY",
        opening_date: row.opening_date || "NULL",
        service_area_enabled: row.service_area_enabled,
        has_metadata: !!row.metadata,
        metadata_keys: row.metadata ? Object.keys(metadata) : [],
        metadata_profile_keys: profileMetadata
          ? Object.keys(profileMetadata).slice(0, 10)
          : [],
        metadata_description: metadata.description ? "EXISTS" : "MISSING",
        metadata_profile_description: profileMetadata.description
          ? "EXISTS"
          : "MISSING",
        metadata_features: metadata.features ? "EXISTS" : "MISSING",
        metadata_attributes: metadata.attributes ? "EXISTS" : "MISSING",
        metadata_specialLinks: metadata.specialLinks ? "EXISTS" : "MISSING",
      });
    }

    const profile = normalizeBusinessProfile(row);

    // Debug logging in development
    if (process.env.NODE_ENV !== "production") {
      apiLogger.info("[GET /api/features/profile] Normalized profile:", {
        locationName: profile.locationName,
        description: profile.description?.substring(0, 100),
        additionalCategories: profile.additionalCategories,
        phone: profile.phone,
        website: profile.website,
        primaryCategory: profile.primaryCategory,
        features: {
          amenities: profile.features.amenities?.length || 0,
          payment_methods: profile.features.payment_methods?.length || 0,
          services: profile.features.services?.length || 0,
          atmosphere: profile.features.atmosphere?.length || 0,
        },
        specialLinks: profile.specialLinks,
        fromTheBusiness: profile.fromTheBusiness,
        openingDate: profile.openingDate,
        serviceAreaEnabled: profile.serviceAreaEnabled,
      });
    }

    return NextResponse.json(profile);
  } catch (error: unknown) {
    const isError = error instanceof Error;
    const message = isError ? error.message : "Internal server error";
    const status = message === "Location not found" ? 404 : 500;
    if (process.env.NODE_ENV !== "production") {
      apiLogger.error(
        "[GET /api/features/profile/:locationId] Error",
        error instanceof Error ? error : new Error(String(error)),
        { status, locationId: params.locationId },
      );
    }
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { locationId: string } },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { locationId } = params;
    if (!locationId) {
      return NextResponse.json(
        { error: "Location ID required" },
        { status: 400 },
      );
    }

    // Validate request body with Zod
    const requestData = await request.json();
    const parseResult = BusinessProfileSchema.safeParse(requestData);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parseResult.error.errors,
        },
        { status: 400 },
      );
    }

    const payload = parseResult.data;

    const supabaseClient = await supabase;
    const currentRow = await getAuthorizedLocation(
      supabaseClient,
      user.id,
      locationId,
    );

    const normalizedFeatureSelection: FeatureSelection = {
      amenities: Array.from(new Set(payload.features.amenities ?? []))
        .map((item) => item.trim())
        .filter((item) => ALL_FEATURE_KEYS.has(item)),
      payment_methods: Array.from(
        new Set(payload.features.payment_methods ?? []),
      )
        .map((item) => item.trim())
        .filter((item) => ALL_FEATURE_KEYS.has(item)),
      services: Array.from(new Set(payload.features.services ?? []))
        .map((item) => item.trim())
        .filter((item) => ALL_FEATURE_KEYS.has(item)),
      atmosphere: Array.from(new Set(payload.features.atmosphere ?? []))
        .map((item) => item.trim())
        .filter((item) => ALL_FEATURE_KEYS.has(item)),
    };

    const specialLinksPayload = payload.specialLinks ?? {};
    const fromBusinessPayload = payload.fromTheBusiness ?? [];
    const additionalCategoriesPayload = payload.additionalCategories ?? [];

    const normalizedProfile: BusinessProfile = {
      id: payload.id,
      locationResourceId: payload.locationResourceId,
      locationName: payload.locationName.trim(),
      description: payload.description,
      shortDescription: payload.shortDescription,
      phone: sanitizePhone(payload.phone),
      website: sanitizeWebsite(payload.website),
      primaryCategory: payload.primaryCategory.trim(),
      additionalCategories: [
        ...Array.from(
          new Set(additionalCategoriesPayload.map((item) => item.trim())),
        ),
      ],
      features: normalizedFeatureSelection,
      specialLinks: {
        menu: specialLinksPayload.menu
          ? sanitizeWebsite(specialLinksPayload.menu)
          : null,
        booking: specialLinksPayload.booking
          ? sanitizeWebsite(specialLinksPayload.booking)
          : null,
        order: specialLinksPayload.order
          ? sanitizeWebsite(specialLinksPayload.order)
          : null,
        appointment: specialLinksPayload.appointment
          ? sanitizeWebsite(specialLinksPayload.appointment)
          : null,
      },
      socialLinks: payload.socialLinks ?? {},
      fromTheBusiness: [
        ...Array.from(new Set(fromBusinessPayload.map((item) => item.trim()))),
      ],
      openingDate: payload.openingDate ?? null,
      serviceAreaEnabled: payload.serviceAreaEnabled,
      profileCompleteness: payload.profileCompleteness,
    };

    const completeness = computeCompleteness(normalizedProfile);
    const currentMetadata = parseRecord(currentRow.metadata);
    // Convert normalizedProfile to BusinessProfilePayload
    const profilePayload: BusinessProfilePayload = {
      id: normalizedProfile.id,
      locationResourceId: normalizedProfile.locationResourceId,
      locationName: normalizedProfile.locationName,
      description: normalizedProfile.description,
      shortDescription: normalizedProfile.shortDescription,
      phone: normalizedProfile.phone,
      website: normalizedProfile.website,
      primaryCategory: normalizedProfile.primaryCategory,
      additionalCategories: [...normalizedProfile.additionalCategories],
      features: {
        amenities: [...normalizedProfile.features.amenities],
        payment_methods: [...normalizedProfile.features.payment_methods],
        services: [...normalizedProfile.features.services],
        atmosphere: [...normalizedProfile.features.atmosphere],
      },
      specialLinks: normalizedProfile.specialLinks,
      socialLinks: normalizedProfile.socialLinks,
      fromTheBusiness: [...normalizedProfile.fromTheBusiness],
      openingDate: normalizedProfile.openingDate,
      serviceAreaEnabled: normalizedProfile.serviceAreaEnabled,
      profileCompleteness: completeness.score,
      profileCompletenessBreakdown: completeness.breakdown,
    };

    const updatedMetadata = mergeMetadata(
      currentMetadata,
      profilePayload,
      completeness,
    );

    const updatePayload: Record<string, unknown> = {
      metadata: updatedMetadata,
      updated_at: new Date().toISOString(),
      profile_completeness: completeness.score,
    };

    // Only include fields that exist on the current row
    if ("location_name" in currentRow)
      updatePayload.location_name = normalizedProfile.locationName;
    if ("description" in currentRow)
      updatePayload.description = normalizedProfile.description;
    if ("short_description" in currentRow)
      updatePayload.short_description = normalizedProfile.shortDescription;
    if ("phone" in currentRow) updatePayload.phone = normalizedProfile.phone;
    if ("website" in currentRow)
      updatePayload.website = normalizedProfile.website;
    if ("category" in currentRow)
      updatePayload.category = normalizedProfile.primaryCategory;
    if ("additional_categories" in currentRow)
      updatePayload.additional_categories =
        normalizedProfile.additionalCategories;
    if ("from_the_business" in currentRow)
      updatePayload.from_the_business = normalizedProfile.fromTheBusiness;
    if ("service_area_enabled" in currentRow)
      updatePayload.service_area_enabled = normalizedProfile.serviceAreaEnabled;
    if ("opening_date" in currentRow)
      updatePayload.opening_date = normalizedProfile.openingDate;

    if ("menu_url" in currentRow)
      updatePayload.menu_url = normalizedProfile.specialLinks.menu ?? null;
    if ("booking_url" in currentRow)
      updatePayload.booking_url =
        normalizedProfile.specialLinks.booking ?? null;
    if ("order_url" in currentRow)
      updatePayload.order_url = normalizedProfile.specialLinks.order ?? null;
    if ("appointment_url" in currentRow)
      updatePayload.appointment_url =
        normalizedProfile.specialLinks.appointment ?? null;

    const { error: updateError } = await supabaseClient
      .from("gmb_locations")
      .update(updatePayload)
      .eq("id", locationId)
      .eq("user_id", user.id);

    if (updateError) {
      throw new Error(
        updateError.message || "Failed to update location profile",
      );
    }

    const updatedRow = (await getAuthorizedLocation(
      supabaseClient,
      user.id,
      locationId,
    )) as unknown as Record<string, unknown>;
    const profileResponse = normalizeBusinessProfile(updatedRow);

    return NextResponse.json(profileResponse);
  } catch (error: unknown) {
    const isError = error instanceof Error;
    const message = isError ? error.message : "Internal server error";
    const status = message === "Location not found" ? 404 : 500;
    if (process.env.NODE_ENV !== "production") {
      apiLogger.error(
        "[PUT /api/features/profile/:locationId] Error",
        error instanceof Error ? error : new Error(String(error)),
        { status, locationId: params.locationId },
      );
    }
    return NextResponse.json({ error: message }, { status });
  }
}
