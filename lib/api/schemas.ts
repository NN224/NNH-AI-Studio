/**
 * ============================================================================
 * API Validation Schemas
 * ============================================================================
 *
 * Centralized Zod schemas for API request validation.
 * All POST/PUT/PATCH requests should use these schemas.
 */

import { z } from "zod";

// ============================================================================
// Common Field Schemas
// ============================================================================

/** UUID validation */
export const uuidSchema = z.string().uuid("Invalid ID format");

/** Pagination query parameters */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/** Sort order */
export const sortOrderSchema = z.enum(["asc", "desc"]).default("desc");

/** Date string (ISO format) */
export const dateStringSchema = z
  .string()
  .datetime({ offset: true })
  .optional();

/** Safe string - no script tags or SQL injection patterns */
export const safeStringSchema = z
  .string()
  .refine(
    (val) => !/<script|javascript:|on\w+=/i.test(val),
    "Invalid characters detected",
  )
  .refine(
    (val) => !/('|"|;|--|\/\*|\*\/|xp_|sp_|exec\s)/i.test(val),
    "Invalid characters detected",
  );

// ============================================================================
// Reviews Schemas
// ============================================================================

export const reviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
  status: z
    .enum(["pending", "replied", "responded", "flagged", "archived"])
    .optional(),
  locationId: uuidSchema.optional(),
  search: z.string().max(200).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  export: z.enum(["csv"]).optional(),
});

export const replyToReviewSchema = z.object({
  reviewId: uuidSchema,
  replyText: z
    .string()
    .min(1, "Reply cannot be empty")
    .max(4096, "Reply must be less than 4096 characters"),
});

export const updateReviewStatusSchema = z.object({
  reviewId: uuidSchema,
  status: z.enum(["pending", "replied", "responded", "flagged", "archived"]),
});

// ============================================================================
// Posts Schemas
// ============================================================================

export const createPostSchema = z.object({
  locationId: uuidSchema,
  content: z
    .string()
    .min(1, "Content is required")
    .max(1500, "Content must be less than 1500 characters"),
  callToAction: z
    .object({
      type: z
        .enum(["LEARN_MORE", "BOOK", "ORDER", "SHOP", "SIGN_UP", "CALL"])
        .optional(),
      url: z.string().url("Invalid URL").optional(),
    })
    .optional(),
  mediaUrl: z.string().url("Invalid media URL").optional(),
  aiGenerated: z.boolean().default(false),
  promptUsed: z.string().max(500).optional(),
  tone: z.string().max(50).optional(),
  postType: z.enum(["STANDARD", "EVENT", "OFFER", "ALERT"]).default("STANDARD"),
  scheduledAt: dateStringSchema,
});

export const updatePostSchema = z.object({
  postId: uuidSchema,
  content: z.string().min(1).max(1500).optional(),
  callToAction: z
    .object({
      type: z
        .enum(["LEARN_MORE", "BOOK", "ORDER", "SHOP", "SIGN_UP", "CALL"])
        .optional(),
      url: z.string().url().optional(),
    })
    .optional(),
  mediaUrl: z.string().url().optional(),
  status: z.enum(["draft", "scheduled", "published", "failed"]).optional(),
});

export const postsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  locationId: uuidSchema.optional(),
  status: z.enum(["draft", "scheduled", "published", "failed"]).optional(),
  postType: z.enum(["STANDARD", "EVENT", "OFFER", "ALERT"]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

// ============================================================================
// Locations Schemas
// ============================================================================

export const locationSchema = z.object({
  locationName: z
    .string()
    .min(1, "Location name is required")
    .max(100, "Location name too long"),
  address: z.string().max(200, "Address too long").optional(),
  category: z.string().max(50, "Category name too long").optional(),
  phone: z
    .string()
    .regex(/^[\d\s\-+()]*$/, "Invalid phone number format")
    .max(20)
    .optional(),
});

export const updateLocationSchema = z.object({
  locationId: uuidSchema,
  locationName: z.string().min(1).max(100).optional(),
  address: z.string().max(200).optional(),
  phone: z
    .string()
    .regex(/^[\d\s\-+()]*$/)
    .max(20)
    .optional(),
  category: z.string().max(50).optional(),
  isActive: z.boolean().optional(),
});

// ============================================================================
// GMB Sync Schemas
// ============================================================================

export const syncRequestSchema = z.object({
  accountId: uuidSchema,
  syncType: z
    .enum([
      "full",
      "incremental",
      "locations",
      "reviews",
      "questions",
      "media",
      "performance",
    ])
    .default("full"),
  priority: z.number().int().min(0).max(10).default(0),
});

// ============================================================================
// Account Schemas
// ============================================================================

export const connectAccountSchema = z.object({
  code: z.string().min(1, "Authorization code is required"),
  state: z.string().min(1, "State parameter is required"),
});

// ============================================================================
// Type Exports
// ============================================================================

export type ReviewsQuery = z.infer<typeof reviewsQuerySchema>;
export type ReplyToReview = z.infer<typeof replyToReviewSchema>;
export type UpdateReviewStatus = z.infer<typeof updateReviewStatusSchema>;
export type CreatePost = z.infer<typeof createPostSchema>;
export type UpdatePost = z.infer<typeof updatePostSchema>;
export type PostsQuery = z.infer<typeof postsQuerySchema>;
export type Location = z.infer<typeof locationSchema>;
export type UpdateLocation = z.infer<typeof updateLocationSchema>;
export type SyncRequest = z.infer<typeof syncRequestSchema>;
export type ConnectAccount = z.infer<typeof connectAccountSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
