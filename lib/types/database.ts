export interface GmbAccount {
  id: string
  user_id: string
  account_id: string
  account_name: string
  email?: string
  google_account_id?: string
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
  normalized_location_id: string
  location_name: string
  address?: string
  phone?: string
  website?: string
  category?: string
  type?: string
  rating?: number | null
  review_count?: number
  response_rate?: number
  is_active: boolean
  is_syncing?: boolean
  status?: 'verified' | 'pending' | 'suspended'
  latitude?: number | null
  longitude?: number | null
  business_hours?: Record<string, any>
  metadata: Record<string, any>
  ai_insights?: string
  created_at: string
  updated_at: string
  // New columns from migration
  description?: string
  short_description?: string
  additional_categories?: string[]
  from_the_business?: string[]
  cover_photo_url?: string
  menu_url?: string
  booking_url?: string
  order_url?: string
  appointment_url?: string
  opening_date?: string
  service_area_enabled?: boolean
  profile_completeness?: number
  account_id?: string
  location_id_external?: string
  regularhours?: Record<string, any>
  health_score?: number
  last_synced_at?: string
  latlng?: string
}

export interface GMBLocationWithRating {
  id: string
  gmb_account_id: string
  user_id: string
  location_id: string
  normalized_location_id: string
  location_name: string
  address?: string
  phone?: string
  website?: string
  category?: string
  type?: string
  is_active: boolean
  is_syncing?: boolean
  status?: 'verified' | 'pending' | 'suspended'
  latitude?: number | null
  longitude?: number | null
  business_hours?: Record<string, any>
  metadata: Record<string, any>
  ai_insights?: string
  created_at: string
  updated_at: string
  rating: number
  reviews_count: number
  last_review_date?: string
  // New columns from migration
  description?: string
  short_description?: string
  additional_categories?: string[]
  from_the_business?: string[]
  cover_photo_url?: string
  menu_url?: string
  booking_url?: string
  order_url?: string
  appointment_url?: string
  opening_date?: string
  service_area_enabled?: boolean
  profile_completeness?: number
  account_id?: string
  location_id_external?: string
  regularhours?: Record<string, any>
  health_score?: number
  last_synced_at?: string
  latlng?: string
}

export interface GMBReview {
  id: string
  location_id: string
  user_id: string
  gmb_account_id?: string
  external_review_id?: string
  review_id?: string
  reviewer_name: string
  rating: number
  review_text?: string
  review_date?: string
  reply_text?: string
  reply_date?: string
  review_reply?: string
  replied_at?: string
  has_reply?: boolean
  has_response?: boolean
  response_text?: string
  responded_at?: string
  ai_sentiment?: "positive" | "neutral" | "negative"
  ai_generated_response?: string
  ai_suggested_reply?: string
  status?: "new" | "in_progress" | "responded"
  created_at: string
  updated_at: string
  // Join fields
  location_name?: string
  location_address?: string
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

export interface ClientProfile {
  id: string
  user_id: string
  brand_name?: string
  logo_url?: string
  cover_image_url?: string
  primary_color: string
  secondary_color: string
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

export interface ContentGeneration {
  id: string
  user_id: string
  content_type: 'posts' | 'responses' | 'descriptions' | 'faqs'
  prompt: string
  tone: string
  provider: string
  generated_content: string
  metadata: Record<string, any>
  created_at: string
}

export interface GMBQuestion {
  id: string
  location_id: string
  user_id: string
  gmb_account_id?: string
  question_id?: string
  external_question_id?: string
  question_text: string
  asked_at?: string
  author_name?: string
  author_display_name?: string
  author_profile_photo_url?: string
  author_type?: string
  answer_text?: string
  answered_at?: string
  answered_by?: string
  answer_status?: 'unanswered' | 'answered' | 'deleted' | 'pending' | 'draft'
  answer_id?: string
  upvote_count?: number
  total_answer_count?: number
  ai_suggested_answer?: string
  ai_confidence_score?: number
  ai_answer_generated?: boolean
  ai_category?: string
  status?: 'pending' | 'answered' | 'flagged' | 'archived'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  question_url?: string
  google_resource_name?: string
  internal_notes?: string
  created_at: string
  updated_at: string
  // Join fields
  location_name?: string
  location_address?: string
}

export interface GMBPost {
  id: string
  user_id: string
  location_id: string
  provider_post_id?: string
  title?: string
  content: string
  media_url?: string
  call_to_action?: string
  call_to_action_url?: string
  post_type: 'whats_new' | 'event' | 'offer' | 'product'
  status: 'draft' | 'queued' | 'published' | 'failed'
  scheduled_at?: string
  published_at?: string
  error_message?: string
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
  // Join fields
  location_name?: string
  location_address?: string
}
