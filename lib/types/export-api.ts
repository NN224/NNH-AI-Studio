import { z } from "zod";

/**
 * Raw location data from database for export
 */
export const LocationExportRawSchema = z.object({
  id: z.string().optional(),
  location_name: z.string().optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  rating: z.number().nullable().optional(),
  review_count: z.number().nullable().optional(),
  status: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export type LocationExportRaw = z.infer<typeof LocationExportRawSchema>;

/**
 * Processed location data for export
 */
export const ProcessedLocationSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  phone: z.string(),
  website: z.string(),
  rating: z.number(),
  reviewCount: z.number(),
  status: z.string(),
  category: z.string(),
  created_at: z.string(),
  last_synced: z.string(),
});

export type ProcessedLocation = z.infer<typeof ProcessedLocationSchema>;

/**
 * User type for auth middleware
 */
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email().optional(),
  user_metadata: z.record(z.unknown()).optional(),
});

export type AuthUser = z.infer<typeof UserSchema>;

/**
 * Metadata type for location
 */
export const LocationMetadataSchema = z
  .object({
    last_sync: z.string().optional(),
    lastSync: z.string().optional(),
  })
  .passthrough();

export type LocationMetadata = z.infer<typeof LocationMetadataSchema>;
