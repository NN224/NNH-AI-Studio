// ============================================================================
// Sync Job Types for Event-Driven Queue Architecture
// ============================================================================

/**
 * Job types for the micro-jobs architecture.
 * Each job type represents a discrete, idempotent sync operation.
 */
export type SyncJobType =
  | "discovery_locations" // Fetch locations and fan out child jobs
  | "sync_reviews" // Sync reviews for a specific location
  | "sync_insights" // Sync insights/metrics for a specific location
  | "sync_posts" // Sync posts for a specific location
  | "sync_media"; // Sync media for a specific location

/**
 * Metadata for sync jobs stored in sync_queue.metadata
 * Contains all context needed to process the job independently.
 */
export interface SyncJobMetadata {
  /** The type of sync job - determines processing logic */
  job_type: SyncJobType;
  /** The user who owns this sync job */
  userId: string;
  /** The GMB account ID (UUID from gmb_accounts table) */
  accountId: string;
  /** The location database ID (UUID from gmb_locations table) - optional for discovery */
  locationId?: string;
  /** The Google location resource name (e.g., "accounts/xxx/locations/yyy") */
  googleLocationId?: string;
  /** The Google account resource name (e.g., "accounts/xxx") */
  googleAccountId?: string;
  /** Parent job ID for tracking job chains */
  parentJobId?: string;
  /** Additional context for the job */
  context?: Record<string, unknown>;
}

// ============================================================================
// Location Data Types
// ============================================================================

// Google OpenInfo status values: OPEN, CLOSED_PERMANENTLY, CLOSED_TEMPORARILY
// Also legacy/metadata status: verified, pending, suspended
export type LocationStatus =
  | "OPEN"
  | "CLOSED_PERMANENTLY"
  | "CLOSED_TEMPORARILY"
  | "verified"
  | "pending"
  | "suspended"
  | string // Allow other Google-provided values
  | null;

export interface LocationData {
  gmb_account_id: string;
  user_id: string;
  location_id: string;
  normalized_location_id: string;
  location_name: string;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  category?: string | null;
  rating?: number | null;
  review_count?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  profile_completeness?: number | null;
  is_active: boolean;
  status?: LocationStatus;
  metadata?: Record<string, unknown> | null;
  last_synced_at: string;
  last_sync?: string; // Alternative column name for compatibility
}

export interface ReviewData {
  user_id: string;
  location_id?: string;
  google_location_id: string;
  gmb_account_id?: string;
  review_id: string;
  reviewer_name?: string | null;
  reviewer_display_name?: string | null;
  reviewer_photo?: string | null;
  rating: number;
  review_text?: string | null;
  review_date: string;
  reply_text?: string | null;
  reply_date?: string | null;
  has_reply: boolean;
  status: "pending" | "replied" | "responded" | "flagged" | "archived";
  sentiment?: "positive" | "neutral" | "negative" | null;
  google_name?: string | null;
  review_url?: string | null;
}

export interface QuestionData {
  user_id: string;
  location_id?: string;
  google_location_id: string;
  gmb_account_id?: string;
  question_id: string;
  author_name?: string | null;
  author_display_name?: string | null;
  author_profile_photo_url?: string | null;
  author_type?: string | null;
  question_text: string;
  question_date: string;
  answer_text?: string | null;
  answer_date?: string | null;
  answer_author?: string | null;
  answer_id?: string | null;
  upvote_count?: number | null;
  total_answer_count?: number | null;
  status: "unanswered" | "answered" | "pending";
  google_resource_name?: string | null;
}

export interface PostData {
  user_id: string;
  location_id: string;
  gmb_account_id: string;
  post_id?: string | null;
  provider_post_id?: string | null;
  title?: string | null;
  content: string;
  media_url?: string | null;
  post_type: "whats_new" | "event" | "offer" | "product";
  status: "draft" | "queued" | "published" | "failed";
  published_at?: string | null;
  scheduled_at?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface MediaData {
  user_id: string;
  location_id: string;
  gmb_account_id: string;
  external_media_id: string;
  media_format: "PHOTO" | "VIDEO";
  source_url?: string | null;
  google_url?: string | null;
  thumbnail_url?: string | null;
  description?: string | null;
  location_association?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}
