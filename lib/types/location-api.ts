import { z } from "zod";

/**
 * Schema and types for the recent review
 */
export const RecentReviewSchema = z.object({
  id: z.string(),
  rating: z.number().nullable(),
  review_text: z.string().nullable(),
  reviewer_name: z.string(),
  review_date: z.string().nullable(),
  has_reply: z.boolean(),
});

export type RecentReview = z.infer<typeof RecentReviewSchema>;

/**
 * Schema and types for the transformed recent review
 */
export const TransformedRecentReviewSchema = z.object({
  id: z.string(),
  rating: z.number().nullable(),
  text: z.string().nullable(),
  reviewer: z.string(),
  date: z.string().nullable(),
  hasReply: z.boolean(),
});

export type TransformedRecentReview = z.infer<
  typeof TransformedRecentReviewSchema
>;

/**
 * Schema and types for the location stats
 */
export const LocationStatsSchema = z.object({
  totalReviews: z.number(),
  pendingReviews: z.number(),
  totalQuestions: z.number(),
  pendingQuestions: z.number(),
  recentReviewsCount: z.number(),
  avgRecentRating: z.number().nullable(),
  lastReviewDate: z.string().nullable(),
});

export type LocationStats = z.infer<typeof LocationStatsSchema>;

/**
 * Schema for the raw location data returned from the database
 * (Joined with reviews and questions)
 */
export const RawLocationSchema = z
  .object({
    // Basic location fields
    id: z.string(),
    gmb_account_id: z.string(),
    user_id: z.string(),
    location_id: z.string(),
    location_name: z.string(),
    address: z.string().nullable(),
    phone: z.string().nullable(),
    website: z.string().nullable(),
    category: z.string().nullable(),
    rating: z.number().nullable(),
    review_count: z.number().nullable(),
    health_score: z.number().nullable(),
    status: z.string().nullable(),
    is_active: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),

    // Joined fields
    review_stats: z
      .array(
        z.object({
          count: z.number().nullable(),
        }),
      )
      .nullable(),

    pending_reviews: z.array(z.unknown()).nullable(),

    question_stats: z
      .array(
        z.object({
          count: z.number().nullable(),
        }),
      )
      .nullable(),

    pending_questions: z.array(z.unknown()).nullable(),

    recent_reviews: z.array(RecentReviewSchema).nullable(),
  })
  .passthrough(); // Allow additional properties from database

export type RawLocation = z.infer<typeof RawLocationSchema>;

/**
 * Schema for the transformed location with calculated stats
 */
export const TransformedLocationSchema = z
  .object({
    // Basic location fields from RawLocationSchema minus the joined fields
    id: z.string(),
    gmb_account_id: z.string(),
    user_id: z.string(),
    location_id: z.string(),
    location_name: z.string(),
    address: z.string().nullable(),
    phone: z.string().nullable(),
    website: z.string().nullable(),
    category: z.string().nullable(),
    rating: z.number().nullable(),
    review_count: z.number().nullable(),
    health_score: z.number().nullable(),
    status: z.string().nullable(),
    is_active: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),

    // Computed stats
    stats: LocationStatsSchema,

    // Transformed recent reviews
    recentReviews: z.array(TransformedRecentReviewSchema),
  })
  .passthrough(); // Allow additional properties from database

export type TransformedLocation = z.infer<typeof TransformedLocationSchema>;

/**
 * Response schema for the locations API
 */
export const LocationsResponseSchema = z.object({
  locations: z.array(TransformedLocationSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  hasMore: z.boolean(),
  stats: z.object({
    totalLocations: z.number(),
    categoryCounts: z.record(z.number()),
  }),
});

export type LocationsResponse = z.infer<typeof LocationsResponseSchema>;
