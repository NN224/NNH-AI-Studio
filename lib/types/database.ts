export interface GmbAccount {
  id: string
  user_id: string
  account_id: string
  account_name: string
  email?: string
  access_token?: string
  refresh_token?: string
  token_expires_at?: string
  is_active: boolean
  last_sync?: string
  settings: Record<string, any>
  created_at: string
  updated_at: string
  total_locations?: number
}

export interface GMBLocation {
  id: string
  gmb_account_id: string
  user_id: string
  location_id: string
  location_name: string
  address?: string
  phone?: string
  website?: string
  category?: string
  rating: number
  review_count: number
  response_rate: number
  is_active: boolean
  is_syncing: boolean
  metadata: Record<string, any>
  ai_insights?: string
  created_at: string
  updated_at: string
}

export interface GMBLocationWithRating {
  id: string
  gmb_account_id: string
  user_id: string
  location_id: string
  location_name: string
  address?: string
  phone?: string
  website?: string
  category?: string
  is_active: boolean
  is_syncing: boolean
  metadata: Record<string, any>
  ai_insights?: string
  created_at: string
  updated_at: string
  rating: number
  reviews_count: number
  last_review_date?: string
}

export interface GMBReview {
  id: string
  location_id: string
  user_id: string
  review_id: string
  reviewer_name: string
  rating: number
  comment?: string
  review_reply?: string
  replied_at?: string
  ai_suggested_reply?: string
  ai_sentiment?: "positive" | "neutral" | "negative"
  status: "new" | "in_progress" | "responded"
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  email?: string
  full_name?: string
  avatar_url?: string
  role: "user" | "admin" | "owner"
  settings: Record<string, any>
  created_at: string
  updated_at: string
}

export interface ActivityLog {
  id: string
  user_id: string
  activity_type: string
  activity_message: string
  metadata: Record<string, any>
  actionable: boolean
  created_at: string
}
