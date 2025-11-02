import { z } from 'zod';

/**
 * Validation schemas for GMB Post APIs
 */

export const createPostSchema = z.object({
  locationId: z.string().uuid('Invalid location ID format'),
  content: z.string().min(1, 'Content is required').max(1500, 'Content too long'),
  title: z.string().max(100, 'Title too long').optional(),
  mediaUrl: z.string().url('Invalid URL format').optional(),
  callToAction: z.enum(['LEARN_MORE', 'CALL', 'BOOK', 'ORDER_ONLINE', 'SHOP_NOW']).optional(),
  callToActionUrl: z.string().url('Invalid URL format').optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  postType: z.enum(['whats_new', 'event', 'offer']).default('whats_new'),
  aiGenerated: z.boolean().optional(),
  // Event fields
  eventTitle: z.string().max(100).optional(),
  eventStartDate: z.string().datetime().optional(),
  eventEndDate: z.string().datetime().optional(),
  // Offer fields
  offerTitle: z.string().max(100).optional(),
  couponCode: z.string().max(50).optional(),
  redeemUrl: z.string().url().optional(),
  terms: z.string().max(1000).optional(),
});

export const publishPostSchema = z.object({
  postId: z.string().uuid('Invalid post ID format'),
});

export const syncSchema = z.object({
  accountId: z.string().uuid('Invalid account ID format'),
  syncType: z.enum(['full', 'incremental']).default('full'),
});

export const updateLocationSchema = z.object({
  locationId: z.string().uuid('Invalid location ID format'),
  locationName: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
  phone: z.string().max(20).optional(),
  website: z.string().url().optional(),
  category: z.string().max(100).optional(),
});

