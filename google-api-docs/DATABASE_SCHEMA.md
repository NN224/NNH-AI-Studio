# 🗄️ Database Schema Reference

## 📊 ملخص قاعدة البيانات

### الإحصائيات الكاملة:

```
الجداول:        40 جدول (verified in production Nov 27, 2025)
الأعمدة:         671 عمود (verified in production)
Views:          7 views (cleaned up old views)
Materialized:   2 materialized views (mv_user_dashboard_stats, mv_location_stats)
Functions:      108 functions (including get_user_dashboard_stats, refresh_dashboard_stats_view)
Indexes:        303 indexes (optimized for performance)
Triggers:       24 triggers (added 5 new update triggers)
Policies:       112 RLS policies (added 15 new policies)
Extensions:     10 extensions
Migrations:     95 migration files (added critical schema fix Nov 27, 2025)
```

### 📝 آخر تحديث:

- **التاريخ:** نوفمبر 27, 2025
- **الإجراءات:**
  - ✅ إضافة 6 جداول مفقودة (teams, team_members, team_invitations, brand_profiles, autopilot_logs, question_templates)
  - ✅ إصلاح أخطاء الأعمدة في onboarding.ts و questions-management.ts
  - ✅ إضافة 15 RLS policies جديدة
  - ✅ إضافة 5 update triggers جديدة
  - ✅ إضافة 6 partial unique indexes
  - ✅ زيادة الأعمدة من 600 → 671 (+71 عمود)
  - ✅ زيادة الجداول من 34 → 40 (+6 جداول)

---

## 📁 الجداول الرئيسية

### 1. GMB Core Tables (الجداول الأساسية)

#### `gmb_locations` (48 columns) - 2.8 MB

**الاستخدام:** البيانات الأساسية للمواقع من Google My Business

- **Real-time enabled** ✅
- **Indexes:** 38
- **الحجم:** 2928 kB (أكبر جدول)

**الأعمدة الرئيسية:**

- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users)
- `gmb_account_id` (uuid, FK → gmb_accounts)
- `name` (text) - Location name from GMB
- `language_code` (text)
- `store_code` (text)
- `title` (text)
- `phone_numbers` (jsonb)
- `categories` (jsonb)
- `website_uri` (text)
- `regular_hours` (jsonb)
- `special_hours` (jsonb)
- `service_items` (jsonb)
- `address` (jsonb)
- `latitude` (numeric)
- `longitude` (numeric)
- `metadata` (jsonb)
- `raw_data` (jsonb) - Full raw response from GMB API
- `created_at`, `updated_at`

#### `gmb_reviews` (51 columns) - 5.2 MB

**الاستخدام:** المراجعات من Google My Business مع AI analysis

- **Indexes:** 37
- **الحجم:** 5784 kB (ثاني أكبر جدول)

**الأعمدة الرئيسية:**

- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users)
- `location_id` (uuid, FK → gmb_locations)
- `review_id` (text) - GMB review ID
- `reviewer_display_name` (text)
- `star_rating` (integer) - 1-5
- `comment` (text)
- `create_time` (timestamptz)
- `update_time` (timestamptz)
- `reply_comment` (text)
- `reply_update_time` (timestamptz)
- `has_reply` (boolean)
- `ai_sentiment` (text) - positive/neutral/negative
- `ai_summary` (text)
- `ai_suggested_reply` (text)
- `ai_analyzed_at` (timestamptz)
- `metadata` (jsonb)

#### `gmb_questions` (37 columns) - 544 kB

**الاستخدام:** الأسئلة والأجوبة من GMB

- **Real-time enabled** ✅
- **Indexes:** 28

**الأعمدة الرئيسية:**

- `id` (uuid, PK)
- `location_id` (uuid, FK → gmb_locations)
- `question_id` (text) - GMB question ID
- `author_display_name` (text)
- `text` (text)
- `create_time` (timestamptz)
- `update_time` (timestamptz)
- `top_answers` (jsonb)
- `total_answer_count` (integer)
- `upvote_count` (integer)

#### `gmb_accounts` (18 columns) - 312 kB

**الاستخدام:** حسابات Google My Business

- **Indexes:** 13

**الأعمدة الرئيسية:**

- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users)
- `gmb_account_id` (text) - GMB account ID
- `account_name` (text)
- `account_number` (text)
- `type` (text)
- `role` (text)
- `state` (text)
- `verification_state` (text)
- `is_primary` (boolean)
- `oauth_access_token` (text) - encrypted
- `oauth_refresh_token` (text) - encrypted
- `oauth_token_expires_at` (timestamptz)

