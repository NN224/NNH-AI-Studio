import { z } from "zod";

/**
 * GoogleBusinessProfile attribute
 */
export const LocationAttributeSchema = z.object({
  name: z.string(),
  values: z.array(z.string()).optional(),
  uriValues: z
    .array(
      z.object({
        uri: z.string(),
      }),
    )
    .optional(),
});

export type LocationAttribute = z.infer<typeof LocationAttributeSchema>;

/**
 * Location from Google Business API
 */
export const GoogleLocationSchema = z.object({
  name: z.string(),
  title: z.string().optional(),
  storefrontAddress: z
    .object({
      regionCode: z.string().optional(),
      administrativeArea: z.string().optional(),
      locality: z.string().optional(),
      addressLines: z.array(z.string()).optional(),
      postalCode: z.string().optional(),
    })
    .optional(),
  phoneNumbers: z
    .array(
      z.object({
        phoneNumber: z.string(),
        type: z.string().optional(),
      }),
    )
    .optional(),
  websiteUri: z.string().optional(),
  categories: z
    .object({
      primaryCategory: z
        .object({
          name: z.string().optional(),
          displayName: z.string().optional(),
          categoryId: z.string().optional(),
        })
        .optional(),
      additionalCategories: z
        .array(
          z.object({
            name: z.string().optional(),
            displayName: z.string().optional(),
            categoryId: z.string().optional(),
          }),
        )
        .optional(),
    })
    .optional(),
  profile: z
    .object({
      description: z.string().optional(),
      merchantDescription: z.string().optional(),
    })
    .optional(),
  regularHours: z.record(z.unknown()).optional(),
  specialHours: z.array(z.unknown()).optional(),
  moreHours: z.array(z.unknown()).optional(),
  serviceItems: z.array(z.unknown()).optional(),
  openInfo: z
    .object({
      status: z.string().optional(),
      openingDate: z.string().optional(),
    })
    .optional(),
  metadata: z.record(z.unknown()).optional(),
  latlng: z
    .object({
      latitude: z.number().optional(),
      longitude: z.number().optional(),
    })
    .optional(),
  labels: z.array(z.string()).optional(),
  relationshipData: z.record(z.unknown()).optional(),
  attributes: z.array(LocationAttributeSchema).optional(),
});

export type GoogleLocation = z.infer<typeof GoogleLocationSchema>;

/**
 * Location API response
 */
export const LocationDetailResponseSchema = z.object({
  location: GoogleLocationSchema,
  attributes: z.array(LocationAttributeSchema),
  googleUpdated: GoogleLocationSchema.nullable(),
  gmb_account_id: z.string(),
});

export type LocationDetailResponse = z.infer<
  typeof LocationDetailResponseSchema
>;

/**
 * Location in the database with account information
 */
export const LocationWithAccountSchema = z.object({
  id: z.string(),
  location_id: z.string(),
  location_name: z.string().optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  gmb_account_id: z.string(),
  user_id: z.string(),
  gmb_accounts: z.object({
    id: z.string(),
    account_id: z.string(),
  }),
});

export type LocationWithAccount = z.infer<typeof LocationWithAccountSchema>;

/**
 * Schema for the location update request body
 */
export const LocationUpdateRequestSchema = z.object({
  name: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  category: z.string().optional(),
});

export type LocationUpdateRequest = z.infer<typeof LocationUpdateRequestSchema>;
