# 🗄️ Database Schema Reference

## 📊 ملخص قاعدة البيانات

### الإحصائيات الكاملة:
```
الجداول:        26 جدول (added: activity_logs, gmb_performance_metrics)
الأعمدة:         478 عمود (added: 16 new columns)
Views:          10 views (added: v_dashboard_stats, mv_location_stats, v_health_score_distribution)
Functions:      99 functions (added: get_dashboard_trends, refresh_location_stats, calculate_location_health_score)
Indexes:        261 indexes (added: 8 new indexes)
Triggers:       23 triggers
Policies:       108 RLS policies (added: 8 new RLS policies)
Extensions:     10 extensions
```

---

## 📁 الجداول الرئيسية

### 1. GMB Core Tables (الجداول الأساسية)

#### `gmb_locations` (46 columns) - 2.9 MB
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

#### `gmb_reviews` (51 columns) - 5.8 MB
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

#### `gmb_questions` (37 columns) - 552 kB
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

#### `gmb_media` (13 columns) - 4.0 MB
**الاستخدام:** الصور والفيديوهات من GMB
- **Indexes:** 15
- **الحجم:** 4008 kB (ثالث أكبر جدول)

#### `gmb_posts` (24 columns) - 120 kB
**الاستخدام:** منشورات GMB
- **Indexes:** 14

---

### 2. Performance & Analytics Tables

#### `gmb_performance_metrics` (12 columns) - 864 kB
**الاستخدام:** إحصائيات الأداء اليومية من GMB

#### `gmb_search_keywords` (12 columns) - 6.3 MB
**الاستخدام:** كلمات البحث التي أدت لظهور الموقع
- **الحجم:** 6288 kB (أكبر جدول بيانات)

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

#### `auto_reply_settings` (22 columns) - 40 kB
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

---

### 4. System & Logging Tables

#### `audit_logs` (8 columns) - 224 kB
**الاستخدام:** سجل الأحداث الأمنية

#### `error_logs` (24 columns) - 88 kB
**الاستخدام:** سجل الأخطاء من Client & Server
- **Indexes:** 9

#### `activity_logs` (7 columns) - 504 kB
**الاستخدام:** سجل الأنشطة

#### `sync_status` (8 columns) - 112 kB
**الاستخدام:** حالة مزامنة GMB

#### `gmb_sync_logs` (12 columns) - 624 kB
**الاستخدام:** سجلات المزامنة التفصيلية

---

### 5. User & Auth Tables

#### `profiles` (10 columns) - 168 kB
**الاستخدام:** ملفات المستخدمين
- **Indexes:** 6

#### `oauth_states` (6 columns) - 160 kB
**الاستخدام:** OAuth flow temporary state
- **Indexes:** 6

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

#### `business_profile_history` (8 columns) - 1.1 MB
**الاستخدام:** تاريخ التغييرات على الملفات

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

**آخر تحديث:** نوفمبر 18، 2025  
**النسخة:** 0.9.0-beta  
**عدد الجداول:** 24 جدول  
**عدد الأعمدة:** 462 عمود