#### `gmb_media` (13 columns) - 4.1 MB

**الاستخدام:** الصور والفيديوهات من GMB

- **Indexes:** 15
- **الحجم:** 4088 kB (ثالث أكبر جدول)

#### `gmb_posts` (27 columns) - 120 kB

**الاستخدام:** منشورات GMB

- **Indexes:** 14

#### `gmb_products` (13 columns) - 24 kB

**الاستخدام:** منتجات GMB

#### `gmb_services` (12 columns) - 16 kB

**الاستخدام:** خدمات GMB

#### `gmb_messages` (10 columns) - 32 kB

**الاستخدام:** رسائل العملاء من GMB

---

### 2. Performance & Analytics Tables

#### `gmb_performance_metrics` (12 columns) - 1.0 MB

**الاستخدام:** إحصائيات الأداء اليومية من GMB

- **الحجم:** 1008 kB

#### `gmb_search_keywords` (12 columns) - 6.3 MB

**الاستخدام:** كلمات البحث التي أدت لظهور الموقع

- **الحجم:** 6288 kB (أكبر جدول بيانات!)

#### `gmb_metrics` (10 columns) - 96 kB

**الاستخدام:** مقاييس عامة

---

### 3. AI & Automation Tables

#### `ai_requests` (13 columns) - 128 kB

**الاستخدام:** تتبع طلبات AI للإحصائيات والفواتير

- **Indexes:** 7

**الأعمدة الرئيسية:**

- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users)
- `location_id` (uuid, FK → gmb_locations, nullable)
- `provider` (text) - gemini/anthropic/openai/etc
- `model` (text)
- `feature` (text) - review_reply/content_generation/etc
- `prompt_tokens` (integer)
- `completion_tokens` (integer)
- `total_tokens` (integer)
- `cost_usd` (numeric)
- `latency_ms` (integer)
- `success` (boolean)

#### `ai_settings` (8 columns) - 104 kB

**الاستخدام:** إعدادات AI providers للمستخدمين

- **Indexes:** 6

**الأعمدة الرئيسية:**

- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users)
- `provider` (text)
- `api_key` (text) - encrypted
- `is_active` (boolean)
- `priority` (integer) - Lower = higher priority

#### `auto_reply_settings` (31 columns) - 40 kB

**الاستخدام:** إعدادات الرد التلقائي على المراجعات

- **Indexes:** 4

**الأعمدة الرئيسية:**

- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users)
- `location_id` (uuid, FK → gmb_locations, nullable)
- `enabled` (boolean)
- `auto_reply_1_star` → `auto_reply_5_star` (boolean) - لكل تقييم
- `use_ai` (boolean)
- `ai_tone` (text) - professional/friendly/etc
- `response_style` (text)
- `response_delay_minutes` (integer)
- `require_approval` (boolean)

#### `brand_profiles` (15 columns) - NEW ✨

**الاستخدام:** Brand voice and guidelines for AI content generation

- **Indexes:** 3
- **RLS Policies:** 4 (view, create, update, delete)
- **Partial Unique Index:** Only one active profile per user

**الأعمدة الرئيسية:**

- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users)
- `brand_name` (varchar) - Business/brand name
- `industry` (varchar) - Industry category
- `target_audience` (text) - Target demographic
- `voice` (varchar) - professional/casual/formal
- `tone_guidelines` (text) - Brand tone instructions
- `writing_style` (text) - Writing style preferences
- `keywords` (text[]) - Preferred keywords
- `avoid_words` (text[]) - Words to avoid
- `creativity_level` (integer) - 1-10 scale
- `formality_level` (integer) - 1-10 scale
- `example_posts` (text[]) - Sample brand posts
- `example_responses` (text[]) - Sample brand responses
- `is_active` (boolean) - Active profile flag

#### `question_templates` (13 columns) - NEW ✨

**الاستخدام:** Templates for answering common questions

- **Indexes:** 4
- **RLS Policies:** 4 (view, create, update, delete)

**الأعمدة الرئيسية:**

- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users)
- `title` (varchar) - Template name
- `question_pattern` (text) - Question matching pattern
- `answer_template` (text) - Answer template text
- `category` (varchar) - Template category
- `tags` (text[]) - Searchable tags
- `use_ai_enhancement` (boolean) - Enable AI enhancement
- `tone` (varchar) - professional/friendly/etc
- `times_used` (integer) - Usage counter
- `last_used_at` (timestamptz) - Last usage timestamp
- `is_active` (boolean) - Active template flag
- `priority` (integer) - Display priority

