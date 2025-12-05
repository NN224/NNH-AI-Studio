import { z } from "zod";

/**
 * Validation schema for business profile update
 */
export const BusinessProfileSchema = z.object({
  id: z.string(),
  locationResourceId: z.string().nullable(),
  locationName: z.string().min(1, "Location name is required"),
  description: z.string(),
  shortDescription: z.string(),
  phone: z.string(),
  website: z.string(),
  primaryCategory: z.string(),
  additionalCategories: z.array(z.string()),
  features: z.object({
    amenities: z.array(z.string()),
    payment_methods: z.array(z.string()),
    services: z.array(z.string()),
    atmosphere: z.array(z.string()),
  }),
  specialLinks: z.object({
    menu: z.string().nullable().optional(),
    booking: z.string().nullable().optional(),
    order: z.string().nullable().optional(),
    appointment: z.string().nullable().optional(),
  }),
  socialLinks: z.object({
    facebook: z.string().nullable().optional(),
    instagram: z.string().nullable().optional(),
    twitter: z.string().nullable().optional(),
    whatsapp: z.string().nullable().optional(),
    youtube: z.string().nullable().optional(),
    linkedin: z.string().nullable().optional(),
    tiktok: z.string().nullable().optional(),
    pinterest: z.string().nullable().optional(),
  }),
  fromTheBusiness: z.array(z.string()),
  openingDate: z.string().nullable(),
  serviceAreaEnabled: z.boolean(),
  profileCompleteness: z.number(),
  profileCompletenessBreakdown: z
    .object({
      basicsFilled: z.boolean(),
      categoriesSet: z.boolean(),
      featuresAdded: z.boolean(),
      linksAdded: z.boolean(),
    })
    .optional(),
  regularHours: z.record(z.unknown()).optional(),
  moreHours: z.record(z.unknown()).optional(),
  serviceItems: z.array(z.unknown()).optional(),
});

/**
 * Schema for GMB attribute object
 */
export const GmbAttributeSchema = z.object({
  name: z.string().optional(),
  values: z
    .array(
      z.union([
        z.string(),
        z
          .object({
            displayName: z.string().optional(),
          })
          .optional(),
      ]),
    )
    .optional(),
  uriValues: z
    .array(
      z
        .object({
          uri: z.string().optional(),
        })
        .optional(),
    )
    .optional(),
});

/**
 * Schema for place action link object
 */
export const PlaceActionLinkSchema = z.object({
  placeActionType: z.string().optional(),
  uri: z.string().optional(),
});

/**
 * Export types for use in code
 */
export type BusinessProfilePayload = z.infer<typeof BusinessProfileSchema>;
export type GmbAttribute = z.infer<typeof GmbAttributeSchema>;
export type PlaceActionLink = z.infer<typeof PlaceActionLinkSchema>;

/**
 * Schema for business profile metadata
 */
export const BusinessProfileMetadataSchema = z
  .object({
    profile: z.record(z.unknown()).optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    shortDescription: z.string().optional(),
    phone: z.string().optional(),
    website: z.string().optional(),
    websiteUri: z.string().optional(),
    primary_category: z.string().optional(),
    primaryCategory: z.string().optional(),
    additional_categories: z
      .union([z.array(z.string()), z.string()])
      .optional(),
    additionalCategories: z.union([z.array(z.string()), z.string()]).optional(),
    categories: z
      .object({
        primary: z.string().optional(),
        additional: z.array(z.string()).optional(),
        additionalCategories: z.array(z.unknown()).optional(),
      })
      .optional(),
    features: z.record(z.unknown()).optional(),
    attributes: z.array(GmbAttributeSchema).optional(),
    from_the_business: z.union([z.array(z.string()), z.string()]).optional(),
    fromTheBusiness: z.union([z.array(z.string()), z.string()]).optional(),
    specialLinks: z.record(z.unknown()).optional(),
    links: z.record(z.unknown()).optional(),
    placeActionLinks: z.array(PlaceActionLinkSchema).optional(),
    location_id: z.string().optional(),
    regularHours: z.record(z.unknown()).optional(),
    moreHours: z.unknown().optional(),
    serviceItems: z.unknown().optional(),
    opening_date: z.string().optional(),
    openingDate: z.string().optional(),
    service_area_enabled: z
      .union([z.boolean(), z.string(), z.number()])
      .optional(),
    serviceAreaEnabled: z
      .union([z.boolean(), z.string(), z.number()])
      .optional(),
    profileCompleteness: z.number().optional(),
    profileCompletenessBreakdown: z.record(z.boolean()).optional(),
    menu_url: z.string().nullable().optional(),
    menu: z.string().nullable().optional(),
    booking_url: z.string().nullable().optional(),
    booking: z.string().nullable().optional(),
    reservationUri: z.string().nullable().optional(),
    order_url: z.string().nullable().optional(),
    order: z.string().nullable().optional(),
    appointment_url: z.string().nullable().optional(),
    appointment: z.string().nullable().optional(),
  })
  .passthrough();

export type BusinessProfileMetadata = z.infer<
  typeof BusinessProfileMetadataSchema
>;
