# 📚 GMB Dashboard - مرجع شامل للداشبورد

> **آخر تحديث:** نوفمبر 2025  
> **الإصدار:** v2.0  
> **المنصة:** Next.js 14 App Router + Supabase

---

## 📖 جدول المحتويات

1. [نظرة عامة](#نظرة-عامة)
2. [صفحات الداشبورد](#صفحات-الداشبورد)
3. [API Routes](#api-routes)
4. [Server Actions](#server-actions)
5. [Dashboard Components](#dashboard-components)
6. [Services & Utilities](#services--utilities)
7. [Database Schema](#database-schema)
8. [Authentication & Security](#authentication--security)
9. [Data Flow](#data-flow)

---

## 🎯 نظرة عامة

**GMB Dashboard** هو نظام إدارة متكامل لـ Google My Business يتيح للمستخدمين:
- إدارة المواقع والحسابات
- متابعة وتحليل المراجعات
- إنشاء ونشر المنشورات
- الرد على الأسئلة
- تحليلات وإحصائيات متقدمة
- توصيات AI ذكية

**البنية التقنية:**
- **Frontend:** Next.js 14 (App Router) + TypeScript
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **Authentication:** Supabase Auth + OAuth (Google)
- **AI:** Multiple providers (Groq, Together AI, DeepSeek, OpenAI)
- **Styling:** Tailwind CSS 4 + shadcn/ui

---

## 📄 صفحات الداشبورد

### 1. Dashboard الرئيسية
**المسار:** `app/[locale]/(dashboard)/dashboard/page.tsx`

**الوظائف:**
- عرض الإحصائيات الرئيسية (Locations, Reviews, Rating, Response Rate)
- Health Score و Bottlenecks detection
- AI insights و recommendations
- Performance comparison charts
- Location highlights carousel
- Quick actions bar
- Realtime updates

**المكونات المستخدمة:**
```typescript
- StatsCards
- WelcomeHero
- PerformanceComparisonChart
- LocationHighlightsCarousel
- AIInsightsCard
- BottlenecksWidget
- WeeklyTasksWidget
- GamificationWidget
- QuickActionsBar
- LastSyncInfo
- RealtimeUpdatesIndicator
```

**الـ State Management:**
```typescript
interface DashboardStats {
  totalLocations: number;
  locationsTrend: number;
  averageRating: number;
  allTimeAverageRating: number;
  ratingTrend: number;
  totalReviews: number;
  reviewsTrend: number;
  responseRate: number;
  responseTarget: number;
  healthScore: number;
  pendingReviews: number;
  unansweredQuestions: number;
  monthlyComparison?: {...};
  locationHighlights?: [...];
  bottlenecks: [...];
}
```

---

### 2. Locations (إدارة المواقع)
**المسار:** `app/[locale]/(dashboard)/locations/page.tsx`

**الوظائف:**
- عرض قائمة المواقع مع Grid/List view
- البحث والفلترة (Status, Category, Search)
- عرض تفاصيل كل موقع (Rating, Reviews, Health Score)
- Sync مع Google My Business
- إدارة Attributes و Business Hours
- Google Maps integration

**المكونات المستخدمة:**
```typescript
- EnhancedLocationCard
- LocationsStats
- LocationsFilters
- GMBConnectionBanner
- LocationsErrorAlert
- LocationMapDashboard
```

**Data Fetching:**
```typescript
// استخدام caching hook
const { data, loading, error, refetch } = useLocationsData(filters);
const { data: statsData } = useLocationsStats();
```

---

### 3. Reviews (إدارة المراجعات)
**المسار:** `app/[locale]/(dashboard)/reviews/page.tsx`

**الوظائف:**
- Review Response Cockpit
- AI-generated reply suggestions
- Sentiment analysis
- Priority sorting
- Bulk actions

**المكونات المستخدمة:**
```typescript
- ReviewResponseCockpit
- SentimentAnalysisCard
- ReviewCard
- ReplyDialog
```

---

### 4. Analytics (التحليلات)
**المسار:** `app/[locale]/(dashboard)/analytics/page.tsx`

**الوظائف:**
- Performance metrics overview
- Traffic analysis
- Search keywords tracking
- Impressions breakdown
- Review sentiment trends

**المكونات المستخدمة:**
```typescript
- AnalyticsDashboard
- TrafficChart
- ImpressionsBreakdownChart
- ReviewSentimentChart
- PerformanceMetricsChart
```

---

### 5. GMB Posts (المنشورات)
**المسار:** `app/[locale]/(dashboard)/gmb-posts/page.tsx`

**الوظائف:**
- إنشاء منشورات جديدة
- جدولة المنشورات
- AI content generation
- Media upload
- Publishing لـ Google My Business

---

### 6. Questions (الأسئلة والأجوبة)
**المسار:** `app/[locale]/(dashboard)/questions/page.tsx`

**الوظائف:**
- عرض الأسئلة من العملاء
- AI-generated answers
- Publish answers لـ Google
- Questions history

**المكونات:**
```typescript
- QuestionAnswerCockpit
- QuestionsList
```

---

### 7. Settings (الإعدادات)
**المسار:** `app/[locale]/(dashboard)/settings/page.tsx`

**الوظائف:**
- GMB account management
- OAuth connection/disconnection
- Sync schedules
- Notification preferences
- Profile settings

---

## 🔌 API Routes

### GMB API Routes (`app/api/gmb/`)

#### 1. OAuth & Authentication

**`POST /api/gmb/create-auth-url`**
- **الوظيفة:** إنشاء Google OAuth URL للاتصال
- **الاستخدام:**
```typescript
const response = await fetch('/api/gmb/create-auth-url', {
  method: 'POST'
});
const { authUrl } = await response.json();
window.location.href = authUrl;
```

**`GET /api/gmb/oauth-callback`**
- **الوظيفة:** معالجة OAuth callback
- **العملية:**
  1. Validate state token
  2. Exchange code for tokens
  3. Fetch GMB accounts & locations
  4. Store in database
  5. Redirect to settings

**`POST /api/gmb/disconnect`**
- **الوظيفة:** قطع الاتصال بحساب GMB
- **Body:** `{ accountId?: string }`

---

#### 2. Accounts & Locations

**`GET /api/gmb/accounts`**
- **الوظيفة:** جلب كل حسابات GMB للمستخدم
- **الاستجابة:**
```typescript
Array<{
  id: string;
  account_id: string;
  account_name: string;
  email: string;
  is_active: boolean;
  last_sync: string;
  token_expires_at: string;
}>
```

**`GET /api/gmb/location/[locationId]`**
- **الوظيفة:** جلب تفاصيل موقع محدد
- **يتضمن:** Attributes, Google-updated info, business hours

**`PATCH /api/gmb/location/[locationId]/update`**
- **الوظيفة:** تحديث بيانات الموقع على Google
- **Body:** `{ title?, phoneNumbers?, websiteUri?, ... }`

**`GET /api/gmb/location/[locationId]/attributes`**
- **الوظيفة:** جلب attributes للموقع

**`PATCH /api/gmb/location/[locationId]/attributes`**
- **الوظيفة:** تحديث attributes

**`GET /api/gmb/location/[locationId]/reviews`**
- **الوظيفة:** جلب مراجعات موقع محدد
- **Parameters:** `page`, `pageSize`

**`GET /api/gmb/location/[locationId]/health`**
- **الوظيفة:** حساب Health Score للموقع

**`GET /api/gmb/location/list-data`**
- **الوظيفة:** جلب قائمة تفصيلية للمواقع مع metrics

---

#### 3. Data Sync

**`POST /api/gmb/sync`**
- **الوظيفة:** مزامنة يدوية للبيانات
- **Body:** `{ accountId: string, syncType?: 'full' | 'incremental' }`
- **يقوم بـ:**
  - Sync locations
  - Sync reviews
  - Sync media
  - Sync questions
  - Sync performance metrics
  - Sync search keywords

**`GET /api/gmb/scheduled-sync`**
- **الوظيفة:** Cron job للمزامنة التلقائية
- **الجدولة:** Hourly (Vercel Cron)
- **Authorization:** Bearer token (`CRON_SECRET`)

---

#### 4. Posts Management

**`POST /api/gmb/posts/create`**
- **الوظيفة:** إنشاء منشور جديد
- **Body:**
```typescript
{
  locationId: string;
  summary: string;
  callToAction?: {...};
  media?: [...];
  topicType?: string;
}
```

**`POST /api/gmb/posts/publish`**
- **الوظيفة:** نشر منشور على Google

**`GET /api/gmb/posts/list`**
- **الوظيفة:** جلب قائمة المنشورات

**`PATCH /api/gmb/posts/[postId]`**
- **الوظيفة:** تحديث منشور

**`DELETE /api/gmb/posts/[postId]`**
- **الوظيفة:** حذف منشور

---

#### 5. Questions & Answers

**`GET /api/gmb/questions`**
- **الوظيفة:** جلب الأسئلة من Google

**`POST /api/gmb/questions`**
- **الوظيفة:** إنشاء سؤال جديد

**`POST /api/gmb/questions/[questionId]/answer`**
- **الوظيفة:** نشر إجابة على سؤال

---

#### 6. Utilities

**`GET /api/gmb/attributes`**
- **الوظيفة:** جلب Attribute metadata

**`GET /api/gmb/categories`**
- **الوظيفة:** البحث عن Categories

**`GET /api/gmb/chains/search`**
- **الوظيفة:** البحث عن Chains
- **Parameters:** `chainName`

**`POST /api/gmb/google-locations/search`**
- **الوظيفة:** البحث عن Google locations

**`GET /api/gmb/media`**
- **الوظيفة:** جلب Media items

---

### Dashboard API Routes (`app/api/dashboard/`)

**`GET /api/dashboard/stats`**
- **الوظيفة:** جلب إحصائيات الداشبورد الشاملة
- **Parameters:** 
  - `start`: تاريخ البداية (ISO string)
  - `end`: تاريخ النهاية (ISO string)
- **الاستجابة:**
```typescript
{
  totalLocations: number;
  locationsTrend: number;
  averageRating: number;
  allTimeAverageRating: number;
  ratingTrend: number;
  totalReviews: number;
  reviewsTrend: number;
  responseRate: number;
  healthScore: number;
  pendingReviews: number;
  unansweredQuestions: number;
  monthlyComparison: {...};
  locationHighlights: [...];
  bottlenecks: [...];
}
```

**الميزات الأمنية:**
- ✅ Authentication validation (`getUser()`)
- ✅ Rate limiting (Upstash Redis)
- ✅ Input validation (Zod)
- ✅ SQL injection prevention
- ✅ Error suppression for `AuthSessionMissingError`

---

### Locations API Routes (`app/api/locations/`)

**`GET /api/locations/map-data`**
- **الوظيفة:** جلب بيانات المواقع لـ Google Maps
- **الاستجابة:**
```typescript
Array<{
  id: string;
  name: string;
  coordinates: { lat: number; lng: number };
  rating: number;
  reviewCount: number;
  address: string;
  phone: string;
  category: string;
}>
```

**`GET /api/locations/competitor-data`**
- **الوظيفة:** جلب بيانات المنافسين
- **Parameters:** `locationId`

**`POST /api/locations/bulk-publish`**
- **الوظيفة:** نشر تحديثات جماعية
- **Body:** `{ locationIds: string[], updates: {...} }`

---

### Reviews API Routes (`app/api/reviews/`)

**`GET /api/reviews`**
- **الوظيفة:** جلب المراجعات مع فلترة
- **Parameters:** `locationId`, `status`, `sentiment`, `page`

---

### AI API Routes (`app/api/ai/`)

**`POST /api/ai/generate`**
- **الوظيفة:** توليد محتوى AI عام
- **Body:** `{ prompt: string, tone?: string, type?: string }`

**`POST /api/ai/generate-post`**
- **الوظيفة:** توليد محتوى منشور GMB
- **Body:** `{ businessName, category, occasion?, ... }`

**`POST /api/ai/generate-review-reply`**
- **الوظيفة:** توليد رد على مراجعة
- **Body:** `{ reviewText, rating, businessName, tone? }`

**AI Providers Fallback:**
```
Groq → Together AI → DeepSeek → OpenAI GPT-4
```

---

## ⚡ Server Actions

Server Actions هي functions من جهة السيرفر تستدعى من Client Components.

### Dashboard Actions (`server/actions/dashboard.ts`)

**`getDashboardStats()`**
```typescript
export async function getDashboardStats() {
  // Authentication
  const { user } = await supabase.auth.getUser();
  
  // Fetch data
  const locations = await supabase.from('gmb_locations')...
  const reviews = await supabase.from('gmb_reviews')...
  
  // Calculate metrics
  return {
    totalLocations,
    totalReviews,
    averageRating,
    responseRate
  };
}
```

**`getActivityLogs(limit = 10)`**
- جلب سجل الأنشطة الأخيرة

**`getMonthlyStats()`**
- حساب الإحصائيات الشهرية
- Group by month
- Return chart data

---

### Locations Actions (`server/actions/locations.ts`)

**`getLocations()`**
```typescript
export async function getLocations() {
  const { user } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('gmb_locations')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
    
  return { locations: data, error };
}
```

**`addLocation(locationData)`**
- إضافة موقع جديد
- ✅ Validation with Zod
- ✅ Automatic `user_id` association

**`updateLocation(locationId, updates)`**
- تحديث موقع موجود
- ✅ Ownership verification

**`deleteLocation(locationId)`**
- حذف موقع
- ✅ Ownership verification

---

### Reviews Actions (`server/actions/reviews.ts`)

**`getReviews(locationId?)`**
- جلب المراجعات (كل المواقع أو موقع محدد)

**`updateReviewStatus(reviewId, status)`**
- تحديث حالة المراجعة
- Status: `new` | `in_progress` | `responded`

**`addReviewReply(reviewId, reply)`**
- إضافة رد على مراجعة
- Auto-update status to `responded`
- Set `responded_at` timestamp

---

### Accounts Actions (`server/actions/accounts.ts`)

**`getAccounts()`**
- جلب حسابات GMB

**`deleteAccount(accountId)`**
- حذف حساب

**`syncAccount(accountId)`**
- تشغيل مزامنة يدوية

---

## 🧩 Dashboard Components

### Core Components

#### 1. StatsCards
**المسار:** `components/dashboard/stats-cards.tsx`

**الوظيفة:** عرض الإحصائيات الرئيسية في بطاقات

**Props:**
```typescript
interface StatsCardsProps {
  loading?: boolean;
  data?: {
    totalLocations: number;
    locationsTrend: number;
    averageRating: number;
    ratingTrend: number;
    totalReviews: number;
    reviewsTrend: number;
    responseRate: number;
    responseTarget: number;
  };
}
```

**الاستخدام:**
```tsx
<StatsCards loading={loading} data={stats} />
```

---

#### 2. WelcomeHero
**المسار:** `components/dashboard/welcome-hero.tsx`

**الوظيفة:** رسالة ترحيبية مع Profile Strength

**Props:**
```typescript
interface WelcomeHeroProps {
  userName?: string;
  profileStrength: number;
  tasksRemaining: number;
  estimatedMinutes: number;
  loading?: boolean;
}
```

**الميزات:**
- Progress bar animation
- Dynamic strength labels (Getting Started → Expert)
- Color-coded by completion

---

#### 3. PerformanceComparisonChart
**المسار:** `components/dashboard/performance-comparison-chart.tsx`

**الوظيفة:** مقارنة الأداء بين فترتين

**Props:**
```typescript
interface PerformanceComparisonChartProps {
  data?: {
    current: { reviews, rating, questions };
    previous: { reviews, rating, questions };
  };
  loading?: boolean;
}
```

---

#### 4. AIInsightsWidget
**المسار:** `components/dashboard/ai-insights-widget.tsx`

**الوظيفة:** توصيات AI ذكية

**العملية:**
1. Fetch GMB accounts & locations
2. Fetch reviews data
3. Calculate metrics (avg rating, response rate)
4. Generate AI insights based on thresholds
5. Display with priority badges

**Insight Types:**
- Rating insights (low/high rating alerts)
- Response rate recommendations
- Review volume analysis
- Custom business tips

---

#### 5. BottlenecksWidget
**المسار:** `components/dashboard/bottlenecks-widget.tsx`

**الوظيفة:** تحديد المشاكل والفرص

**Severity Levels:**
- `high`: Red (AlertTriangle)
- `medium`: Yellow (Clock)
- `low`: Blue (TrendingUp)

**Bottleneck Types:**
- Response (pending reviews)
- Reviews (low rating)
- Content (missing posts)
- Compliance (missing info)
- General

---

#### 6. LocationHighlightsCarousel
**المسار:** `components/dashboard/location-highlights-carousel.tsx`

**الوظيفة:** عرض أبرز المواقع

**Categories:**
- `top`: Top performers (5★ rating)
- `attention`: Need attention (low rating, many pending)
- `improved`: Recently improved (positive trend)

---

#### 7. GamificationWidget
**المسار:** `components/dashboard/gamification-widget.tsx`

**الوظيفة:** عرض Progress و Badges

**الميزات:**
- Goal tracking
- Achievement badges
- Progress bars
- Streak counter

---

#### 8. QuickActionsBar
**المسار:** `components/dashboard/quick-actions-bar.tsx`

**الوظيفة:** روابط سريعة للإجراءات

**Actions:**
- Reply to reviews
- Answer questions
- Create post
- View analytics

---

#### 9. LastSyncInfo
**المسار:** `components/dashboard/last-sync-info.tsx`

**الوظيفة:** عرض آخر مزامنة

**الميزات:**
- Last sync timestamp
- Manual sync button
- Disconnect option
- Syncing indicator

---

#### 10. RealtimeUpdatesIndicator
**المسار:** `components/dashboard/realtime-updates-indicator.tsx`

**الوظيفة:** عرض آخر تحديث مع countdown

**الميزات:**
- Auto-refresh every 30s
- Countdown timer
- Manual refresh button

---

#### 11. DateRangeControls
**المسار:** `components/dashboard/date-range-controls.tsx`

**الوظيفة:** اختيار فترة زمنية

**Presets:**
- Last 7 Days
- Last 30 Days
- Last 90 Days
- Custom range

---

#### 12. ExportShareBar
**المسار:** `components/dashboard/export-share-bar.tsx`

**الوظيفة:** تصدير ومشاركة التقارير

**Actions:**
- Export PDF (print dialog)
- Copy share link

---

### Analytics Components

**المسار:** `components/analytics/`

- `analytics-dashboard.tsx`
- `traffic-chart.tsx`
- `performance-metrics-chart.tsx`
- `review-sentiment-chart.tsx`
- `impressions-breakdown-chart.tsx`
- `search-keywords.tsx`

---

### Locations Components

**المسار:** `components/locations/`

**أهم المكونات:**
- `enhanced-location-card.tsx`: بطاقة موقع محسّنة
- `locations-stats.tsx`: إحصائيات المواقع
- `locations-filters.tsx`: فلاتر البحث
- `LocationMapDashboard.tsx`: خريطة Google
- `location-profile-enhanced.tsx`: ملف موقع مفصل
- `gmb-connection-banner.tsx`: Banner للاتصال بـ GMB

---

### Reviews Components

**المسار:** `components/reviews/`

- `ReviewResponseCockpit.tsx`: Cockpit للردود
- `review-card.tsx`: بطاقة مراجعة
- `reply-dialog.tsx`: Dialog للرد
- `reviews-list.tsx`: قائمة المراجعات

---

## 🔧 Services & Utilities

### Authentication Service
**المسار:** `lib/services/auth-service.ts`

**الوظائف المتاحة:**

```typescript
// Sign up
await authService.signUp(email, password, fullName);

// Sign in
await authService.signIn(email, password, rememberMe);

// OAuth
await authService.signInWithOAuth('google');

// Sign out
await authService.signOut();

// Password reset
await authService.resetPassword(email);

// Update password
await authService.updatePassword(newPassword);

// Get user (✅ Secure)
const user = await authService.getUser();

// ⚠️ Deprecated: getSession() - غير آمن!
// استخدم getUser() بدلاً منه
```

**⚠️ Security Warning:**
- `getSession()` marked as **deprecated**
- Reads from cookies without server validation
- Use `getUser()` for secure authentication

---

### Auth Middleware
**المسار:** `lib/api/auth-middleware.ts`

**الاستخدام:**
```typescript
import { withAuth } from '@/lib/api/auth-middleware';

export const GET = withAuth(async (request, user) => {
  // user is authenticated
  // user.id, user.email available
  
  return NextResponse.json({ data: '...' });
});
```

**الميزات:**
- ✅ Automatic authentication check
- ✅ Session expiration handling
- ✅ Error responses (401, 500)
- ✅ Uses secure `getUser()` method

---

### Email Service
**المسار:** `lib/services/email-service.ts`

**Providers:**
- SendGrid (primary)
- Nodemailer (fallback)

**Custom Templates:**
- `supabase-email-templates/`

---

### Activity Service
**المسار:** `lib/services/activity.ts`

**الوظيفة:** تسجيل الأنشطة في `activity_logs` table

---

### Supabase Clients
**المسار:** `lib/supabase/`

**ثلاثة أنواع من Clients:**

1. **Client-side** (`lib/supabase/client.ts`)
```typescript
import { createClient } from '@/lib/supabase/client';
const supabase = createClient();
```

2. **Server-side** (`lib/supabase/server.ts`)
```typescript
import { createClient } from '@/lib/supabase/server';
const supabase = await createClient();
```

3. **Admin** (`lib/supabase/server.ts`)
```typescript
import { createAdminClient } from '@/lib/supabase/server';
const supabase = createAdminClient();
// Bypasses RLS - use carefully!
```

---

### Utilities

**`lib/utils/sanitize.ts`**
- SQL injection prevention
- XSS protection
- Input sanitization

**`lib/utils/api-error-handler.ts`**
- Centralized error handling
- User-friendly error messages

**`lib/utils/performance-calculations.ts`**
- Health score calculation
- Trend analysis
- Metrics aggregation

**`lib/rate-limit.ts`**
- Upstash Redis rate limiting
- Configurable limits per user

---

## 💾 Database Schema

### 1. gmb_accounts
**الوظيفة:** تخزين حسابات Google My Business

```sql
CREATE TABLE gmb_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  account_name TEXT NOT NULL,
  email TEXT,
  google_account_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  last_sync TIMESTAMPTZ,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
```sql
CREATE INDEX idx_gmb_accounts_user_id ON gmb_accounts(user_id);
CREATE INDEX idx_gmb_accounts_is_active ON gmb_accounts(is_active);
```

**RLS Policies:**
```sql
-- Users can only see their own accounts
CREATE POLICY "Users can view own accounts"
  ON gmb_accounts FOR SELECT
  USING (auth.uid() = user_id);
```

---

### 2. gmb_locations
**الوظيفة:** تخزين مواقع الأعمال

```sql
CREATE TABLE gmb_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gmb_account_id UUID REFERENCES gmb_accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL,
  normalized_location_id TEXT,
  location_name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  website TEXT,
  category TEXT,
  type TEXT,
  rating NUMERIC(2,1),
  review_count INTEGER DEFAULT 0,
  response_rate NUMERIC(5,2),
  is_active BOOLEAN DEFAULT true,
  is_syncing BOOLEAN DEFAULT false,
  status TEXT, -- 'verified', 'pending', 'suspended'
  latitude NUMERIC,
  longitude NUMERIC,
  business_hours JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  ai_insights TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Key Fields in metadata:**
```json
{
  "health_score": 85,
  "visibility_score": 90,
  "mediaCount": 15,
  "postsCount": 8,
  "serviceItems": [...],
  "insights_json": {...},
  "last_sync": "2025-11-05T12:00:00Z"
}
```

**Indexes:**
```sql
CREATE INDEX idx_gmb_locations_user_id ON gmb_locations(user_id);
CREATE INDEX idx_gmb_locations_account_id ON gmb_locations(gmb_account_id);
CREATE INDEX idx_gmb_locations_location_id ON gmb_locations(location_id);
```

---

### 3. gmb_reviews
**الوظيفة:** تخزين مراجعات العملاء

```sql
CREATE TABLE gmb_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID REFERENCES gmb_locations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  gmb_account_id UUID REFERENCES gmb_accounts(id),
  external_review_id TEXT,
  review_id TEXT NOT NULL,
  reviewer_name TEXT NOT NULL,
  rating INTEGER NOT NULL, -- 1-5
  comment TEXT,
  review_text TEXT,
  review_reply TEXT,
  reply_text TEXT,
  review_date TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  reply_date TIMESTAMPTZ,
  has_reply BOOLEAN DEFAULT false,
  ai_suggested_reply TEXT,
  ai_generated_response TEXT,
  ai_sentiment TEXT, -- 'positive', 'neutral', 'negative'
  status TEXT DEFAULT 'new', -- 'new', 'in_progress', 'responded'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
```sql
CREATE INDEX idx_gmb_reviews_location_id ON gmb_reviews(location_id);
CREATE INDEX idx_gmb_reviews_user_id ON gmb_reviews(user_id);
CREATE INDEX idx_gmb_reviews_status ON gmb_reviews(status);
CREATE INDEX idx_gmb_reviews_rating ON gmb_reviews(rating);
CREATE INDEX idx_gmb_reviews_review_date ON gmb_reviews(review_date DESC);
```

---

### 4. gmb_posts
**الوظيفة:** تخزين المنشورات

```sql
CREATE TABLE gmb_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID REFERENCES gmb_locations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id TEXT,
  summary TEXT NOT NULL,
  call_to_action JSONB,
  media JSONB,
  topic_type TEXT,
  state TEXT, -- 'DRAFT', 'LIVE', 'PROCESSING'
  published_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 5. oauth_states
**الوظيفة:** تخزين OAuth state tokens (أمان)

```sql
CREATE TABLE oauth_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  state TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  used BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Auto-cleanup:**
```sql
-- Delete expired states
DELETE FROM oauth_states WHERE expires_at < now();
```

---

### 6. oauth_tokens
**الوظيفة:** تخزين OAuth access/refresh tokens

```sql
CREATE TABLE oauth_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'google_gmb', 'google_youtube'
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 7. profiles
**الوظيفة:** ملفات المستخدمين

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 8. activity_logs
**الوظيفة:** سجل الأنشطة

```sql
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 9. ai_generation_history
**الوظيفة:** سجل توليد AI

```sql
CREATE TABLE ai_generation_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  generated_content TEXT NOT NULL,
  provider TEXT, -- 'groq', 'together', 'deepseek', 'openai'
  type TEXT, -- 'post', 'review_reply', 'general'
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 10. notifications
**الوظيفة:** إشعارات المستخدمين

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT, -- 'info', 'success', 'warning', 'error'
  read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 🔐 Authentication & Security

### Authentication Flow

**1. Email/Password Sign Up:**
```
User fills form → authService.signUp() 
  → Supabase Auth creates user 
  → Trigger creates profile 
  → Verification email sent
  → User confirms email 
  → Redirect to dashboard
```

**2. Email/Password Sign In:**
```
User enters credentials → authService.signIn() 
  → Supabase validates 
  → Session created 
  → Cookies set 
  → Redirect to dashboard
```

**3. Google OAuth:**
```
User clicks "Sign in with Google" 
  → authService.signInWithOAuth('google') 
  → Redirect to Google 
  → User authorizes 
  → Callback to /auth/callback 
  → Supabase exchanges code for session 
  → Redirect to dashboard
```

---

### GMB OAuth Flow

**Connection:**
```
1. User clicks "Connect GMB"
2. POST /api/gmb/create-auth-url
   - Generate random state
   - Store in oauth_states (30min expiry)
   - Return Google OAuth URL
3. Redirect to Google
4. User authorizes
5. Google redirects to /api/gmb/oauth-callback
6. Validate state from oauth_states
7. Mark state as used
8. Exchange code for tokens
9. Store tokens in oauth_tokens
10. Fetch GMB accounts & locations
11. Store in gmb_accounts & gmb_locations
12. Trigger initial sync
13. Redirect to settings
```

**Token Refresh:**
```typescript
async function getValidAccessToken(accountId) {
  // Check if token expired
  if (now >= token_expires_at) {
    // Refresh token
    const tokens = await refreshAccessToken(refresh_token);
    
    // Update database
    await supabase.from('gmb_accounts')
      .update({
        access_token: tokens.access_token,
        token_expires_at: new Date(now + tokens.expires_in)
      })
      .eq('id', accountId);
    
    return tokens.access_token;
  }
  
  return current_access_token;
}
```

---

### Security Best Practices

**1. Authentication Validation:**
```typescript
// ✅ CORRECT - Secure
const { data: { user }, error } = await supabase.auth.getUser();

// ❌ WRONG - Insecure (deprecated)
const { data: { session }, error } = await supabase.auth.getSession();
```

**2. API Route Protection:**
```typescript
// Use withAuth middleware
export const GET = withAuth(async (request, user) => {
  // user is authenticated
});
```

**3. Row Level Security (RLS):**
```sql
-- All tables have RLS enabled
ALTER TABLE gmb_locations ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users access own data"
  ON gmb_locations FOR ALL
  USING (auth.uid() = user_id);
```

**4. Input Validation:**
```typescript
// Use Zod schemas
const schema = z.object({
  locationId: z.string().uuid(),
  updates: z.object({...})
});

const validated = schema.parse(input);
```

**5. SQL Injection Prevention:**
```typescript
// Use parameterized queries (Supabase handles this)
await supabase
  .from('gmb_locations')
  .select('*')
  .eq('user_id', user.id) // ✅ Safe
  
// Never use raw SQL with user input
// ❌ DANGEROUS: `SELECT * FROM locations WHERE id = '${userId}'`
```

**6. Rate Limiting:**
```typescript
// Check rate limit before processing
const { success } = await checkRateLimit(user.id);
if (!success) {
  return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
}
```

**7. Error Handling:**
```typescript
// Suppress expected errors in production
if (authError && authError.name !== 'AuthSessionMissingError') {
  console.error('Unexpected auth error:', authError);
}

// Log actual failures
console.error('Database error:', dbError);
```

---

## 🔄 Data Flow

### Dashboard Stats Flow

```
┌─────────────────┐
│  User opens     │
│  Dashboard      │
└────────┬────────┘
         │
         v
┌─────────────────────────────┐
│  useEffect triggers         │
│  fetchDashboardStats()      │
└────────┬────────────────────┘
         │
         v
┌─────────────────────────────┐
│  GET /api/dashboard/stats   │
│  - Authenticate with        │
│    getUser()                │
│  - Rate limit check         │
│  - Validate date params     │
└────────┬────────────────────┘
         │
         v
┌─────────────────────────────┐
│  Fetch from Supabase:       │
│  - gmb_locations            │
│  - gmb_reviews              │
│  - gmb_posts (optional)     │
│  - gmb_questions (optional) │
└────────┬────────────────────┘
         │
         v
┌─────────────────────────────┐
│  Calculate Metrics:         │
│  - Total locations/reviews  │
│  - Average rating           │
│  - Response rate            │
│  - Health score             │
│  - Trends (vs previous)     │
│  - Bottlenecks detection    │
│  - Location highlights      │
└────────┬────────────────────┘
         │
         v
┌─────────────────────────────┐
│  Return JSON response       │
└────────┬────────────────────┘
         │
         v
┌─────────────────────────────┐
│  Update React state         │
│  setStats(data)             │
└────────┬────────────────────┘
         │
         v
┌─────────────────────────────┐
│  Re-render Dashboard        │
│  Components:                │
│  - StatsCards               │
│  - PerformanceChart         │
│  - BottlenecksWidget        │
│  - AIInsightsWidget         │
└─────────────────────────────┘
```

---

### GMB Sync Flow

```
┌──────────────────┐
│  User clicks     │
│  "Sync Now"      │
└────────┬─────────┘
         │
         v
┌─────────────────────────────┐
│  POST /api/gmb/sync         │
│  Body: { accountId }        │
└────────┬────────────────────┘
         │
         v
┌─────────────────────────────┐
│  Authenticate & validate    │
└────────┬────────────────────┘
         │
         v
┌─────────────────────────────┐
│  Get valid access token     │
│  (refresh if needed)        │
└────────┬────────────────────┘
         │
         v
┌─────────────────────────────┐
│  Fetch from Google APIs:    │
│  1. Locations               │
│  2. Reviews                 │
│  3. Media                   │
│  4. Questions               │
│  5. Performance metrics     │
│  6. Search keywords         │
└────────┬────────────────────┘
         │
         v
┌─────────────────────────────┐
│  Process & Transform Data   │
│  - Parse locations          │
│  - Convert ratings          │
│  - Extract metadata         │
└────────┬────────────────────┘
         │
         v
┌─────────────────────────────┐
│  Upsert to Supabase:        │
│  - gmb_locations (upsert)   │
│  - gmb_reviews (upsert)     │
│  - gmb_posts (upsert)       │
│  - gmb_insights (insert)    │
└────────┬────────────────────┘
         │
         v
┌─────────────────────────────┐
│  Update last_sync timestamp │
└────────┬────────────────────┘
         │
         v
┌─────────────────────────────┐
│  Trigger Realtime updates   │
│  (Supabase Realtime)        │
└────────┬────────────────────┘
         │
         v
┌─────────────────────────────┐
│  Client receives update     │
│  via subscription           │
└────────┬────────────────────┘
         │
         v
┌─────────────────────────────┐
│  Auto-refresh UI            │
│  (no page reload needed)    │
└─────────────────────────────┘
```

---

### Realtime Updates Flow

```
┌─────────────────────────────┐
│  Component mounts           │
└────────┬────────────────────┘
         │
         v
┌─────────────────────────────┐
│  useDashboardRealtime()     │
│  hook initializes           │
└────────┬────────────────────┘
         │
         v
┌─────────────────────────────┐
│  Subscribe to Supabase      │
│  Realtime channels:         │
│  - gmb_locations            │
│  - gmb_reviews              │
└────────┬────────────────────┘
         │
         v
┌─────────────────────────────┐
│  Listen for events:         │
│  - INSERT                   │
│  - UPDATE                   │
│  - DELETE                   │
└────────┬────────────────────┘
         │
         v
┌─────────────────────────────┐
│  On event received:         │
│  - Update local state       │
│  - Invalidate cache         │
│  - Trigger re-render        │
└────────┬────────────────────┘
         │
         v
┌─────────────────────────────┐
│  Component unmounts         │
│  → Unsubscribe from channel │
└─────────────────────────────┘
```

---

### Review Reply Flow

```
┌──────────────────┐
│  User views      │
│  pending review  │
└────────┬─────────┘
         │
         v
┌─────────────────────────────┐
│  Click "Generate Reply"     │
└────────┬────────────────────┘
         │
         v
┌─────────────────────────────┐
│  POST /api/ai/              │
│  generate-review-reply      │
│  Body: {                    │
│    reviewText,              │
│    rating,                  │
│    businessName,            │
│    tone                     │
│  }                          │
└────────┬────────────────────┘
         │
         v
┌─────────────────────────────┐
│  AI Provider Fallback:      │
│  1. Try Groq                │
│  2. Try Together AI         │
│  3. Try DeepSeek            │
│  4. Try OpenAI GPT-4        │
└────────┬────────────────────┘
         │
         v
┌─────────────────────────────┐
│  Return generated reply     │
└────────┬────────────────────┘
         │
         v
┌─────────────────────────────┐
│  User reviews & edits       │
│  (optional)                 │
└────────┬────────────────────┘
         │
         v
┌─────────────────────────────┐
│  Click "Publish Reply"      │
└────────┬────────────────────┘
         │
         v
┌─────────────────────────────┐
│  Server Action:             │
│  addReviewReply()           │
└────────┬────────────────────┘
         │
         v
┌─────────────────────────────┐
│  Update Supabase:           │
│  - Set review_reply         │
│  - Set status='responded'   │
│  - Set responded_at         │
└────────┬────────────────────┘
         │
         v
┌─────────────────────────────┐
│  (Optional) Publish to      │
│  Google My Business         │
└────────┬────────────────────┘
         │
         v
┌─────────────────────────────┐
│  UI updates automatically   │
│  (Realtime subscription)    │
└─────────────────────────────┘
```

---

## 📝 Usage Examples

### Example 1: Fetch Dashboard Stats

```typescript
// Client Component
'use client';

import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/dashboard/stats?start=2025-10-01&end=2025-11-05');
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Dashboard</h1>
      <StatsCards data={stats} />
      <PerformanceChart data={stats.monthlyComparison} />
    </div>
  );
}
```

---

### Example 2: Connect GMB Account

```typescript
'use client';

export default function SettingsPage() {
  const handleConnectGMB = async () => {
    try {
      // 1. Create auth URL
      const response = await fetch('/api/gmb/create-auth-url', {
        method: 'POST',
      });
      
      const { authUrl } = await response.json();
      
      // 2. Redirect to Google
      window.location.href = authUrl;
      
      // 3. User authorizes
      // 4. Google redirects to /api/gmb/oauth-callback
      // 5. Callback handles token exchange & data sync
      // 6. Redirects back to settings
      
    } catch (error) {
      console.error('Failed to connect GMB:', error);
    }
  };

  return (
    <button onClick={handleConnectGMB}>
      Connect Google My Business
    </button>
  );
}
```

---

### Example 3: Sync GMB Data

```typescript
const handleSync = async (accountId: string) => {
  try {
    setSyncing(true);
    
    const response = await fetch('/api/gmb/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        accountId,
        syncType: 'full' // or 'incremental'
      }),
    });
    
    const result = await response.json();
    
    console.log('Sync completed:', result.counts);
    toast.success('Data synced successfully!');
    
    // Refresh data
    refetchLocations();
    
  } catch (error) {
    console.error('Sync failed:', error);
    toast.error('Failed to sync data');
  } finally {
    setSyncing(false);
  }
};
```

---

### Example 4: Use Server Action

```typescript
'use client';

import { getLocations } from '@/server/actions/locations';

export default function LocationsPage() {
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    async function loadLocations() {
      const { locations, error } = await getLocations();
      
      if (error) {
        console.error('Failed to load locations:', error);
        return;
      }
      
      setLocations(locations);
    }

    loadLocations();
  }, []);

  return (
    <div>
      {locations.map((location) => (
        <LocationCard key={location.id} location={location} />
      ))}
    </div>
  );
}
```

---

### Example 5: Realtime Subscription

```typescript
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const supabase = createClient();

  useEffect(() => {
    // Initial fetch
    fetchReviews();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('reviews-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'gmb_reviews',
        },
        (payload) => {
          console.log('Review changed:', payload);
          
          // Update local state
          if (payload.eventType === 'INSERT') {
            setReviews((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setReviews((prev) =>
              prev.map((r) => (r.id === payload.new.id ? payload.new : r))
            );
          } else if (payload.eventType === 'DELETE') {
            setReviews((prev) => prev.filter((r) => r.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchReviews() {
    const { data, error } = await supabase
      .from('gmb_reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setReviews(data);
  }

  return (
    <div>
      {reviews.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
    </div>
  );
}
```

---

## 🎯 Quick Reference

### إحصائيات سريعة

| الفئة | العدد |
|------|------|
| صفحات Dashboard | 15+ |
| API Routes | 40+ |
| Server Actions | 15+ |
| Dashboard Components | 25+ |
| Database Tables | 10+ |
| AI Providers | 4 |

---

### الأوامر المهمة

```bash
# Development
npm run dev

# Build
npm run build

# Supabase
supabase start
supabase db push

# Type generation
npm run types

# Lint
npm run lint
```

---

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Google OAuth
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=http://localhost:5000/api/gmb/oauth-callback

# AI Providers
GROQ_API_KEY=xxx
TOGETHER_API_KEY=xxx
DEEPSEEK_API_KEY=xxx
OPENAI_API_KEY=xxx

# SendGrid
SENDGRID_API_KEY=xxx

# Upstash Redis (Rate Limiting)
UPSTASH_REDIS_REST_URL=xxx
UPSTASH_REDIS_REST_TOKEN=xxx

# Cron Secret
CRON_SECRET=xxx
```

---

## 📞 Support & Resources

**Documentation:**
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Google My Business API](https://developers.google.com/my-business)
- [shadcn/ui](https://ui.shadcn.com)

**Internal Docs:**
- `replit.md` - Project overview
- `UI_UX_AUDIT_REPORT.md` - UI/UX audit
- `code-auditor/HOW_TO_USE.md` - Code auditor guide

---

**تم إنشاؤه بواسطة:** Replit Agent  
**التاريخ:** نوفمبر 2025  
**الإصدار:** 2.0