---

### 4. System & Logging Tables

#### `audit_logs` (8 columns) - 304 kB

**الاستخدام:** سجل الأحداث الأمنية

#### `error_logs` (24 columns) - 784 kB

**الاستخدام:** سجل الأخطاء من Client & Server

- **Indexes:** 9

#### `activity_logs` (7 columns) - 912 kB

**الاستخدام:** سجل الأنشطة

#### `sync_status` (19 columns) - 112 kB

**الاستخدام:** حالة مزامنة GMB

#### `gmb_sync_logs` (12 columns) - 680 kB

**الاستخدام:** سجلات المزامنة التفصيلية

#### `sync_worker_runs` (12 columns) - 232 kB

**الاستخدام:** سجل تشغيل Sync Worker

#### `sync_queue` (17 columns) - 192 kB

**الاستخدام:** طابور المزامنة

#### `autopilot_logs` (14 columns) - NEW ✨

**الاستخدام:** Audit log for all automated AI actions

- **Indexes:** 6
- **RLS Policies:** 2 (view own logs, system insert)

**الأعمدة الرئيسية:**

- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users)
- `action_type` (varchar) - review_reply/question_answer/post_generation
- `entity_type` (varchar) - review/question/post
- `entity_id` (uuid) - Reference to the entity
- `ai_provider` (varchar) - anthropic/openai/google/groq/deepseek
- `ai_model` (varchar) - Model name used
- `prompt_text` (text) - AI prompt sent
- `response_text` (text) - AI response received
- `confidence_score` (decimal) - 0.00-1.00 confidence
- `tokens_used` (integer) - Total tokens consumed
- `cost_usd` (decimal) - Cost in USD
- `status` (varchar) - success/error/pending
- `error_message` (text) - Error details if failed
- `processing_time_ms` (integer) - Processing duration

---

### 5. User & Auth Tables

#### `profiles` (10 columns) - 168 kB

**الاستخدام:** ملفات المستخدمين

- **Indexes:** 6

#### `oauth_states` (6 columns) - 160 kB

**الاستخدام:** OAuth flow temporary state

- **Indexes:** 6

#### `teams` (10 columns) - NEW ✨

**الاستخدام:** Teams/organizations for multi-user workspaces

- **Indexes:** 2
- **RLS Policies:** 4 (view, update, delete, insert)

**الأعمدة الرئيسية:**

- `id` (uuid, PK)
- `name` (varchar) - Team name
- `slug` (varchar, unique) - URL-friendly identifier
- `owner_id` (uuid, FK → auth.users) - Team owner
- `plan` (varchar) - free/pro/enterprise
- `max_members` (integer) - Maximum team size
- `logo_url` (text) - Team logo
- `website` (text) - Team website
- `description` (text) - Team description

#### `team_members` (8 columns) - NEW ✨

**الاستخدام:** Team membership and role-based access control (RBAC)

- **Indexes:** 3
- **RLS Policies:** 4 (view, insert, update, delete)
- **Unique Constraint:** (team_id, user_id)

**الأعمدة الرئيسية:**

- `id` (uuid, PK)
- `team_id` (uuid, FK → teams)
- `user_id` (uuid, FK → auth.users)
- `role` (varchar) - owner/admin/member
- `permissions` (jsonb) - Granular permissions
  ```json
  {
    "reviews": {"read": true, "write": false, "delete": false},
    "questions": {"read": true, "write": false, "delete": false},
    "posts": {"read": true, "write": false, "delete": false},
    "locations": {"read": true, "write": false, "delete": false},
    "settings": {"read": false, "write": false, "delete": false}
  }
  ```
- `status` (varchar) - active/inactive/suspended
- `joined_at` (timestamptz) - Membership start date

#### `team_invitations` (11 columns) - NEW ✨

**الاستخدام:** Pending invitations for users to join teams

- **Indexes:** 4
- **RLS Policies:** 3 (view, insert, update)
- **Unique Constraint:** (team_id, email, status)

**الأعمدة الرئيسية:**

- `id` (uuid, PK)
- `team_id` (uuid, FK → teams)
- `email` (varchar) - Invitee email
- `invited_by` (uuid, FK → auth.users) - Inviter
- `role` (varchar) - Role to assign
- `token` (varchar, unique) - Invitation token
- `expires_at` (timestamptz) - Expiration date
- `status` (varchar) - pending/accepted/expired/cancelled
- `accepted_at` (timestamptz) - Acceptance date
- `accepted_by` (uuid, FK → auth.users) - Who accepted

