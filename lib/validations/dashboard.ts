import { z } from "zod"

export const LocationSchema = z.object({
  location_name: z.string().min(1, "Location name is required").max(100, "Location name too long"),
  address: z.string().max(200, "Address too long").optional(),
  category: z.string().max(50, "Category name too long").optional(),
  phone: z.string().regex(/^[\d\s\-+()]*$/, "Invalid phone number format").max(20).optional(),
})

export const UpdateLocationSchema = z.object({
  location_name: z.string().min(1).max(100).optional(),
  address: z.string().max(200).optional(),
  phone: z.string().regex(/^[\d\s\-+()]*$/).max(20).optional(),
  category: z.string().max(50).optional(),
  is_active: z.boolean().optional(),
})

export const ReviewReplySchema = z.object({
  reply: z.string().min(10, "Reply must be at least 10 characters").max(1000, "Reply too long"),
  reviewId: z.string().uuid("Invalid review ID"),
})

export const ReviewStatusSchema = z.object({
  status: z.enum(["new", "in_progress", "responded"], {
    errorMap: () => ({ message: "Invalid status value" }),
  }),
  reviewId: z.string().uuid("Invalid review ID"),
})

export type LocationInput = z.infer<typeof LocationSchema>
export type UpdateLocationInput = z.infer<typeof UpdateLocationSchema>
export type ReviewReplyInput = z.infer<typeof ReviewReplySchema>
export type ReviewStatusInput = z.infer<typeof ReviewStatusSchema>
