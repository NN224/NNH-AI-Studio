# 🔷 NNH AI Studio - Complete TypeScript Interfaces

> **Generated:** November 26, 2025
> **Source:** Database schema analysis + `lib/types/database.types.ts`
> **Total Interfaces:** 25 tables + 5 views + Utility types
> **Framework:** TypeScript 5.9.3 (Strict mode)

---

## 📋 Table of Contents

1. [Core Interfaces](#core-interfaces)
2. [Performance & Metrics](#performance--metrics)
3. [AI & Automation](#ai--automation)
4. [Sync System](#sync-system)
5. [OAuth & Auth](#oauth--auth)
6. [Logging & Monitoring](#logging--monitoring)
7. [Utility Interfaces](#utility-interfaces)
8. [View Interfaces](#view-interfaces)
9. [Helper Types](#helper-types)
10. [Supabase Types](#supabase-types)

---

## 🎯 Core Interfaces

### Profile

```typescript
/**
 * User profile information
 * Table: profiles
 * Size: ~168 kB
 */
export interface Profile {
  id: string; // UUID, PK, FK → auth.users
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  provider_sub: string | null;
  user_id: string | null;
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
  last_login: string | null;
}

// Insert type (all optional except required fields)
export type ProfileInsert = {
  id?: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  provider_sub?: string | null;
  user_id?: string | null;
  created_at?: string;
  updated_at?: string;
  last_login?: string | null;
};

// Update type (all optional)
export type ProfileUpdate = Partial<ProfileInsert>;
```

---

### GMBAccount

```typescript
/**
 * Google My Business account connections
 * Table: gmb_accounts
 * Size: ~312 kB
 * Relationships: Parent of gmb_locations
 */
export interface GMBAccount {
  id: string; // UUID, PK
  user_id: string; // FK → auth.users
  account_id: string; // Google account ID (unique)
  account_name: string | null;
  email: string | null;
  google_account_id: string | null;
  access_token: string | null; // Encrypted
  refresh_token: string | null; // Encrypted
  token_expires_at: string | null; // ISO 8601
  is_active: boolean;
  last_sync: string | null; // ISO 8601
  data_retention_days: number;
  delete_on_disconnect: boolean;
  disconnected_at: string | null;
  settings: Record<string, any> | null; // JSONB
  created_at: string;
  updated_at: string;
}

export type GMBAccountInsert = {
  id?: string;
  user_id: string;
  account_id: string;
  account_name?: string | null;
  email?: string | null;
  google_account_id?: string | null;
  access_token?: string | null;
  refresh_token?: string | null;
  token_expires_at?: string | null;
  is_active?: boolean;
  last_sync?: string | null;
  data_retention_days?: number;
  delete_on_disconnect?: boolean;
  disconnected_at?: string | null;
  settings?: Record<string, any> | null;
  created_at?: string;
  updated_at?: string;
};

export type GMBAccountUpdate = Partial<GMBAccountInsert>;
```

---

### GMBLocation

```typescript
/**
 * Business locations from Google My Business
 * Table: gmb_locations
 * Size: ~2.8 MB (largest table)
 * Relationships: Child of gmb_accounts, Parent of reviews/questions/posts/media
 */
export interface GMBLocation {
  // IDs
  id: string; // UUID, PK
  gmb_account_id: string; // FK → gmb_accounts
  user_id: string; // FK → auth.users
  location_id: string; // Google location ID (unique)
  normalized_location_id: string | null;
  location_id_external: string | null;

  // Basic Info
  location_name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  category: string | null;
  additional_categories: string[] | null;

  // Coordinates
  latitude: number | null; // Decimal(10,7)
  longitude: number | null; // Decimal(10,7)
  latlng: string | null;

  // Business Details
  description: string | null;
  short_description: string | null;
  opening_date: string | null;
  business_hours: Record<string, any> | null; // JSONB
  regularhours: Record<string, any> | null; // JSONB
  service_area_enabled: boolean;

  // URLs
  appointment_url: string | null;
  booking_url: string | null;
  menu_url: string | null;
  order_url: string | null;

  // Media
  cover_photo_url: string | null;

  // Metrics
  rating: number | null; // Decimal(3,2)
  review_count: number;
  response_rate: number | null; // Decimal(5,2)
  calculated_response_rate: number | null; // Decimal(5,2)
  profile_completeness: number | null; // Decimal(5,2)
  health_score: number | null; // Decimal(5,2)

  // AI Features
  ai_insights: string | null;
  from_the_business: string[] | null;

  // Status
  status: string | null;
  type: string | null;
  is_active: boolean;
  is_archived: boolean;
  archived_at: string | null;
  is_syncing: boolean;

  // Metadata
  metadata: Record<string, any> | null; // JSONB - Full Google API response
  account_id: string | null;

  // Timestamps
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export type GMBLocationInsert = {
  id?: string;
  gmb_account_id: string;
  user_id: string;
  location_id: string;
  location_name: string;
  // ... all other fields optional
};

export type GMBLocationUpdate = Partial<GMBLocationInsert>;

// Helper type for location with related data
export type GMBLocationWithRelations = GMBLocation & {
  gmb_account?: GMBAccount;
  reviews?: GMBReview[];
  questions?: GMBQuestion[];
  posts?: GMBPost[];
  media?: GMBMedia[];
};
```

---

### GMBReview

```typescript
/**
 * Customer reviews from Google My Business
 * Table: gmb_reviews
 * Size: ~5.8 MB (2nd largest)
 * Relationships: Child of gmb_locations
 */
export interface GMBReview {
  // IDs
  id: string; // UUID, PK
  user_id: string; // FK → auth.users
  location_id: string; // FK → gmb_locations
  gmb_account_id: string | null; // FK → gmb_accounts
  external_review_id: string; // Google review ID (unique)
  review_id: string | null;

  // Reviewer Info
  reviewer_name: string | null;
  reviewer_display_name: string | null;
  reviewer_profile_photo_url: string | null;

  // Review Content
  comment: string | null;
  review_text: string | null;
  rating: number; // 1-5 (CHECK constraint)

  // Reply Info
  reply_text: string | null;
  review_reply: string | null;
  response: string | null;
  response_text: string | null;
  has_reply: boolean;
  has_response: boolean;
  reply_timestamp: string | null;
  reply_date: string | null;
  replied_at: string | null;
  responded_at: string | null;

  // AI Features
  ai_sentiment: string | null; // 'positive' | 'neutral' | 'negative'
  ai_sentiment_score: number | null; // Decimal(3,2)
  ai_sentiment_analysis: Record<string, any> | null; // JSONB
  ai_suggested_reply: string | null;
  ai_generated_response: string | null;
  ai_reply_generated: boolean;
  ai_confidence_score: number | null; // Decimal(3,2)
  ai_generated_at: string | null;
  ai_sent_at: string | null;

  // Auto Reply
  auto_reply_enabled: boolean;
  auto_reply_status: string | null;
  response_priority: string | null;

  // Flags & Status
  status: string | null;
  flagged_reason: string | null;
  internal_notes: string | null;
  tags: string[] | null;

  // Privacy
  is_anonymized: boolean;
  is_verified_purchase: boolean;
  is_archived: boolean;
  archived_at: string | null;

  // Metadata
  metadata: Record<string, any> | null; // JSONB
  google_my_business_name: string | null;
  account_id: string | null;

  // Timestamps
  review_date: string | null;
  review_timestamp: string | null;
  review_url: string | null;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export type GMBReviewInsert = {
  id?: string;
  user_id: string;
  location_id: string;
  external_review_id: string;
  rating: number;
  // ... other fields optional
};

export type GMBReviewUpdate = Partial<GMBReviewInsert>;

// Helper types
export type ReviewSentiment = "positive" | "neutral" | "negative";

export interface ReviewWithLocation extends GMBReview {
  location?: GMBLocation;
}
```

---

### GMBQuestion

```typescript
/**
 * Q&A from Google My Business
 * Table: gmb_questions
 * Size: ~544 kB
 * Relationships: Child of gmb_locations
 */
export interface GMBQuestion {
  // IDs
  id: string; // UUID, PK
  user_id: string; // FK → auth.users
  location_id: string; // FK → gmb_locations
  gmb_account_id: string; // FK → gmb_accounts
  external_question_id: string | null; // Google question ID (unique)
  question_id: string | null;
  google_resource_name: string | null;

  // Question Content
  question_text: string;
  question_url: string | null;

  // Author Info
  author_name: string | null;
  author_display_name: string | null;
  author_profile_photo_url: string | null;
  author_type: string | null;

  // Answer Info
  answer_id: string | null;
  answer_text: string | null;
  answered_at: string | null;
  answered_by: string | null;
  answer_status: string; // 'pending' | 'answered'

  // AI Features
  ai_suggested_answer: string | null;
  ai_answer_generated: boolean;
  ai_confidence_score: number | null; // Decimal(3,2)
  ai_category: string | null;

  // Engagement
  upvote_count: number;
  total_answer_count: number;

  // Status & Flags
  status: string | null;
  priority: string | null;
  is_featured: boolean;
  is_hidden: boolean;
  is_archived: boolean;
  archived_at: string | null;

  // Notes
  internal_notes: string | null;

  // Language
  language_code: string; // Default: 'en'

  // Metadata
  metadata: Record<string, any> | null; // JSONB

  // Timestamps
  asked_at: string | null;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export type GMBQuestionInsert = {
  id?: string;
  user_id: string;
  location_id: string;
  gmb_account_id: string;
  question_text: string;
  // ... other fields optional
};

export type GMBQuestionUpdate = Partial<GMBQuestionInsert>;

// Helper types
export type QuestionStatus = "pending" | "answered";

export interface QuestionWithLocation extends GMBQuestion {
  location?: GMBLocation;
}
```

---

### GMBPost

```typescript
/**
 * Posts from Google My Business
 * Table: gmb_posts
 * Size: ~120 kB
 */
export interface GMBPost {
  // IDs
  id: string; // UUID, PK
  user_id: string; // FK → auth.users
  location_id: string; // FK → gmb_locations
  post_id: string | null; // Google post ID
  provider_post_id: string | null;

  // Content
  title: string | null;
  content: string;
  post_type: string | null; // 'STANDARD' | 'EVENT' | 'OFFER'

  // Media
  media_url: string | null;

  // Call to Action
  call_to_action: string | null;
  call_to_action_url: string | null;
  cta_type: string | null;
  cta_url: string | null;

  // Event/Offer Dates
  start_date: string | null;
  end_date: string | null;

  // Scheduling
  scheduled_at: string | null;
  published_at: string | null;

  // Status
  status: string; // 'draft' | 'scheduled' | 'published' | 'expired'
  error_message: string | null;

  // Archive
  is_archived: boolean;
  archived_at: string | null;

  // Metadata
  metadata: Record<string, any> | null; // JSONB

  // Timestamps
  created_at: string;
  updated_at: string;
}

export type GMBPostInsert = {
  id?: string;
  user_id: string;
  location_id: string;
  content: string;
  status?: string;
  // ... other fields optional
};

export type GMBPostUpdate = Partial<GMBPostInsert>;

// Helper types
export type PostType = "STANDARD" | "EVENT" | "OFFER";
export type PostStatus = "draft" | "scheduled" | "published" | "expired";
```

---

### GMBMedia

```typescript
/**
 * Photos and videos from Google My Business
 * Table: gmb_media
 * Size: ~4.1 MB (3rd largest)
 */
export interface GMBMedia {
  // IDs
  id: string; // UUID, PK
  user_id: string; // FK → auth.users
  location_id: string; // FK → gmb_locations
  gmb_account_id: string; // FK → gmb_accounts
  external_media_id: string; // Google media ID

  // Media Info
  type: string | null; // 'PHOTO' | 'VIDEO'
  url: string | null;
  thumbnail_url: string | null;

  // Metadata
  metadata: Record<string, any> | null; // JSONB

  // Timestamps
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export type GMBMediaInsert = {
  id?: string;
  user_id: string;
  location_id: string;
  gmb_account_id: string;
  external_media_id: string;
  // ... other fields optional
};

export type GMBMediaUpdate = Partial<GMBMediaInsert>;

// Helper type
export type MediaType = "PHOTO" | "VIDEO";
```

---

## 📈 Performance & Metrics

### GMBPerformanceMetric

```typescript
/**
 * Daily performance metrics from Google
 * Table: gmb_performance_metrics
 * Size: ~1.0 MB
 */
export interface GMBPerformanceMetric {
  id: string; // UUID, PK
  user_id: string; // FK → auth.users
  location_id: string; // FK → gmb_locations
  gmb_account_id: string; // FK → gmb_accounts

  // Metric Info
  metric_date: string; // DATE (YYYY-MM-DD)
  metric_type: string; // 'VIEWS_SEARCH' | 'VIEWS_MAPS' | 'ACTIONS_WEBSITE' | etc.
  metric_value: number; // Decimal
  sub_entity_type: Record<string, any> | null; // JSONB

  // Metadata
  metadata: Record<string, any> | null; // JSONB

  // Timestamps
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export type GMBPerformanceMetricInsert = {
  id?: string;
  user_id: string;
  location_id: string;
  gmb_account_id: string;
  metric_date: string;
  metric_type: string;
  metric_value?: number;
  // ... other fields optional
};

// Unique constraint: (location_id, metric_date, metric_type)
```

---

### GMBSearchKeyword

```typescript
/**
 * Search keywords that led to business discovery
 * Table: gmb_search_keywords
 * Size: ~6.3 MB (LARGEST table!)
 */
export interface GMBSearchKeyword {
  id: string; // UUID, PK
  user_id: string; // FK → auth.users
  location_id: string; // FK → gmb_locations
  gmb_account_id: string; // FK → gmb_accounts

  // Keyword Info
  search_keyword: string;
  month_year: string; // Format: 'YYYY-MM'
  impressions_count: number;
  threshold_value: number | null;

  // Metadata
  metadata: Record<string, any> | null; // JSONB

  // Timestamps
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

// Unique constraint: (location_id, search_keyword, month_year)
```

---

### GMBMetric

```typescript
/**
 * Aggregate sync performance metrics
 * Table: gmb_metrics
 * Size: ~96 kB
 */
export interface GMBMetric {
  id: string; // UUID, PK
  user_id: string; // FK → auth.users
  gmb_account_id: string; // FK → gmb_accounts

  // Metric Info
  phase: string; // 'locations' | 'reviews' | 'questions' | 'media' | 'performance' | 'keywords'
  runs_count: number;
  total_duration_ms: number; // BIGINT
  total_items_count: number;
  avg_duration_ms: number | null; // Decimal

  // Timestamps
  created_at: string;
  updated_at: string;
}

// Unique constraint: (gmb_account_id, phase)
```

---

## 🤖 AI & Automation

### AIRequest

```typescript
/**
 * AI usage tracking for billing and analytics
 * Table: ai_requests
 * Size: ~128 kB
 */
export interface AIRequest {
  id: string; // UUID, PK
  user_id: string; // FK → auth.users
  location_id: string | null; // FK → gmb_locations (optional)

  // Provider Info
  provider: string; // 'anthropic' | 'openai' | 'google' | 'groq' | 'deepseek'
  model: string; // 'claude-3-5-sonnet' | 'gpt-4o' | etc.
  feature: string; // 'review_reply' | 'question_answer' | 'content_generation'

  // Usage Stats
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  cost_usd: number | null; // Decimal(10,6)
  latency_ms: number | null;

  // Status
  success: boolean;

  // Timestamp
  created_at: string;
}

export type AIRequestInsert = {
  id?: string;
  user_id: string;
  provider: string;
  model: string;
  feature: string;
  // ... usage stats optional
};

// Helper types
export type AIProvider =
  | "anthropic"
  | "openai"
  | "google"
  | "groq"
  | "deepseek";
export type AIFeature =
  | "review_reply"
  | "question_answer"
  | "content_generation"
  | "sentiment_analysis";
```

---

### AISetting

```typescript
/**
 * User AI provider configurations
 * Table: ai_settings
 * Size: ~104 kB
 */
export interface AISetting {
  id: string; // UUID, PK
  user_id: string; // FK → auth.users

  // Provider Info
  provider: string; // 'anthropic' | 'openai' | 'google' | etc.
  api_key: string; // Encrypted
  priority: number; // Lower = higher priority
  is_active: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;
}

// Unique constraint: (user_id, provider)

export type AISettingInsert = {
  id?: string;
  user_id: string;
  provider: string;
  api_key: string;
  priority?: number;
  is_active?: boolean;
};

export type AISettingUpdate = Partial<AISettingInsert>;
```

---

## 🔄 Sync System

### SyncQueue

```typescript
/**
 * Job queue for async sync operations
 * Table: sync_queue
 * Size: ~192 kB
 */
export interface SyncQueue {
  id: string; // UUID, PK
  user_id: string; // FK → auth.users
  account_id: string; // FK → gmb_accounts

  // Job Info
  sync_type: "full" | "incremental";
  priority: number; // Default: 0

  // Status
  status: "pending" | "processing" | "completed" | "failed";
  attempts: number;
  max_attempts: number; // Default: 3
  error_message: string | null;

  // Metadata
  metadata: Record<string, any> | null; // JSONB

  // Timestamps
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type SyncQueueInsert = {
  id?: string;
  user_id: string;
  account_id: string;
  sync_type?: "full" | "incremental";
  priority?: number;
  scheduled_at?: string;
  // ... other fields optional
};

// Helper types
export type SyncType = "full" | "incremental";
export type SyncStatus = "pending" | "processing" | "completed" | "failed";
```

---

### SyncStatus

```typescript
/**
 * Real-time sync progress tracking
 * Table: sync_status
 * Size: ~112 kB
 */
export interface SyncStatus {
  id: string; // UUID, PK
  user_id: string; // FK → auth.users
  account_id: string; // FK → gmb_accounts

  // Status Info
  stage: string; // 'locations' | 'reviews' | 'questions' | etc.
  status: "running" | "completed" | "error";
  progress: number; // 0-100 (CHECK constraint)
  message: string | null;
  error: string | null;

  // Metadata
  metadata: Record<string, any> | null; // JSONB

  // Timestamps
  created_at: string;
  updated_at: string;
}

// Helper type
export type SyncStage = "running" | "completed" | "error";
```

---

### GMBSyncLog

```typescript
/**
 * Detailed phase-by-phase sync logging
 * Table: gmb_sync_logs
 * Size: ~680 kB
 */
export interface GMBSyncLog {
  id: string; // UUID, PK
  user_id: string; // FK → auth.users
  gmb_account_id: string; // FK → gmb_accounts

  // Phase Info
  phase: string; // 'locations' | 'reviews' | 'questions' | 'media' | 'performance' | 'keywords'
  status: string; // 'started' | 'completed' | 'failed'

  // Metrics
  counts: Record<string, number> | null; // JSONB - { synced: X, failed: Y }
  duration_ms: number | null; // BIGINT
  error: string | null;

  // Metadata
  metadata: Record<string, any> | null; // JSONB

  // Timestamps
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

// Helper type
export interface SyncLogCounts {
  synced?: number;
  failed?: number;
  skipped?: number;
}
```

---

## 🔐 OAuth & Auth

### OAuthState

```typescript
/**
 * OAuth flow temporary state management
 * Table: oauth_states
 * Size: ~160 kB
 */
export interface OAuthState {
  id: string; // UUID, PK
  user_id: string | null; // FK → auth.users (nullable for pre-auth)

  // State Info
  state: string; // Unique random state (unique constraint)
  expires_at: string; // ISO 8601
  used: boolean;

  // Timestamp
  created_at: string;
}

export type OAuthStateInsert = {
  id?: string;
  user_id?: string | null;
  state: string;
  expires_at: string;
  used?: boolean;
};
```

---

### OAuthToken

```typescript
/**
 * OAuth token storage (YouTube, etc.)
 * Table: oauth_tokens
 * Size: ~128 kB
 */
export interface OAuthToken {
  id: string; // UUID, PK
  user_id: string; // FK → auth.users

  // Provider Info
  provider: string; // 'youtube' | 'google' | etc.

  // Tokens (Encrypted)
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null; // ISO 8601
  scope: string | null;

  // Metadata
  metadata: Record<string, any> | null; // JSONB

  // Timestamps
  created_at: string;
  updated_at: string;
}

// Unique constraint: (user_id, provider)

export type OAuthTokenInsert = {
  id?: string;
  user_id: string;
  provider: string;
  access_token?: string | null;
  refresh_token?: string | null;
  expires_at?: string | null;
  scope?: string | null;
  metadata?: Record<string, any> | null;
};
```

---

### PerformanceMetric

```typescript
/**
 * Application performance metrics tracking
 * Table: performance_metrics
 * Size: ~256 kB
 */
export interface PerformanceMetric {
  id: string; // UUID, PK
  user_id: string | null; // FK → auth.users

  // Metric Info
  name: string; // 'api_call', 'page_load', 'web_vitals_fcp', etc.
  value: number; // Duration in ms, count, size in bytes, etc.
  unit: string; // 'ms', 'count', 'bytes', etc.

  // Metadata
  metadata: Record<string, any> | null; // JSONB (additional context)

  // Timestamp
  timestamp: string; // ISO 8601
}

export type PerformanceMetricInsert = {
  id?: string;
  user_id?: string | null;
  name: string;
  value: number;
  unit: string;
  metadata?: Record<string, any> | null;
  timestamp?: string;
};

export type PerformanceMetricUpdate = Partial<PerformanceMetricInsert>;
```

---

### RateLimitRequest

```typescript
/**
 * API rate limiting tracking per user/endpoint
 * Table: rate_limit_requests
 * Size: ~384 kB
 */
export interface RateLimitRequest {
  id: string; // UUID, PK
  user_id: string; // User identifier (UUID or IP address)

  // Request Info
  action: string; // Action performed
  endpoint: string | null; // API endpoint path
  ip_address: string | null; // INET type (IP address)
  user_agent: string | null; // Browser user agent

  // Timestamp
  created_at: string; // ISO 8601
}

export type RateLimitRequestInsert = {
  id?: string;
  user_id: string;
  action: string;
  endpoint?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at?: string;
};

export type RateLimitRequestUpdate = Partial<RateLimitRequestInsert>;
```

---

## 📝 Logging & Monitoring

### ActivityLog

```typescript
/**
 * User activity logging
 * Table: activity_logs
 * Size: ~912 kB
 */
export interface ActivityLog {
  id: string; // UUID, PK
  user_id: string | null; // FK → auth.users

  // Activity Info
  activity_type: string; // 'review_reply' | 'location_update' | etc.
  activity_message: string;
  actionable: boolean;

  // Metadata
  metadata: Record<string, any> | null; // JSONB

  // Timestamp
  created_at: string;
}

export type ActivityLogInsert = {
  id?: string;
  user_id?: string | null;
  activity_type: string;
  activity_message: string;
  actionable?: boolean;
  metadata?: Record<string, any> | null;
};
```

---

### AuditLog

```typescript
/**
 * Security and compliance audit logging
 * Table: audit_logs
 * Size: ~304 kB
 */
export interface AuditLog {
  id: string; // UUID, PK
  user_id: string | null; // FK → auth.users

  // Action Info
  action: string; // 'login' | 'create' | 'update' | 'delete' | etc.
  resource_type: string | null; // 'location' | 'review' | 'account' | etc.
  resource_id: string | null;

  // Request Info
  ip_address: string | null;

  // Metadata
  metadata: Record<string, any> | null; // JSONB

  // Timestamp
  created_at: string;
}

export type AuditLogInsert = {
  id?: string;
  user_id?: string | null;
  action: string;
  resource_type?: string | null;
  resource_id?: string | null;
  ip_address?: string | null;
  metadata?: Record<string, any> | null;
};
```

---

### ErrorLog

```typescript
/**
 * Client and server error logging
 * Table: error_logs
 * Size: ~784 kB
 */
export interface ErrorLog {
  id: string; // UUID, PK
  user_id: string | null; // FK → auth.users

  // Error Info
  message: string;
  error_type: string | null;
  error_code: string | null;
  stack: string | null;
  level: string; // 'error' | 'warning' | 'info'
  severity: number; // 1-5

  // Context
  context: Record<string, any> | null; // JSONB
  url: string | null;

  // User Agent Details
  user_agent: string | null;
  browser_name: string | null;
  browser_version: string | null;
  os_name: string | null;
  os_version: string | null;
  device_type: string | null;

  // Session Info
  session_id: string | null;
  ip_address: string | null; // INET type

  // Resolution
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;

  // Timestamps
  timestamp: string;
  created_at: string;
}

export type ErrorLogInsert = {
  id?: string;
  user_id?: string | null;
  message: string;
  error_type?: string | null;
  error_code?: string | null;
  stack?: string | null;
  level?: string;
  severity?: number;
  context?: Record<string, any> | null;
  // ... other fields optional
};

// Helper types
export type ErrorLevel = "error" | "warning" | "info";
export type ErrorSeverity = 1 | 2 | 3 | 4 | 5;
```

---

## 🛠️ Utility Interfaces

### Notification

```typescript
/**
 * User notifications
 * Table: notifications
 * Size: ~64 kB
 */
export interface Notification {
  id: string; // UUID, PK
  user_id: string; // FK → auth.users

  // Notification Info
  type: string; // 'review' | 'question' | 'sync' | 'alert' | etc.
  title: string;
  message: string;
  link: string | null;

  // Status
  read: boolean;

  // Metadata
  metadata: Record<string, any> | null; // JSONB

  // Timestamps
  created_at: string;
  updated_at: string;
}

export type NotificationInsert = {
  id?: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  read?: boolean;
  metadata?: Record<string, any> | null;
};

// Helper types
export type NotificationType =
  | "review"
  | "question"
  | "sync"
  | "alert"
  | "system";
```

---

### WeeklyTaskRecommendation

```typescript
/**
 * AI-generated weekly task recommendations
 * Table: weekly_task_recommendations
 * Size: ~112 kB
 */
export interface WeeklyTaskRecommendation {
  id: string; // UUID, PK
  user_id: string; // FK → auth.users

  // Task Info
  title: string;
  description: string | null;
  category: string | null; // 'reviews' | 'content' | 'engagement' | etc.
  priority: string | null; // 'high' | 'medium' | 'low'

  // Week Info
  week_start_date: string; // DATE
  week_end_date: string; // DATE

  // Task Details
  tasks: Record<string, any> | null; // JSONB array of subtasks
  insights: string | null;
  reasoning: string | null;

  // Effort & Impact
  effort_level: string | null; // 'low' | 'medium' | 'high'
  estimated_minutes: number | null;
  expected_impact: string | null;

  // Status
  status: string; // 'pending' | 'in_progress' | 'completed' | 'dismissed'

  // Timestamps
  created_at: string;
  updated_at: string;
}

// Helper types
export type TaskPriority = "high" | "medium" | "low";
export type TaskStatus = "pending" | "in_progress" | "completed" | "dismissed";
```

---

### BusinessProfileHistory

```typescript
/**
 * History of changes to business profiles
 * Table: business_profile_history
 * Size: ~1.9 MB
 */
export interface BusinessProfileHistory {
  id: string; // UUID, PK
  location_id: string; // FK → gmb_locations

  // Change Info
  operation_type: string; // 'create' | 'update' | 'delete'
  location_name: string;
  created_by: string | null;

  // Data
  data: Record<string, any>; // JSONB - Full snapshot or changes

  // Metadata
  metadata: Record<string, any> | null; // JSONB

  // Timestamp
  created_at: string;
}

// Helper type
export type OperationType = "create" | "update" | "delete";
```

---

## 👁️ View Interfaces

### GMBLocationWithRating

```typescript
/**
 * View: gmb_locations_with_rating
 * Locations with calculated rating from reviews
 */
export interface GMBLocationWithRating extends GMBLocation {
  calculated_rating: number | null; // AVG(reviews.rating)
  reviews_count: number; // COUNT(reviews)
  last_review_date: string | null; // MAX(reviews.review_date)
}
```

---

### DashboardStats

```typescript
/**
 * View: v_dashboard_stats
 * Pre-aggregated dashboard statistics
 */
export interface DashboardStats {
  user_id: string;
  total_locations: number;
  total_reviews: number;
  avg_rating: number | null;
  response_rate: number | null; // Percentage
  recent_reviews: number; // Last 7 days
  pending_reviews: number;
  total_questions: number;
  pending_questions: number;
  recent_questions: number; // Last 7 days
  calculated_at: string;
}
```

---

## 🔧 Helper Types

### Database Response Types

```typescript
/**
 * Standard Supabase query response
 */
export type SupabaseResponse<T> = {
  data: T | null;
  error: SupabaseError | null;
  count: number | null;
  status: number;
  statusText: string;
};

export type SupabaseError = {
  message: string;
  details: string;
  hint: string;
  code: string;
};

/**
 * Array response with pagination
 */
export type PaginatedResponse<T> = {
  data: T[];
  count: number | null;
  error: SupabaseError | null;
};
```

---

### Query Filter Types

```typescript
/**
 * Common filter types for queries
 */
export type DateRange = {
  start: string; // ISO 8601
  end: string; // ISO 8601
};

export type PaginationParams = {
  page: number;
  pageSize: number;
  offset?: number;
  limit?: number;
};

export type SortParams = {
  column: string;
  ascending: boolean;
};

export type FilterParams = {
  search?: string;
  status?: string;
  dateRange?: DateRange;
  tags?: string[];
  rating?: number;
  // ... add more as needed
};
```

---

### Relationship Types

```typescript
/**
 * Helper types for relationships
 */
export type WithLocation<T> = T & {
  location: GMBLocation | null;
};

export type WithAccount<T> = T & {
  gmb_account: GMBAccount | null;
};

export type WithReviews<T> = T & {
  reviews: GMBReview[];
};

export type WithQuestions<T> = T & {
  questions: GMBQuestion[];
};

// Example usage:
// type LocationWithReviews = WithReviews<GMBLocation>;
```

---

## 📦 Supabase Database Type

```typescript
/**
 * Complete Supabase database type
 * Used with createClient<Database>()
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
      gmb_accounts: {
        Row: GMBAccount;
        Insert: GMBAccountInsert;
        Update: GMBAccountUpdate;
        Relationships: [
          {
            foreignKeyName: "gmb_accounts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      gmb_locations: {
        Row: GMBLocation;
        Insert: GMBLocationInsert;
        Update: GMBLocationUpdate;
        Relationships: [
          {
            foreignKeyName: "gmb_locations_gmb_account_id_fkey";
            columns: ["gmb_account_id"];
            isOneToOne: false;
            referencedRelation: "gmb_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gmb_locations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      // ... add all other tables
    };
    Views: {
      gmb_locations_with_rating: {
        Row: GMBLocationWithRating;
        Relationships: [];
      };
      v_dashboard_stats: {
        Row: DashboardStats;
        Relationships: [];
      };
      // ... add all other views
    };
    Functions: {
      sync_gmb_data_transactional: {
        Args: {
          p_account_id: string;
          p_locations?: Json;
          p_reviews?: Json;
          p_questions?: Json;
          p_posts?: Json;
          p_media?: Json;
        };
        Returns: Json;
      };
      get_user_dashboard_stats: {
        Args: {
          p_user_id: string;
        };
        Returns: DashboardStats[];
      };
      // ... add all other functions
    };
    Enums: {};
    CompositeTypes: {};
  };
}

/**
 * Type-safe Supabase client
 */
import { SupabaseClient } from "@supabase/supabase-js";
export type TypedSupabaseClient = SupabaseClient<Database>;
```

---

## 📝 Usage Examples

### Basic Query

```typescript
import { createClient } from "@/lib/supabase/client";
import type { GMBLocation, GMBLocationInsert } from "./types";

const supabase = createClient();

// Type-safe SELECT
const { data, error } = await supabase
  .from("gmb_locations")
  .select("*")
  .eq("user_id", userId)
  .returns<GMBLocation[]>();

// Type-safe INSERT
const newLocation: GMBLocationInsert = {
  gmb_account_id: accountId,
  user_id: userId,
  location_id: "locations/123",
  location_name: "My Business",
  // ... other fields
};

const { data: inserted } = await supabase
  .from("gmb_locations")
  .insert(newLocation)
  .select()
  .single();
```

---

### With Relationships

```typescript
// Query with joined relations
const { data } = await supabase
  .from("gmb_locations")
  .select(
    `
    *,
    gmb_account:gmb_accounts(*),
    reviews:gmb_reviews(*)
  `,
  )
  .eq("user_id", userId);

// Type assertion for relationship data
type LocationWithRelations = GMBLocation & {
  gmb_account: GMBAccount;
  reviews: GMBReview[];
};

const locations = data as LocationWithRelations[];
```

---

### RPC Function Call

```typescript
// Call database function
const { data: stats } = await supabase
  .rpc("get_user_dashboard_stats", {
    p_user_id: userId,
  })
  .returns<DashboardStats[]>();
```

---

**Generated:** November 26, 2025
**Version:** 0.9.0-beta
**TypeScript:** 5.9.3 (Strict mode)
**Framework:** Next.js 14 + Supabase