---

### 6. Utility Tables

#### `notifications` (18 columns) - 64 kB

**الاستخدام:** إشعارات النظام

#### `rate_limit_requests` (7 columns) - 48 kB

**الاستخدام:** Rate limiting

#### `performance_metrics` (7 columns) - 40 kB

**الاستخدام:** مقاييس أداء التطبيق

#### `weekly_task_recommendations` (17 columns) - 112 kB

**الاستخدام:** توصيات المهام الأسبوعية

#### `business_profile_history` (8 columns) - 1.9 MB

**الاستخدام:** تاريخ التغييرات على الملفات

#### `contact_submissions` (12 columns) - 40 kB

**الاستخدام:** نماذج الاتصال من الموقع

#### `newsletter_subscriptions` (7 columns) - 40 kB

**الاستخدام:** اشتراكات النشرة الإخبارية

#### `migration_log` (4 columns) - 32 kB

**الاستخدام:** سجل تطبيق المايقريشن

#### `question_auto_answers_log` (17 columns) - 64 kB

**الاستخدام:** سجل الإجابات التلقائية على الأسئلة

---

## 🔗 العلاقات الرئيسية (Foreign Keys)

```
auth.users (Supabase Auth)
├── profiles (user_id)
├── gmb_accounts (user_id)
├── ai_settings (user_id)
├── ai_requests (user_id)
├── auto_reply_settings (user_id)
└── ... (معظم الجداول)

gmb_accounts
└── gmb_locations (gmb_account_id)

gmb_locations
├── gmb_reviews (location_id)
├── gmb_questions (location_id)
├── gmb_posts (location_id)
├── gmb_media (location_id)
├── gmb_performance_metrics (location_id)
├── gmb_search_keywords (location_id)
├── ai_requests (location_id, nullable)
└── auto_reply_settings (location_id, nullable)
```

---

## 📑 Indexes الرئيسية

### أكثر الجداول indexing:

1. `gmb_locations` - 38 indexes
2. `gmb_reviews` - 37 indexes
3. `gmb_questions` - 28 indexes
4. `gmb_media` - 15 indexes
5. `gmb_posts` - 14 indexes

### Indexes المهمة:

- **User lookups:** indexes على `user_id` في جميع الجداول
- **Location lookups:** indexes على `location_id`
- **Time-based queries:** indexes على `created_at`, `updated_at`
- **GMB sync:** indexes على GMB IDs (review_id, question_id, etc)
- **Real-time:** indexes للـ real-time subscriptions

---

## 🔒 Row Level Security (RLS)

**عدد الـ Policies:** 100 policy

### النمط العام:

كل جدول له policies للـ:

- `SELECT` - المستخدمون يشوفوا بياناتهم فقط
- `INSERT` - المستخدمون يضيفوا لبياناتهم فقط
- `UPDATE` - المستخدمون يعدلوا بياناتهم فقط
- `DELETE` - المستخدمون يحذفوا بياناتهم فقط

### الاستثناءات:

- بعض الجداول `service_role` only
- بعض الجداول public read (محدودة جداً)

---

## 🎯 توافق مع Google APIs

### الجداول المرتبطة بـ Google APIs:

#### `mybusinessbusinessinformation` API:

- ✅ `gmb_locations` - Location data
- ✅ `gmb_locations.service_items` - Service items
- ✅ `gmb_locations.regular_hours` - Business hours
- ✅ `gmb_locations.special_hours` - Special hours
- ✅ `gmb_locations.categories` - Categories
- ✅ `gmb_locations.address` - Address

#### `mybusinessaccountmanagement` API:

- ✅ `gmb_accounts` - Account management

#### `mybusinessqanda` API:

- ✅ `gmb_questions` - Questions & Answers

#### Reviews (من Business Profile API):

- ✅ `gmb_reviews` - Reviews & replies

#### `mybusinessplaceactions` API:

- ⚠️ لم يتم التطبيق بعد (مخطط)

#### `mybusinesslodging` API:

- ⚠️ لم يتم التطبيق بعد (فنادق فقط)

---

## 📊 حجم البيانات

### أكبر 5 جداول:

1. `gmb_search_keywords` - 6.3 MB
2. `gmb_reviews` - 5.8 MB
3. `gmb_media` - 4.0 MB
4. `gmb_locations` - 2.9 MB
5. `business_profile_history` - 1.1 MB

**الحجم الإجمالي التقريبي:** ~25-30 MB (بيانات + indexes)

---

## 🔄 Real-time Tables

الجداول التي تستخدم Supabase Realtime:

