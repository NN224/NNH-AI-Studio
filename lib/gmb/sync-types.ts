export interface LocationData {
  gmb_account_id: string
  user_id: string
  location_id: string
  normalized_location_id: string
  location_name: string
  address?: string | null
  phone?: string | null
  website?: string | null
  category?: string | null
  rating?: number | null
  review_count?: number | null
  latitude?: number | null
  longitude?: number | null
  profile_completeness?: number | null
  is_active: boolean
  status?: 'verified' | 'pending' | 'suspended' | null
  metadata?: Record<string, any> | null
  last_synced_at: string
}

export interface ReviewData {
  user_id: string
  location_id?: string
  google_location_id: string
  gmb_account_id?: string
  review_id: string
  reviewer_name?: string | null
  reviewer_display_name?: string | null
  reviewer_photo?: string | null
  rating: number
  review_text?: string | null
  review_date: string
  reply_text?: string | null
  reply_date?: string | null
  has_reply: boolean
  status: 'pending' | 'replied' | 'responded' | 'flagged' | 'archived'
  sentiment?: 'positive' | 'neutral' | 'negative' | null
  google_name?: string | null
  review_url?: string | null
}

export interface QuestionData {
  user_id: string
  location_id?: string
  google_location_id: string
  gmb_account_id?: string
  question_id: string
  author_name?: string | null
  author_display_name?: string | null
  author_profile_photo_url?: string | null
  author_type?: string | null
  question_text: string
  question_date: string
  answer_text?: string | null
  answer_date?: string | null
  answer_author?: string | null
  answer_id?: string | null
  upvote_count?: number | null
  total_answer_count?: number | null
  status: 'unanswered' | 'answered' | 'pending'
  google_resource_name?: string | null
}

