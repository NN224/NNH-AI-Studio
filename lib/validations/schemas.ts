import { z } from 'zod'

const HTML_REGEX = /<[^>]*>/gi
const SAFE_SEARCH_REGEX = /^[\w\s\-.,@#()!?/]+$/i
const PHONE_REGEX = /^[0-9+\-().\s]{7,20}$/

const noHtml = (value: string) => !HTML_REGEX.test(value)

const sanitizedString = (min: number, max: number, message: string) =>
  z
    .string({
      required_error: message,
    })
    .trim()
    .min(min, message)
    .max(max, message)
    .refine(noHtml, { message: 'HTML content is not allowed' })

export const searchSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, 'البحث مطلوب / Search query is required')
    .max(200, 'Query too long')
    .refine((val) => SAFE_SEARCH_REGEX.test(val), {
      message: 'Search query contains invalid characters',
    }),
})

export const reviewReplySchema = z.object({
  reviewId: z.string().uuid('Review ID must be a valid UUID'),
  locationId: z.string().uuid().optional(),
  replyText: sanitizedString(1, 4096, 'Reply text is required'),
})

export const questionAnswerSchema = z.object({
  answerText: sanitizedString(1, 1000, 'Answer text is required'),
  isDraft: z.boolean().optional(),
})

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(10).max(100).default(25),
})

export const locationUpdateSchema = z
  .object({
    name: sanitizedString(1, 120, 'Name is required').optional(),
    address: sanitizedString(1, 255, 'Address is required').optional(),
    phone: z
      .string()
      .trim()
      .regex(PHONE_REGEX, 'Phone number format is invalid')
      .optional()
      .or(z.literal(null)),
    website: z
      .string()
      .trim()
      .url('Website must be a valid URL')
      .max(2048, 'Website URL is too long')
      .optional()
      .or(z.literal(null)),
    category: sanitizedString(1, 120, 'Category is required').optional().or(z.literal(null)),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field (name, address, phone, website, category) is required',
  })

export const questionFilterSchema = paginationSchema.extend({
  locationId: z.string().uuid().optional(),
  status: z.enum(['pending', 'answered', 'draft']).optional(),
  search: z
    .string()
    .trim()
    .max(200)
    .optional()
    .refine((val) => !val || SAFE_SEARCH_REGEX.test(val), {
      message: 'Search query contains invalid characters',
    }),
})

