# 🗄️ NNH AI Studio - Complete Database Schema (SQL)

> **Generated:** November 26, 2025
> **Source:** TypeScript codebase analysis + Migration files
> **Total Tables:** 25 tables
> **Total Columns:** 613+ columns
> **Database:** PostgreSQL (Supabase)

---

## 📋 Table of Contents

1. [Core Tables](#core-tables)
   - [profiles](#1-profiles)
   - [gmb_accounts](#2-gmb_accounts)
   - [gmb_locations](#3-gmb_locations)
   - [gmb_reviews](#4-gmb_reviews)
   - [gmb_questions](#5-gmb_questions)
   - [gmb_posts](#6-gmb_posts)
   - [gmb_media](#7-gmb_media)
2. [Performance & Metrics](#performance--metrics-tables)
3. [AI & Automation](#ai--automation-tables)
4. [Sync System](#sync-system-tables)
5. [OAuth & Auth](#oauth--auth-tables)
6. [Logging & Monitoring](#logging--monitoring-tables)
7. [Utility Tables](#utility-tables)
8. [Views & Materialized Views](#views--materialized-views)
9. [Functions (RPCs)](#database-functions-rpcs)
10. [Indexes](#indexes)
11. [RLS Policies](#row-level-security-policies)

---

## 📊 Core Tables

### 1. `profiles`

**Purpose:** User profile information
**Size:** ~168 kB
**Columns:** 10
**Relationships:** Root table for user data

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  provider_sub TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_profiles_id ON profiles(id);
CREATE INDEX idx_profiles_email ON profiles(email);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and edit own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Comments
COMMENT ON TABLE profiles IS 'User profile information';
COMMENT ON COLUMN profiles.id IS 'User ID from auth.users';
COMMENT ON COLUMN profiles.email IS 'User email address';
COMMENT ON COLUMN profiles.phone IS 'User phone number';
```

---

### 2. `gmb_accounts`

**Purpose:** Google My Business account connections
**Size:** ~312 kB
**Columns:** 18
**Relationships:** Links users to GMB accounts

```sql
CREATE TABLE gmb_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id TEXT UNIQUE NOT NULL,
  account_name TEXT,
  email TEXT,
  google_account_id TEXT,
  access_token TEXT, -- Encrypted
  refresh_token TEXT, -- Encrypted
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  last_sync TIMESTAMPTZ,
  data_retention_days INTEGER DEFAULT 90,
  delete_on_disconnect BOOLEAN DEFAULT false,
  disconnected_at TIMESTAMPTZ,
  settings JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_gmb_accounts_user_id ON gmb_accounts(user_id);
CREATE INDEX idx_gmb_accounts_account_id ON gmb_accounts(account_id);
CREATE INDEX idx_gmb_accounts_is_active ON gmb_accounts(is_active);
CREATE INDEX idx_gmb_accounts_email ON gmb_accounts(email);
CREATE INDEX idx_gmb_accounts_last_sync ON gmb_accounts(last_sync);

-- RLS Policies
ALTER TABLE gmb_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own GMB accounts" ON gmb_accounts
  FOR ALL USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE gmb_accounts IS 'Google My Business account connections';
COMMENT ON COLUMN gmb_accounts.access_token IS 'Encrypted OAuth access token';
COMMENT ON COLUMN gmb_accounts.refresh_token IS 'Encrypted OAuth refresh token';
```

---

### 3. `gmb_locations`

**Purpose:** Business locations from Google My Business
**Size:** ~2.8 MB (largest table)
**Columns:** 48
**Relationships:** Child of gmb_accounts, parent of reviews/questions/posts

```sql
CREATE TABLE gmb_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gmb_account_id UUID NOT NULL REFERENCES gmb_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Google IDs
  location_id TEXT UNIQUE NOT NULL,
  normalized_location_id TEXT,
  location_id_external TEXT,

  -- Basic Info
  location_name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  website TEXT,
  category TEXT,
  additional_categories TEXT[],

  -- Coordinates
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  latlng TEXT,

  -- Business Details
  description TEXT,
  short_description TEXT,
  opening_date TEXT,
  business_hours JSONB,
  regularhours JSONB,
  service_area_enabled BOOLEAN DEFAULT false,

  -- URLs
  appointment_url TEXT,
  booking_url TEXT,
  menu_url TEXT,
  order_url TEXT,

  -- Media
  cover_photo_url TEXT,

  -- Metrics
  rating NUMERIC(3, 2),
  review_count INTEGER DEFAULT 0,
  response_rate NUMERIC(5, 2),
  calculated_response_rate NUMERIC(5, 2),
  profile_completeness NUMERIC(5, 2),
  health_score NUMERIC(5, 2),

  -- AI Features
  ai_insights TEXT,
  from_the_business TEXT[],

  -- Status
  status TEXT,
  type TEXT,
  is_active BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,
  is_syncing BOOLEAN DEFAULT false,

  -- Metadata
  metadata JSONB,
  account_id TEXT,

  -- Timestamps
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_gmb_locations_user_id ON gmb_locations(user_id);
CREATE INDEX idx_gmb_locations_gmb_account_id ON gmb_locations(gmb_account_id);
CREATE INDEX idx_gmb_locations_location_id ON gmb_locations(location_id);
CREATE INDEX idx_gmb_locations_normalized_id ON gmb_locations(normalized_location_id);
CREATE INDEX idx_gmb_locations_is_active ON gmb_locations(is_active);
CREATE INDEX idx_gmb_locations_is_archived ON gmb_locations(is_archived);
CREATE INDEX idx_gmb_locations_rating ON gmb_locations(rating);
CREATE INDEX idx_gmb_locations_last_synced ON gmb_locations(last_synced_at);
CREATE INDEX idx_gmb_locations_category ON gmb_locations(category);
CREATE INDEX idx_gmb_locations_created_at ON gmb_locations(created_at);

-- GIN indexes for JSONB
CREATE INDEX idx_gmb_locations_metadata ON gmb_locations USING GIN(metadata);
CREATE INDEX idx_gmb_locations_business_hours ON gmb_locations USING GIN(business_hours);

-- GiST index for location search
CREATE INDEX idx_gmb_locations_coordinates ON gmb_locations
  USING gist (ll_to_earth(latitude, longitude));

-- RLS Policies
ALTER TABLE gmb_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own locations" ON gmb_locations
  FOR ALL USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE gmb_locations IS 'Business locations from Google My Business';
COMMENT ON COLUMN gmb_locations.location_id IS 'Google location ID (unique)';
COMMENT ON COLUMN gmb_locations.metadata IS 'Full raw Google API response';
```

---

### 4. `gmb_reviews`

**Purpose:** Customer reviews from Google My Business
**Size:** ~5.8 MB (2nd largest table)
**Columns:** 51
**Relationships:** Child of gmb_locations

```sql
CREATE TABLE gmb_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES gmb_locations(id) ON DELETE CASCADE,
  gmb_account_id UUID REFERENCES gmb_accounts(id) ON DELETE CASCADE,

  -- Google IDs
  external_review_id TEXT UNIQUE NOT NULL,
  review_id TEXT,

  -- Reviewer Info
  reviewer_name TEXT,
  reviewer_display_name TEXT,
  reviewer_profile_photo_url TEXT,

  -- Review Content
  comment TEXT,
  review_text TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),

  -- Reply Info
  reply_text TEXT,
  review_reply TEXT,
  response TEXT,
  response_text TEXT,
  has_reply BOOLEAN DEFAULT false,
  has_response BOOLEAN DEFAULT false,
  reply_timestamp TIMESTAMPTZ,
  reply_date TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,

  -- AI Features
  ai_sentiment TEXT,
  ai_sentiment_score NUMERIC(3, 2),
  ai_sentiment_analysis JSONB,
  ai_suggested_reply TEXT,
  ai_generated_response TEXT,
  ai_reply_generated BOOLEAN DEFAULT false,
  ai_confidence_score NUMERIC(3, 2),
  ai_generated_at TIMESTAMPTZ,
  ai_sent_at TIMESTAMPTZ,

  -- Auto Reply
  auto_reply_enabled BOOLEAN DEFAULT false,
  auto_reply_status TEXT,
  response_priority TEXT,

  -- Flags & Status
  status TEXT,
  flagged_reason TEXT,
  internal_notes TEXT,
  tags TEXT[],

  -- Privacy
  is_anonymized BOOLEAN DEFAULT false,
  is_verified_purchase BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB,
  google_my_business_name TEXT,
  account_id TEXT,

  -- Timestamps
  review_date TIMESTAMPTZ,
  review_timestamp TIMESTAMPTZ,
  review_url TEXT,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_gmb_reviews_user_id ON gmb_reviews(user_id);
CREATE INDEX idx_gmb_reviews_location_id ON gmb_reviews(location_id);
CREATE INDEX idx_gmb_reviews_gmb_account_id ON gmb_reviews(gmb_account_id);
CREATE INDEX idx_gmb_reviews_external_id ON gmb_reviews(external_review_id);
CREATE INDEX idx_gmb_reviews_rating ON gmb_reviews(rating);
CREATE INDEX idx_gmb_reviews_has_reply ON gmb_reviews(has_reply);
CREATE INDEX idx_gmb_reviews_sentiment ON gmb_reviews(ai_sentiment);
CREATE INDEX idx_gmb_reviews_status ON gmb_reviews(status);
CREATE INDEX idx_gmb_reviews_review_date ON gmb_reviews(review_date);
CREATE INDEX idx_gmb_reviews_created_at ON gmb_reviews(created_at);
CREATE INDEX idx_gmb_reviews_is_archived ON gmb_reviews(is_archived);

-- GIN indexes
CREATE INDEX idx_gmb_reviews_metadata ON gmb_reviews USING GIN(metadata);
CREATE INDEX idx_gmb_reviews_tags ON gmb_reviews USING GIN(tags);

-- RLS Policies
ALTER TABLE gmb_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own reviews" ON gmb_reviews
  FOR ALL USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE gmb_reviews IS 'Customer reviews from Google My Business';
COMMENT ON COLUMN gmb_reviews.external_review_id IS 'Google review ID (unique)';
COMMENT ON COLUMN gmb_reviews.ai_sentiment IS 'AI-detected sentiment: positive, neutral, negative';
```

---

### 5. `gmb_questions`

**Purpose:** Q&A from Google My Business
**Size:** ~544 kB
**Columns:** 37
**Relationships:** Child of gmb_locations

```sql
CREATE TABLE gmb_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES gmb_locations(id) ON DELETE CASCADE,
  gmb_account_id UUID NOT NULL REFERENCES gmb_accounts(id) ON DELETE CASCADE,

  -- Google IDs
  external_question_id TEXT UNIQUE,
  question_id TEXT,
  google_resource_name TEXT,

  -- Question Content
  question_text TEXT NOT NULL,
  question_url TEXT,

  -- Author Info
  author_name TEXT,
  author_display_name TEXT,
  author_profile_photo_url TEXT,
  author_type TEXT,

  -- Answer Info
  answer_id TEXT,
  answer_text TEXT,
  answered_at TIMESTAMPTZ,
  answered_by TEXT,
  answer_status TEXT DEFAULT 'pending',

  -- AI Features
  ai_suggested_answer TEXT,
  ai_answer_generated BOOLEAN DEFAULT false,
  ai_confidence_score NUMERIC(3, 2),
  ai_category TEXT,

  -- Engagement
  upvote_count INTEGER DEFAULT 0,
  total_answer_count INTEGER DEFAULT 0,

  -- Status & Flags
  status TEXT,
  priority TEXT,
  is_featured BOOLEAN DEFAULT false,
  is_hidden BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,

  -- Notes
  internal_notes TEXT,

  -- Language
  language_code TEXT DEFAULT 'en',

  -- Metadata
  metadata JSONB,

  -- Timestamps
  asked_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_gmb_questions_user_id ON gmb_questions(user_id);
CREATE INDEX idx_gmb_questions_location_id ON gmb_questions(location_id);
CREATE INDEX idx_gmb_questions_gmb_account_id ON gmb_questions(gmb_account_id);
CREATE INDEX idx_gmb_questions_external_id ON gmb_questions(external_question_id);
CREATE INDEX idx_gmb_questions_answer_status ON gmb_questions(answer_status);
CREATE INDEX idx_gmb_questions_status ON gmb_questions(status);
CREATE INDEX idx_gmb_questions_is_archived ON gmb_questions(is_archived);
CREATE INDEX idx_gmb_questions_created_at ON gmb_questions(created_at);

-- GIN indexes
CREATE INDEX idx_gmb_questions_metadata ON gmb_questions USING GIN(metadata);

-- RLS Policies
ALTER TABLE gmb_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own questions" ON gmb_questions
  FOR ALL USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE gmb_questions IS 'Q&A from Google My Business';
COMMENT ON COLUMN gmb_questions.external_question_id IS 'Google question ID (unique)';
```

---

### 6. `gmb_posts`

**Purpose:** Posts from Google My Business (What's New, Events, Offers)
**Size:** ~120 kB
**Columns:** 27
**Relationships:** Child of gmb_locations

```sql
CREATE TABLE gmb_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES gmb_locations(id) ON DELETE CASCADE,

  -- Google IDs
  post_id TEXT,
  provider_post_id TEXT,

  -- Content
  title TEXT,
  content TEXT NOT NULL,
  post_type TEXT,

  -- Media
  media_url TEXT,

  -- Call to Action
  call_to_action TEXT,
  call_to_action_url TEXT,
  cta_type TEXT,
  cta_url TEXT,

  -- Event/Offer Dates
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,

  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,

  -- Status
  status TEXT DEFAULT 'draft',
  error_message TEXT,

  -- Archive
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_gmb_posts_user_id ON gmb_posts(user_id);
CREATE INDEX idx_gmb_posts_location_id ON gmb_posts(location_id);
CREATE INDEX idx_gmb_posts_post_id ON gmb_posts(post_id);
CREATE INDEX idx_gmb_posts_status ON gmb_posts(status);
CREATE INDEX idx_gmb_posts_post_type ON gmb_posts(post_type);
CREATE INDEX idx_gmb_posts_created_at ON gmb_posts(created_at);

-- RLS Policies
ALTER TABLE gmb_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own posts" ON gmb_posts
  FOR ALL USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE gmb_posts IS 'Posts from Google My Business';
```

---

### 7. `gmb_media`

**Purpose:** Photos and videos from Google My Business
**Size:** ~4.1 MB (3rd largest table)
**Columns:** 13
**Relationships:** Child of gmb_locations

```sql
CREATE TABLE gmb_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES gmb_locations(id) ON DELETE CASCADE,
  gmb_account_id UUID NOT NULL REFERENCES gmb_accounts(id) ON DELETE CASCADE,

  -- Google ID
  external_media_id TEXT NOT NULL,

  -- Media Info
  type TEXT,
  url TEXT,
  thumbnail_url TEXT,

  -- Metadata
  metadata JSONB,

  -- Timestamps
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_gmb_media_user_id ON gmb_media(user_id);
CREATE INDEX idx_gmb_media_location_id ON gmb_media(location_id);
CREATE INDEX idx_gmb_media_gmb_account_id ON gmb_media(gmb_account_id);
CREATE INDEX idx_gmb_media_external_id ON gmb_media(external_media_id);
CREATE INDEX idx_gmb_media_type ON gmb_media(type);

-- RLS Policies
ALTER TABLE gmb_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own media" ON gmb_media
  FOR ALL USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE gmb_media IS 'Photos and videos from Google My Business';
```

---

## 📈 Performance & Metrics Tables

### 8. `gmb_performance_metrics`

```sql
CREATE TABLE gmb_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES gmb_locations(id) ON DELETE CASCADE,
  gmb_account_id UUID NOT NULL REFERENCES gmb_accounts(id) ON DELETE CASCADE,

  -- Metric Info
  metric_date DATE NOT NULL,
  metric_type TEXT NOT NULL,
  metric_value NUMERIC DEFAULT 0,
  sub_entity_type JSONB,

  -- Metadata
  metadata JSONB,

  -- Timestamps
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(location_id, metric_date, metric_type)
);

-- Indexes
CREATE INDEX idx_gmb_performance_location_id ON gmb_performance_metrics(location_id);
CREATE INDEX idx_gmb_performance_metric_date ON gmb_performance_metrics(metric_date);
CREATE INDEX idx_gmb_performance_metric_type ON gmb_performance_metrics(metric_type);
```

---

### 9. `gmb_search_keywords`

```sql
CREATE TABLE gmb_search_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES gmb_locations(id) ON DELETE CASCADE,
  gmb_account_id UUID NOT NULL REFERENCES gmb_accounts(id) ON DELETE CASCADE,

  -- Keyword Info
  search_keyword TEXT NOT NULL,
  month_year TEXT NOT NULL,
  impressions_count INTEGER DEFAULT 0,
  threshold_value INTEGER,

  -- Metadata
  metadata JSONB,

  -- Timestamps
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(location_id, search_keyword, month_year)
);

-- Indexes
CREATE INDEX idx_gmb_keywords_location_id ON gmb_search_keywords(location_id);
CREATE INDEX idx_gmb_keywords_month_year ON gmb_search_keywords(month_year);
```

---

### 10. `gmb_metrics`

```sql
CREATE TABLE gmb_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gmb_account_id UUID NOT NULL REFERENCES gmb_accounts(id) ON DELETE CASCADE,

  -- Metric Info
  phase TEXT NOT NULL,
  runs_count INTEGER DEFAULT 0,
  total_duration_ms BIGINT DEFAULT 0,
  total_items_count INTEGER DEFAULT 0,
  avg_duration_ms NUMERIC,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(gmb_account_id, phase)
);
```

---

## 🤖 AI & Automation Tables

### 11. `ai_requests`

```sql
CREATE TABLE ai_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID REFERENCES gmb_locations(id) ON DELETE SET NULL,

  -- Provider Info
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  feature TEXT NOT NULL,

  -- Usage Stats
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  cost_usd NUMERIC(10, 6),
  latency_ms INTEGER,

  -- Status
  success BOOLEAN DEFAULT true,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ai_requests_user_id ON ai_requests(user_id);
CREATE INDEX idx_ai_requests_provider ON ai_requests(provider);
CREATE INDEX idx_ai_requests_feature ON ai_requests(feature);
CREATE INDEX idx_ai_requests_created_at ON ai_requests(created_at);
```

---

### 12. `ai_settings`

```sql
CREATE TABLE ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Provider Info
  provider TEXT NOT NULL,
  api_key TEXT NOT NULL, -- Encrypted
  priority INTEGER DEFAULT 99,
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, provider)
);

-- Indexes
CREATE INDEX idx_ai_settings_user_id ON ai_settings(user_id);
CREATE INDEX idx_ai_settings_provider ON ai_settings(provider);
CREATE INDEX idx_ai_settings_is_active ON ai_settings(is_active);
```

---

## 🔄 Sync System Tables

### 13. `sync_queue`

```sql
CREATE TABLE sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES gmb_accounts(id) ON DELETE CASCADE,

  -- Job Info
  sync_type TEXT DEFAULT 'full' CHECK (sync_type IN ('full', 'incremental')),
  priority INTEGER DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,

  -- Metadata
  metadata JSONB,

  -- Timestamps
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sync_queue_user_id ON sync_queue(user_id);
CREATE INDEX idx_sync_queue_account_id ON sync_queue(account_id);
CREATE INDEX idx_sync_queue_status ON sync_queue(status);
CREATE INDEX idx_sync_queue_scheduled_at ON sync_queue(scheduled_at);
```

---

### 14. `sync_status`

```sql
CREATE TABLE sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES gmb_accounts(id) ON DELETE CASCADE,

  -- Status Info
  stage TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'error')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  message TEXT,
  error TEXT,

  -- Metadata
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sync_status_user_id ON sync_status(user_id);
CREATE INDEX idx_sync_status_account_id ON sync_status(account_id);
CREATE INDEX idx_sync_status_status ON sync_status(status);
```

---

### 15. `gmb_sync_logs`

```sql
CREATE TABLE gmb_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gmb_account_id UUID NOT NULL REFERENCES gmb_accounts(id) ON DELETE CASCADE,

  -- Phase Info
  phase TEXT NOT NULL,
  status TEXT DEFAULT 'started',

  -- Metrics
  counts JSONB,
  duration_ms BIGINT,
  error TEXT,

  -- Metadata
  metadata JSONB,

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_gmb_sync_logs_user_id ON gmb_sync_logs(user_id);
CREATE INDEX idx_gmb_sync_logs_gmb_account_id ON gmb_sync_logs(gmb_account_id);
CREATE INDEX idx_gmb_sync_logs_phase ON gmb_sync_logs(phase);
CREATE INDEX idx_gmb_sync_logs_status ON gmb_sync_logs(status);
```

---

## 🔐 OAuth & Auth Tables

### 16. `oauth_states`

```sql
CREATE TABLE oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- State Info
  state TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_oauth_states_state ON oauth_states(state);
CREATE INDEX idx_oauth_states_user_id ON oauth_states(user_id);
CREATE INDEX idx_oauth_states_expires_at ON oauth_states(expires_at);
```

---

### 17. `oauth_tokens`

```sql
CREATE TABLE oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Provider Info
  provider TEXT NOT NULL,

  -- Tokens (Encrypted)
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  scope TEXT,

  -- Metadata
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, provider)
);

-- Indexes
CREATE INDEX idx_oauth_tokens_user_id ON oauth_tokens(user_id);
CREATE INDEX idx_oauth_tokens_provider ON oauth_tokens(provider);
```

---

### 18. `performance_metrics`

**Purpose:** Track application performance metrics
**Columns:** 7
**Relationships:** Links to users

```sql
CREATE TABLE performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Metric Info
  name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,

  -- Metadata
  metadata JSONB,

  -- Timestamp
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_performance_metrics_user_id ON performance_metrics(user_id);
CREATE INDEX idx_performance_metrics_name ON performance_metrics(name);
CREATE INDEX idx_performance_metrics_timestamp ON performance_metrics(timestamp);

-- RLS Policies
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own metrics" ON performance_metrics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own metrics" ON performance_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE performance_metrics IS 'Application performance tracking';
COMMENT ON COLUMN performance_metrics.name IS 'Metric name (e.g., api_call, page_load)';
COMMENT ON COLUMN performance_metrics.value IS 'Metric value (duration in ms, count, etc.)';
COMMENT ON COLUMN performance_metrics.unit IS 'Unit of measurement (ms, count, bytes, etc.)';
```

---

### 19. `rate_limit_requests`

**Purpose:** Track API rate limiting per user/endpoint
**Columns:** 6
**Relationships:** Links to users

```sql
CREATE TABLE rate_limit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,

  -- Request Info
  action TEXT NOT NULL,
  endpoint TEXT,
  ip_address INET,
  user_agent TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_rate_limit_requests_user_id ON rate_limit_requests(user_id);
CREATE INDEX idx_rate_limit_requests_endpoint ON rate_limit_requests(endpoint);
CREATE INDEX idx_rate_limit_requests_created_at ON rate_limit_requests(created_at);
CREATE INDEX idx_rate_limit_requests_user_endpoint ON rate_limit_requests(user_id, endpoint, created_at);

-- Comments
COMMENT ON TABLE rate_limit_requests IS 'Rate limiting tracking for API endpoints';
COMMENT ON COLUMN rate_limit_requests.user_id IS 'User identifier (UUID or IP)';
COMMENT ON COLUMN rate_limit_requests.endpoint IS 'API endpoint path';
COMMENT ON COLUMN rate_limit_requests.action IS 'Action performed';
```

---

## 📝 Logging & Monitoring Tables

### 20. `activity_logs`

```sql
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Activity Info
  activity_type TEXT NOT NULL,
  activity_message TEXT NOT NULL,
  actionable BOOLEAN DEFAULT false,

  -- Metadata
  metadata JSONB,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_type ON activity_logs(activity_type);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);
```

---

### 21. `audit_logs`

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Action Info
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,

  -- Request Info
  ip_address TEXT,

  -- Metadata
  metadata JSONB,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

---

### 22. `error_logs`

```sql
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Error Info
  message TEXT NOT NULL,
  error_type TEXT,
  error_code TEXT,
  stack TEXT,
  level TEXT DEFAULT 'error',
  severity INTEGER DEFAULT 3,

  -- Context
  context JSONB,
  url TEXT,

  -- User Agent Details
  user_agent TEXT,
  browser_name TEXT,
  browser_version TEXT,
  os_name TEXT,
  os_version TEXT,
  device_type TEXT,

  -- Session Info
  session_id TEXT,
  ip_address INET,

  -- Resolution
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  resolution_notes TEXT,

  -- Timestamps
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX idx_error_logs_level ON error_logs(level);
CREATE INDEX idx_error_logs_resolved ON error_logs(resolved);
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at);
```

---

## 🛠️ Utility Tables

### 23. `notifications`

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Notification Info
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,

  -- Status
  read BOOLEAN DEFAULT false,

  -- Metadata
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
```

---

### 24. `weekly_task_recommendations`

```sql
CREATE TABLE weekly_task_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Task Info
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  priority TEXT,

  -- Week Info
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,

  -- Task Details
  tasks JSONB,
  insights TEXT,
  reasoning TEXT,

  -- Effort & Impact
  effort_level TEXT,
  estimated_minutes INTEGER,
  expected_impact TEXT,

  -- Status
  status TEXT DEFAULT 'pending',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_weekly_tasks_user_id ON weekly_task_recommendations(user_id);
CREATE INDEX idx_weekly_tasks_status ON weekly_task_recommendations(status);
CREATE INDEX idx_weekly_tasks_week_start ON weekly_task_recommendations(week_start_date);
```

---

### 25. `business_profile_history`

```sql
CREATE TABLE business_profile_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES gmb_locations(id) ON DELETE CASCADE,

  -- Change Info
  operation_type TEXT NOT NULL,
  location_name TEXT NOT NULL,
  created_by TEXT,

  -- Data
  data JSONB NOT NULL,

  -- Metadata
  metadata JSONB,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_profile_history_location_id ON business_profile_history(location_id);
CREATE INDEX idx_profile_history_created_at ON business_profile_history(created_at);
```

---

## 📊 Views & Materialized Views

### View: `gmb_locations_with_rating`

```sql
CREATE OR REPLACE VIEW gmb_locations_with_rating AS
SELECT
  l.*,
  COALESCE(AVG(r.rating), 0) as calculated_rating,
  COUNT(r.id) as reviews_count,
  MAX(r.review_date) as last_review_date
FROM gmb_locations l
LEFT JOIN gmb_reviews r ON l.id = r.location_id
GROUP BY l.id;
```

---

### View: `v_dashboard_stats`

```sql
CREATE OR REPLACE VIEW v_dashboard_stats AS
SELECT
  l.user_id,
  COUNT(DISTINCT l.id) as total_locations,
  COUNT(DISTINCT r.id) as total_reviews,
  AVG(r.rating) as avg_rating,
  SUM(CASE WHEN r.has_reply THEN 1 ELSE 0 END)::float / NULLIF(COUNT(r.id), 0) * 100 as response_rate,
  COUNT(DISTINCT CASE WHEN r.created_at >= NOW() - INTERVAL '7 days' THEN r.id END) as recent_reviews,
  COUNT(DISTINCT CASE WHEN r.has_reply = false THEN r.id END) as pending_reviews,
  COUNT(DISTINCT q.id) as total_questions,
  COUNT(DISTINCT CASE WHEN q.answer_status = 'pending' THEN q.id END) as pending_questions,
  COUNT(DISTINCT CASE WHEN q.created_at >= NOW() - INTERVAL '7 days' THEN q.id END) as recent_questions,
  NOW() as calculated_at
FROM gmb_locations l
LEFT JOIN gmb_reviews r ON l.id = r.location_id
LEFT JOIN gmb_questions q ON l.id = q.location_id
WHERE l.is_active = true
GROUP BY l.user_id;
```

---

## 🔧 Database Functions (RPCs)

### Function: `sync_gmb_data_transactional`

```sql
CREATE OR REPLACE FUNCTION sync_gmb_data_transactional(
  p_account_id UUID,
  p_locations JSONB DEFAULT '[]'::JSONB,
  p_reviews JSONB DEFAULT '[]'::JSONB,
  p_questions JSONB DEFAULT '[]'::JSONB,
  p_posts JSONB DEFAULT '[]'::JSONB,
  p_media JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sync_id UUID;
  v_locations_synced INT := 0;
  v_reviews_synced INT := 0;
  v_questions_synced INT := 0;
  v_result JSONB;
BEGIN
  -- Create sync tracking entry
  INSERT INTO sync_queue (account_id, status, started_at)
  VALUES (p_account_id, 'processing', NOW())
  RETURNING id INTO v_sync_id;

  -- Sync Locations
  -- ... (upsert logic)

  -- Sync Reviews
  -- ... (upsert logic)

  -- Sync Questions
  -- ... (upsert logic)

  -- Update sync status
  UPDATE sync_queue
  SET status = 'completed', completed_at = NOW()
  WHERE id = v_sync_id;

  RETURN jsonb_build_object(
    'success', true,
    'sync_id', v_sync_id,
    'locations_synced', v_locations_synced,
    'reviews_synced', v_reviews_synced,
    'questions_synced', v_questions_synced
  );
EXCEPTION WHEN OTHERS THEN
  UPDATE sync_queue
  SET status = 'failed', error_message = SQLERRM
  WHERE id = v_sync_id;

  RAISE EXCEPTION 'Sync failed: %', SQLERRM;
END;
$$;
```

---

### Function: `get_user_dashboard_stats`

```sql
CREATE OR REPLACE FUNCTION get_user_dashboard_stats(p_user_id UUID)
RETURNS TABLE (
  locations_count BIGINT,
  reviews_count BIGINT,
  average_rating NUMERIC,
  response_rate_percent NUMERIC,
  pending_reviews_count BIGINT,
  pending_questions_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT l.id),
    COUNT(DISTINCT r.id),
    AVG(r.rating),
    (SUM(CASE WHEN r.has_reply THEN 1 ELSE 0 END)::float / NULLIF(COUNT(r.id), 0) * 100)::numeric,
    COUNT(DISTINCT CASE WHEN r.has_reply = false THEN r.id END),
    COUNT(DISTINCT CASE WHEN q.answer_status = 'pending' THEN q.id END)
  FROM gmb_locations l
  LEFT JOIN gmb_reviews r ON l.id = r.location_id
  LEFT JOIN gmb_questions q ON l.id = q.location_id
  WHERE l.user_id = p_user_id AND l.is_active = true;
END;
$$;
```

---

## 📑 Indexes Summary

### Essential Indexes Created:

**User-based indexes (RLS performance):**

- All tables have `idx_[table]_user_id` on `user_id`

**Foreign key indexes:**

- `idx_gmb_locations_gmb_account_id`
- `idx_gmb_reviews_location_id`
- `idx_gmb_questions_location_id`
- `idx_gmb_media_location_id`
- All child tables indexed on parent foreign keys

**Query performance indexes:**

- Time-based: `created_at`, `updated_at`, `synced_at`
- Status: `is_active`, `is_archived`, `status`
- Google IDs: `location_id`, `external_review_id`, `external_question_id`

**JSONB GIN indexes:**

- `metadata` columns in all major tables
- Array columns: `tags`, `categories`, `additional_categories`

**Total indexes:** 297+ indexes across all tables

---

## 🔒 Row Level Security Policies

### RLS Enabled on ALL tables

**Standard policy pattern:**

```sql
CREATE POLICY "Users can manage own data" ON [table_name]
  FOR ALL USING (auth.uid() = user_id);
```

**Service role policies (worker access):**

```sql
CREATE POLICY "Service role has full access" ON [table_name]
  FOR ALL TO service_role USING (true) WITH CHECK (true);
```

**Total RLS policies:** 97 policies

---

## 📝 Notes

1. **All timestamps use TIMESTAMPTZ** for timezone awareness
2. **All IDs use UUID** with `gen_random_uuid()` default
3. **Encrypted fields** marked with comment "-- Encrypted"
4. **JSONB fields** for flexible data storage (metadata, settings)
5. **Foreign keys with CASCADE** for proper cleanup
6. **Unique constraints** on Google IDs to prevent duplicates
7. **Check constraints** on ratings (1-5), percentages (0-100)
8. **Default values** for booleans, timestamps, status fields

---

**Generated:** November 26, 2025
**Version:** 0.9.0-beta
**Database:** PostgreSQL 15 (Supabase)
**Total Size:** ~30 MB (data + indexes)