- ✅ `gmb_locations` - تحديثات فورية للمواقع
- ✅ `gmb_questions` - أسئلة جديدة فورية
- ⚠️ `gmb_reviews` - (مخطط - لم يفعّل بعد)

---

## ⚠️ ملاحظات مهمة

### 1. البيانات الحساسة (Encrypted):

- `gmb_accounts.oauth_access_token`
- `gmb_accounts.oauth_refresh_token`
- `ai_settings.api_key`

### 2. JSONB Fields (مرنة):

تستخدم في:

- `gmb_locations`: categories, phone_numbers, service_items, hours
- `gmb_reviews`: metadata
- `gmb_questions`: top_answers
- معظم الجداول: metadata field

### 3. Timestamps:

جميع الجداول تحتوي على:

- `created_at` (timestamptz, default: now())
- `updated_at` (timestamptz, nullable أو with trigger)

### 4. UUIDs:

- جميع primary keys نوع `uuid`
- استخدام `gen_random_uuid()` كـ default

---

## 🔍 استخدام هذا المرجع

### قبل تعديل أي feature:

1. **راجع Google API docs:**

   ```
   google-api-docs/[api-name]/v1/*.json
   ```

2. **راجع Database Schema:**

   ```
   google-api-docs/DATABASE_SCHEMA.md (هذا الملف)
   database-schema.csv (التفاصيل الكاملة)
   ```

3. **تأكد من التوافق:**
   - الحقول في API = الحقول في Database
   - الأنواع متوافقة
   - العلاقات صحيحة

### للبحث عن حقل معين:

```bash
# في CSV file
grep "column_name,email" database-schema.csv

# للبحث عن جدول
grep "^--- TABLE ---.*gmb_locations" database-schema.csv
```

---

## 📁 الملفات المرجعية

- **هذا الملف:** `google-api-docs/DATABASE_SCHEMA.md`
- **Schema الكامل (CSV):** `database-schema.csv`
- **Google APIs:** `google-api-docs/[api-name]/`
- **Migrations:** `supabase/migrations/`

---

## 🔄 التحديث

لتحديث هذا المرجع:

```bash
# 1. Export من Supabase
# في Supabase SQL Editor، شغّل:
# scripts/export-complete-schema.sql

# 2. Export كـ CSV
# احفظ النتائج كـ: database-schema.csv

# 3. حدّث هذا الملف يدوياً أو استخدم:
# node scripts/generate-schema-docs.js
```

---

## 🚀 Performance Optimization Views

### `mv_user_dashboard_stats` (Materialized View)

**الاستخدام:** Pre-aggregated dashboard statistics for home page optimization
**Refresh:** Every 5 minutes (via `refresh_dashboard_stats_view()`)
**Migration:** `20251125000000_create_dashboard_stats_view.sql`
**Status:** ✅ Active (Replaced `v_dashboard_stats` view on 2025-11-25)

**الأعمدة:**

- `user_id` (uuid, PK)
- `locations_count` (bigint)
- `verified_locations_count` (bigint)
- `reviews_count` (bigint)
- `replied_reviews_count` (bigint)
- `average_rating` (numeric)
- `response_rate_percent` (numeric)
- `today_reviews_count` (bigint)
- `this_week_reviews_count` (bigint)
- `last_week_reviews_count` (bigint)
- `accounts_count` (bigint)
- `active_accounts_count` (bigint)
- `has_youtube` (boolean)
- `last_sync_at` (timestamptz)
- `calculated_at` (timestamptz)

**Indexes:**

- `idx_mv_dashboard_stats_user_id` (UNIQUE) - Fast user lookup
- `idx_mv_dashboard_stats_calculated_at` - Monitor freshness

**Functions:**

- `get_user_dashboard_stats(p_user_id UUID)` - Get stats with calculated fields
- `refresh_dashboard_stats_view()` - Refresh the materialized view

**Performance Impact:**

- ⚡ 90% faster queries
- 📉 Reduced from 10+ queries to 1
- 🎯 Load time: 800ms → 200ms

**Usage:**

```sql
-- Get dashboard stats for a user
SELECT * FROM get_user_dashboard_stats('user-uuid-here');

-- Refresh the view (called every 5 minutes)
SELECT refresh_dashboard_stats_view();
```

---

**آخر تحديث:** نوفمبر 25، 2025
**النسخة:** 0.9.0-beta
**عدد الجداول:** 26 جدول
**عدد الأعمدة:** 478 عمود
**عدد الـ Views:** 11 views (including 1 materialized view)
