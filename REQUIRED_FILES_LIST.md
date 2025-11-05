# 📋 قائمة الملفات المطلوبة لبناء الداشبورد

> **ملاحظة مهمة:** هذا الملف يحتوي على أسماء الملفات والوصف فقط - **بدون كود**.  
> المطلوب بناء كل ملف من الصفر بشكل صحيح وآمن.

---

## 🎯 نظرة عامة

**إجمالي الملفات المطلوبة:** ~70 ملف  
**المدة المتوقعة للبناء:** 3-4 أسابيع لفريق من 2-3 مطورين

---

## 📁 هيكل المشروع

```
project-root/
├── app/                      # Next.js 14 App Router
│   ├── [locale]/            # i18n routing
│   │   ├── (dashboard)/     # Dashboard pages
│   │   └── auth/            # Authentication pages
│   └── api/                 # API routes
├── components/              # React components
├── server/                  # Server actions
├── lib/                     # Utilities & services
├── messages/                # i18n translations
├── public/                  # Static assets
└── sql/                     # Database migrations
```

---

## 🌐 Google My Business APIs المستخدمة

> **ملاحظة:** هذه قائمة بجميع Google APIs المطلوبة للمشروع.  
> المطور لازم يستخدم الـ credentials الموجودة عندك (Client ID & Secret).

### OAuth 2.0 Configuration

#### **Required Scopes:**
```
https://www.googleapis.com/auth/business.manage
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile
openid
```

#### **Redirect URI Format:**
```
https://your-domain.com/api/gmb/oauth-callback
```

---

### 1. Google My Business Account Management API

**Base URL:** `https://mybusinessaccountmanagement.googleapis.com/v1`

#### **الوظيفة:**
جلب قائمة حسابات GMB للمستخدم

#### **Endpoints المستخدمة:**

##### `GET /accounts`
**الوصف:** جلب كل حسابات GMB  
**Response:**
```json
{
  "accounts": [
    {
      "name": "accounts/123456789",
      "accountName": "My Business Account",
      "type": "PERSONAL",
      "role": "OWNER"
    }
  ]
}
```

**استخدام في الكود:**
- File: `app/api/gmb/oauth-callback/route.ts`
- File: `lib/services/gmb-service.ts` (function: `fetchAccounts()`)

---

### 2. Google My Business Business Information API

**Base URL:** `https://mybusinessbusinessinformation.googleapis.com/v1`

#### **الوظيفة:**
إدارة معلومات المواقع (Locations)

#### **Endpoints المستخدمة:**

##### `GET /accounts/{accountId}/locations`
**الوصف:** جلب كل المواقع لحساب معين  
**Response:**
```json
{
  "locations": [
    {
      "name": "locations/987654321",
      "title": "My Store",
      "storefrontAddress": {...},
      "websiteUri": "https://example.com",
      "regularHours": {...},
      "phoneNumbers": {...},
      "categories": {...},
      "metadata": {...}
    }
  ]
}
```

**استخدام في الكود:**
- File: `app/api/gmb/sync/route.ts`
- File: `server/actions/locations.ts`

##### `GET /locations/{locationId}`
**الوصف:** جلب تفاصيل موقع محدد  
**استخدام:** عرض صفحة الموقع المفصلة

##### `PATCH /locations/{locationId}?updateMask=...`
**الوصف:** تحديث بيانات الموقع  
**Body:**
```json
{
  "title": "New Store Name",
  "phoneNumbers": {...},
  "websiteUri": "https://new-site.com"
}
```

**استخدام في الكود:**
- File: `app/api/gmb/location/[locationId]/update/route.ts`

##### `GET /locations/{locationId}/attributes`
**الوصف:** جلب السمات (Attributes) مثل: Wheelchair accessible, Wi-Fi, etc.

##### `PATCH /locations/{locationId}/attributes`
**الوصف:** تحديث السمات

**استخدام في الكود:**
- File: `app/api/gmb/location/[locationId]/attributes/route.ts`

---

### 3. Google My Business Reviews API (Place Reviews)

**Base URL:** `https://mybusiness.googleapis.com/v4`

#### **الوظيفة:**
جلب وإدارة المراجعات

#### **Endpoints المستخدمة:**

##### `GET /accounts/{accountId}/locations/{locationId}/reviews`
**الوصف:** جلب كل المراجعات لموقع  
**Query Parameters:**
- `pageSize`: عدد النتائج (max 50)
- `pageToken`: للـ pagination
- `orderBy`: الترتيب (updateTime desc)

**Response:**
```json
{
  "reviews": [
    {
      "reviewId": "abc123",
      "reviewer": {
        "displayName": "John Doe",
        "profilePhotoUrl": "..."
      },
      "starRating": "FIVE",
      "comment": "Great service!",
      "createTime": "2024-01-15T10:00:00Z",
      "updateTime": "2024-01-15T10:00:00Z",
      "reviewReply": {
        "comment": "Thank you!",
        "updateTime": "2024-01-16T09:00:00Z"
      }
    }
  ],
  "nextPageToken": "..."
}
```

**استخدام في الكود:**
- File: `app/api/gmb/sync/route.ts` (sync reviews)
- File: `app/api/gmb/location/[locationId]/reviews/route.ts`
- File: `server/actions/reviews.ts`

##### `PUT /accounts/{accountId}/locations/{locationId}/reviews/{reviewId}/reply`
**الوصف:** نشر أو تحديث رد على مراجعة  
**Body:**
```json
{
  "comment": "Thank you for your feedback!"
}
```

**استخدام في الكود:**
- File: `server/actions/reviews.ts` (function: `addReviewReply()`)
- File: `components/reviews/reply-dialog.tsx`

##### `DELETE /accounts/{accountId}/locations/{locationId}/reviews/{reviewId}/reply`
**الوصف:** حذف رد على مراجعة

---

### 4. Google My Business Q&A API

**Base URL:** `https://mybusiness.googleapis.com/v4`

#### **الوظيفة:**
إدارة الأسئلة والأجوبة

#### **Endpoints المستخدمة:**

##### `GET /accounts/{accountId}/locations/{locationId}/questions`
**الوصف:** جلب كل الأسئلة  
**Response:**
```json
{
  "questions": [
    {
      "name": "questions/123",
      "author": {...},
      "upvoteCount": 5,
      "text": "Do you deliver?",
      "createTime": "2024-01-10T12:00:00Z",
      "topAnswers": [...]
    }
  ]
}
```

**استخدام في الكود:**
- File: `app/api/gmb/questions/route.ts`
- File: `app/[locale]/(dashboard)/questions/page.tsx`

##### `POST /accounts/{accountId}/locations/{locationId}/questions/{questionId}/answers`
**الوصف:** نشر إجابة على سؤال  
**Body:**
```json
{
  "text": "Yes, we deliver within 5km radius!"
}
```

**استخدام في الكود:**
- File: `app/api/gmb/questions/[questionId]/answer/route.ts`

---

### 5. Google My Business Posts API (Local Posts)

**Base URL:** `https://mybusiness.googleapis.com/v4`

#### **الوظيفة:**
إنشاء ونشر منشورات GMB (Updates, Events, Offers)

#### **Endpoints المستخدمة:**

##### `GET /accounts/{accountId}/locations/{locationId}/localPosts`
**الوصف:** جلب كل المنشورات  
**Query Parameters:**
- `pageSize`: عدد النتائج
- `pageToken`: للـ pagination

**Response:**
```json
{
  "localPosts": [
    {
      "name": "localPosts/456",
      "languageCode": "en",
      "summary": "New product launch!",
      "event": {...},
      "callToAction": {
        "actionType": "LEARN_MORE",
        "url": "https://example.com"
      },
      "media": [
        {
          "mediaFormat": "PHOTO",
          "sourceUrl": "https://..."
        }
      ],
      "topicType": "STANDARD",
      "createTime": "2024-01-20T10:00:00Z",
      "updateTime": "2024-01-20T10:00:00Z",
      "state": "LIVE"
    }
  ]
}
```

**استخدام في الكود:**
- File: `app/api/gmb/posts/list/route.ts`

##### `POST /accounts/{accountId}/locations/{locationId}/localPosts`
**الوصف:** إنشاء منشور جديد  
**Body:**
```json
{
  "languageCode": "en",
  "summary": "Check out our new offers!",
  "callToAction": {
    "actionType": "CALL",
    "url": "tel:+1234567890"
  },
  "media": [...],
  "topicType": "OFFER"
}
```

**Topic Types:**
- `STANDARD`: عادي
- `EVENT`: حدث
- `OFFER`: عرض
- `ALERT`: تنبيه

**استخدام في الكود:**
- File: `app/api/gmb/posts/create/route.ts`
- File: `app/api/gmb/posts/publish/route.ts`

##### `DELETE /accounts/{accountId}/locations/{locationId}/localPosts/{postId}`
**الوصف:** حذف منشور

---

### 6. Google My Business Performance API (Insights)

**Base URL:** `https://businessprofileperformance.googleapis.com/v1`

#### **الوظيفة:**
جلب إحصائيات الأداء والتحليلات

#### **Endpoints المستخدمة:**

##### `POST /locations/{locationId}/searchkeywords/impressions/monthly:search`
**الوصف:** جلب الكلمات المفتاحية الشهرية  
**Body:**
```json
{
  "startMonth": {
    "year": 2024,
    "month": 1
  },
  "endMonth": {
    "year": 2024,
    "month": 3
  }
}
```

**Response:**
```json
{
  "searchKeywordsCounts": [
    {
      "searchKeyword": "coffee shop near me",
      "insightsValue": {
        "value": "150"
      }
    }
  ]
}
```

**استخدام في الكود:**
- File: `app/api/gmb/sync/route.ts` (sync insights)
- File: `components/analytics/search-keywords.tsx`

##### `GET /locations/{locationId}:getDailyMetricsTimeSeries`
**الوصف:** جلب مقاييس يومية  
**Query Parameters:**
- `dailyMetric`: BUSINESS_IMPRESSIONS_DESKTOP, BUSINESS_IMPRESSIONS_MOBILE, BUSINESS_CONVERSATIONS, BUSINESS_DIRECTION_REQUESTS, CALL_CLICKS, WEBSITE_CLICKS
- `dailyRange.startDate`: تاريخ البداية (YYYY-MM-DD)
- `dailyRange.endDate`: تاريخ النهاية

**Response:**
```json
{
  "timeSeries": {
    "datedValues": [
      {
        "date": {
          "year": 2024,
          "month": 1,
          "day": 15
        },
        "value": "250"
      }
    ]
  }
}
```

**Metrics المتاحة:**
- `BUSINESS_IMPRESSIONS_DESKTOP`: ظهور على Desktop
- `BUSINESS_IMPRESSIONS_MOBILE`: ظهور على Mobile  
- `BUSINESS_CONVERSATIONS`: محادثات
- `BUSINESS_DIRECTION_REQUESTS`: طلبات الاتجاهات
- `CALL_CLICKS`: نقرات على الاتصال
- `WEBSITE_CLICKS`: نقرات على الموقع
- `BUSINESS_BOOKINGS`: حجوزات
- `BUSINESS_FOOD_ORDERS`: طلبات طعام

**استخدام في الكود:**
- File: `app/api/gmb/sync/route.ts`
- File: `components/analytics/analytics-dashboard.tsx`
- File: `components/analytics/traffic-chart.tsx`

---

### 7. Google My Business Media API

**Base URL:** `https://mybusinessbusinessinformation.googleapis.com/v1`

#### **الوظيفة:**
إدارة الصور والفيديوهات

#### **Endpoints المستخدمة:**

##### `GET /locations/{locationId}/media`
**الوصف:** جلب كل الوسائط  
**Response:**
```json
{
  "mediaItems": [
    {
      "name": "media/123",
      "mediaFormat": "PHOTO",
      "locationAssociation": {
        "category": "COVER"
      },
      "googleUrl": "https://lh3.googleusercontent.com/...",
      "createTime": "2024-01-10T10:00:00Z"
    }
  ]
}
```

**Media Categories:**
- `COVER`: صورة الغلاف
- `PROFILE`: صورة الملف الشخصي
- `LOGO`: اللوجو
- `EXTERIOR`: صورة خارجية
- `INTERIOR`: صورة داخلية
- `PRODUCT`: صورة منتج
- `AT_WORK`: في العمل
- `FOOD_AND_DRINK`: طعام وشراب
- `MENU`: قائمة الطعام
- `COMMON_AREA`: منطقة عامة
- `ROOMS`: غرف
- `TEAMS`: فريق العمل
- `ADDITIONAL`: إضافية

**استخدام في الكود:**
- File: `app/api/gmb/sync/route.ts`
- File: `app/[locale]/(dashboard)/media/page.tsx`

##### `POST /locations/{locationId}/media`
**الوصف:** رفع صورة جديدة  
**Body:** Multipart form data

##### `DELETE /locations/{locationId}/media/{mediaItemId}`
**الوصف:** حذف صورة

---

### 8. Google My Business Verifications API

**Base URL:** `https://mybusinessverifications.googleapis.com/v1`

#### **الوظيفة:**
إدارة التحقق من المواقع

#### **Endpoints المستخدمة:**

##### `GET /locations/{locationId}/verifications`
**الوصف:** جلب حالة التحقق  
**Response:**
```json
{
  "verifications": [
    {
      "name": "verifications/789",
      "method": "EMAIL",
      "state": "COMPLETED",
      "createTime": "2024-01-05T10:00:00Z"
    }
  ]
}
```

**Verification States:**
- `PENDING`: قيد الانتظار
- `COMPLETED`: مكتمل
- `FAILED`: فشل

**استخدام في الكود:**
- File: `components/locations/enhanced-location-card.tsx` (عرض حالة التحقق)

---

### 9. Google OAuth 2.0 Token API

**Base URL:** `https://oauth2.googleapis.com`

#### **الوظيفة:**
إدارة OAuth tokens

#### **Endpoints المستخدمة:**

##### `POST /token`
**الوصف:** تبديل authorization code بـ access token  
**Body:**
```
code=...
client_id=...
client_secret=...
redirect_uri=...
grant_type=authorization_code
```

**Response:**
```json
{
  "access_token": "ya29.a0...",
  "refresh_token": "1//0g...",
  "expires_in": 3599,
  "scope": "...",
  "token_type": "Bearer"
}
```

**استخدام في الكود:**
- File: `app/api/gmb/oauth-callback/route.ts`
- File: `lib/services/oauth-service.ts` (function: `exchangeCodeForTokens()`)

##### `POST /token` (Refresh)
**الوصف:** تحديث access token  
**Body:**
```
refresh_token=...
client_id=...
client_secret=...
grant_type=refresh_token
```

**استخدام في الكود:**
- File: `lib/services/oauth-service.ts` (function: `refreshAccessToken()`)
- استخدام: قبل كل API call للتأكد من صلاحية الـ token

---

## 📋 ملخص الـ Services Layer المطلوب

المطور لازم يبني الملفات التالية لاستخدام كل هذه الـ APIs:

### `lib/services/gmb-service.ts`
**الوظائف المطلوبة:**
- `fetchAccounts(accessToken)`: جلب الحسابات
- `fetchLocations(accountId, accessToken)`: جلب المواقع
- `fetchLocationDetails(locationId, accessToken)`: تفاصيل موقع
- `updateLocation(locationId, updates, accessToken)`: تحديث موقع
- `fetchReviews(locationId, accessToken, pageToken?)`: جلب المراجعات
- `replyToReview(locationId, reviewId, reply, accessToken)`: الرد على مراجعة
- `fetchQuestions(locationId, accessToken)`: جلب الأسئلة
- `answerQuestion(locationId, questionId, answer, accessToken)`: الإجابة على سؤال
- `fetchPosts(locationId, accessToken)`: جلب المنشورات
- `createPost(locationId, postData, accessToken)`: إنشاء منشور
- `fetchInsights(locationId, dateRange, accessToken)`: جلب التحليلات
- `fetchSearchKeywords(locationId, monthRange, accessToken)`: جلب الكلمات المفتاحية
- `fetchMedia(locationId, accessToken)`: جلب الوسائط
- `fetchAttributes(locationId, accessToken)`: جلب السمات

### `lib/services/oauth-service.ts`
**الوظائف المطلوبة:**
- `createAuthUrl(state)`: إنشاء OAuth URL
- `exchangeCodeForTokens(code)`: تبديل code بـ tokens
- `refreshAccessToken(refreshToken)`: تحديث access token
- `getValidAccessToken(userId)`: جلب token صالح (مع auto-refresh)

---

## 🔐 Token Management Strategy

**مهم جداً:** المطور لازم يطبّق:

1. **قبل كل API call:**
   - Check token expiry (`expires_at` from database)
   - If expired: Auto-refresh using `refresh_token`
   - Update `oauth_tokens` table with new token

2. **Error Handling:**
   - If `401 Unauthorized`: Try refresh token once
   - If refresh fails: Mark account as disconnected
   - Notify user to reconnect

**Implementation في الكود:**
```typescript
// Example pattern (NOT actual code - just concept)
async function makeGMBApiCall(endpoint, userId) {
  const token = await getValidAccessToken(userId);
  const response = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (response.status === 401) {
    // Try refresh once
    await refreshAccessToken(userId);
    const newToken = await getValidAccessToken(userId);
    return fetch(endpoint, {
      headers: { Authorization: `Bearer ${newToken}` }
    });
  }
  return response;
}
```

---

## 🔴 PRIORITY 1: Must-Have Files (Core Functionality)

### 1. Configuration Files (5 files)

#### `package.json`
**الوصف:** قائمة Dependencies والـ scripts  
**المحتوى المطلوب:**
- Next.js 14+
- React 18+
- Supabase client libraries
- shadcn/ui dependencies
- Tailwind CSS
- TypeScript
- Zod for validation
- Date-fns, framer-motion

#### `next.config.js`
**الوصف:** إعدادات Next.js  
**المطلوب:**
- i18n configuration
- Image optimization
- Environment variables handling
- Security headers

#### `tailwind.config.ts`
**الوصف:** إعدادات Tailwind CSS  
**المطلوب:**
- Custom color scheme (dark theme with orange accent)
- Typography configuration
- Animation classes
- Plugin: tailwindcss-animate

#### `.env.example`
**الوصف:** قائمة بجميع Environment Variables المطلوبة  
**المتغيرات:**
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- GOOGLE_REDIRECT_URI
- GROQ_API_KEY
- TOGETHER_API_KEY
- DEEPSEEK_API_KEY
- OPENAI_API_KEY
- SENDGRID_API_KEY
- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN
- CRON_SECRET

#### `vercel.json`
**الوصف:** إعدادات Vercel deployment  
**المطلوب:**
- Cron jobs configuration (hourly sync)
- Build settings
- Environment variables

---

### 2. Database Schema (3 files)

#### `lib/types/database.ts`
**الوصف:** TypeScript interfaces للـ database tables  
**المطلوب تعريفها:**
- GmbAccount
- GMBLocation
- GMBReview
- GMBPost
- OAuthState
- OAuthToken
- Profile
- ActivityLog
- AIGenerationHistory
- Notification

#### `sql/001_initial_schema.sql`
**الوصف:** SQL script لإنشاء كل الجداول  
**الجداول المطلوبة:**
1. profiles
2. gmb_accounts
3. gmb_locations
4. gmb_reviews
5. gmb_posts
6. gmb_questions
7. gmb_insights
8. oauth_states
9. oauth_tokens
10. activity_logs
11. ai_generation_history
12. notifications

**متطلبات كل جدول:**
- Primary key (UUID)
- Foreign keys مع ON DELETE CASCADE
- Timestamps (created_at, updated_at)
- Indexes على الـ columns المستخدمة في queries
- JSONB columns للـ metadata

#### `sql/002_rls_policies.sql`
**الوصف:** Row Level Security policies  
**المطلوب:**
- Enable RLS على كل الجداول
- Policy: Users can only access their own data
- Policy: Admin can access all (service role)

---

### 3. Supabase Integration (3 files)

#### `lib/supabase/client.ts`
**الوصف:** Supabase client للـ browser/client components  
**الوظيفة:** Create browser-based Supabase client with proper configuration

#### `lib/supabase/server.ts`
**الوصف:** Supabase clients للـ server  
**المطلوب:**
- `createClient()`: Server-side client مع cookies
- `createAdminClient()`: Admin client يتخطى RLS

#### `lib/supabase/middleware.ts`
**الوصف:** Middleware للـ session management  
**الوظيفة:** Update session، handle auth state، manage cookies

---

### 4. Authentication System (5 files)

#### `lib/services/auth-service.ts`
**الوصف:** خدمة المصادقة  
**الوظائف المطلوبة:**
- signUp(email, password, fullName)
- signIn(email, password, rememberMe)
- signInWithOAuth(provider)
- signOut()
- resetPassword(email)
- updatePassword(newPassword)
- getUser() ← **استخدم هذا فقط للـ authentication**
- resendVerificationEmail(email)

**⚠️ تحذير مهم:**
- لا تستخدم `getSession()` أبداً للـ authentication
- استخدم `getUser()` دائماً لأنه يتحقق من السيرفر

#### `lib/api/auth-middleware.ts`
**الوصف:** Middleware لحماية API routes  
**الوظيفة:**
- `withAuth()` wrapper function
- Validate user with `getUser()`
- Handle session expiration
- Return 401 for unauthenticated requests

#### `app/[locale]/auth/login/page.tsx`
**الوصف:** صفحة تسجيل الدخول  
**العناصر:**
- Email/password form
- OAuth buttons (Google)
- Link to signup
- Forgot password link
- Form validation with Zod

#### `app/[locale]/auth/signup/page.tsx`
**الوصف:** صفحة التسجيل  
**العناصر:**
- Registration form (email, password, name)
- Password strength indicator
- Terms & conditions checkbox
- OAuth options

#### `app/[locale]/auth/callback/route.ts`
**الوصف:** OAuth callback handler  
**الوظيفة:**
- Exchange code for session
- Set cookies
- Redirect to dashboard

---

### 5. Core API Routes (12 files)

#### `app/api/dashboard/stats/route.ts`
**الوصف:** جلب إحصائيات الداشبورد الشاملة  
**HTTP Method:** GET  
**Query Parameters:** start, end (ISO date strings)  
**الوظائف:**
1. Authenticate user (`getUser()`)
2. Rate limit check
3. Validate input (Zod)
4. Fetch من Supabase:
   - gmb_locations
   - gmb_reviews
   - gmb_questions
5. Calculate metrics:
   - Total locations/reviews
   - Average rating
   - Response rate
   - Health score
   - Trends vs previous period
   - Bottlenecks detection
   - Location highlights
6. Return JSON

**Security Checklist:**
- ✅ Use `getUser()` not `getSession()`
- ✅ Rate limiting (Upstash Redis)
- ✅ Input validation (Zod)
- ✅ SQL injection prevention
- ✅ Error suppression for expected errors

#### `app/api/gmb/create-auth-url/route.ts`
**الوصف:** إنشاء Google OAuth URL  
**HTTP Method:** POST  
**العملية:**
1. Authenticate user
2. Generate random state (UUID)
3. Store state في oauth_states table (30min expiry)
4. Build Google OAuth URL with scopes
5. Return authUrl

**Scopes المطلوبة:**
- https://www.googleapis.com/auth/business.manage
- https://www.googleapis.com/auth/userinfo.email
- https://www.googleapis.com/auth/userinfo.profile
- openid

#### `app/api/gmb/oauth-callback/route.ts`
**الوصف:** معالجة Google OAuth callback  
**HTTP Method:** GET  
**Query Parameters:** code, state, error  
**العملية:**
1. Validate state من oauth_states
2. Mark state as used
3. Exchange code for tokens
4. Store tokens في oauth_tokens
5. Fetch GMB accounts from Google API
6. Fetch locations for each account
7. Store في gmb_accounts و gmb_locations
8. Trigger initial sync (background)
9. Redirect to settings page

#### `app/api/gmb/accounts/route.ts`
**الوصف:** جلب حسابات GMB  
**HTTP Method:** GET  
**Response:** Array of GMB accounts للمستخدم

#### `app/api/gmb/sync/route.ts`
**الوصف:** مزامنة يدوية للبيانات  
**HTTP Method:** POST  
**Body:** { accountId, syncType: 'full' | 'incremental' }  
**العملية:**
1. Authenticate user
2. Verify account ownership
3. Get/refresh access token
4. Sync from Google APIs:
   - Locations
   - Reviews
   - Media
   - Questions
   - Performance metrics
   - Search keywords
5. Upsert to Supabase
6. Update last_sync timestamp
7. Return sync counts

#### `app/api/gmb/scheduled-sync/route.ts`
**الوصف:** Cron job للمزامنة التلقائية  
**HTTP Method:** GET  
**Authorization:** Bearer token (CRON_SECRET)  
**العملية:**
1. Verify cron secret
2. Get all active accounts with auto-sync enabled
3. Loop through accounts
4. Trigger sync for each
5. Return summary

#### `app/api/gmb/location/[locationId]/route.ts`
**الوصف:** جلب تفاصيل موقع محدد  
**HTTP Method:** GET  
**Response:** Location data with attributes, business hours, Google-updated info

#### `app/api/gmb/location/[locationId]/update/route.ts`
**الوصف:** تحديث بيانات الموقع على Google  
**HTTP Method:** PATCH  
**Body:** Location updates (title, phone, website, etc.)

#### `app/api/gmb/location/[locationId]/reviews/route.ts`
**الوصف:** جلب مراجعات موقع محدد  
**HTTP Method:** GET  
**Query Parameters:** page, pageSize  
**Response:** Paginated reviews with stats

#### `app/api/gmb/posts/create/route.ts`
**الوصف:** إنشاء منشور GMB  
**HTTP Method:** POST  
**Body:** { locationId, summary, callToAction, media, topicType }

#### `app/api/locations/map-data/route.ts`
**الوصف:** جلب بيانات المواقع للخريطة  
**HTTP Method:** GET  
**Response:** Array of locations مع coordinates

#### `app/api/ai/generate-review-reply/route.ts`
**الوصف:** توليد رد على مراجعة بالذكاء الاصطناعي  
**HTTP Method:** POST  
**Body:** { reviewText, rating, businessName, tone }  
**العملية:**
1. Authenticate user
2. Validate input
3. Try AI providers بالترتيب:
   - Groq (first)
   - Together AI (fallback)
   - DeepSeek (fallback)
   - OpenAI GPT-4 (last resort)
4. Return generated reply
5. Log في ai_generation_history

---

### 6. Server Actions (4 files)

#### `server/actions/dashboard.ts`
**الوصف:** Server actions للداشبورد  
**الوظائف:**
- `getDashboardStats()`: جلب الإحصائيات
- `getActivityLogs(limit)`: جلب سجل الأنشطة
- `getMonthlyStats()`: إحصائيات شهرية للـ charts

#### `server/actions/locations.ts`
**الوصف:** Server actions للمواقع  
**الوظائف:**
- `getLocations()`: جلب كل المواقع
- `addLocation(data)`: إضافة موقع جديد
- `updateLocation(id, updates)`: تحديث موقع
- `deleteLocation(id)`: حذف موقع

**⚠️ Security:**
- Always verify `user_id` ownership
- Validate input with Zod schemas

#### `server/actions/reviews.ts`
**الوصف:** Server actions للمراجعات  
**الوظائف:**
- `getReviews(locationId?)`: جلب المراجعات
- `updateReviewStatus(reviewId, status)`: تحديث الحالة
- `addReviewReply(reviewId, reply)`: إضافة رد

#### `server/actions/accounts.ts`
**الوصف:** Server actions للحسابات  
**الوظائف:**
- `getAccounts()`: جلب الحسابات
- `deleteAccount(accountId)`: حذف حساب
- `syncAccount(accountId)`: تشغيل مزامنة

---

### 7. Core Dashboard Pages (4 files)

#### `app/[locale]/(dashboard)/dashboard/page.tsx`
**الوصف:** الصفحة الرئيسية للداشبورد  
**المكونات المطلوبة:**
- StatsCards (4 بطاقات: Locations, Reviews, Rating, Response Rate)
- WelcomeHero (رسالة ترحيب مع Profile Strength)
- PerformanceComparisonChart (مقارنة الأداء)
- LocationHighlightsCarousel (أبرز المواقع)
- AIInsightsWidget (توصيات AI)
- BottlenecksWidget (المشاكل والفرص)
- WeeklyTasksWidget (المهام الأسبوعية)
- GamificationWidget (الإنجازات والـ badges)
- QuickActionsBar (إجراءات سريعة)
- LastSyncInfo (آخر مزامنة)
- RealtimeUpdatesIndicator (مؤشر التحديثات)
- DateRangeControls (اختيار الفترة)
- ExportShareBar (تصدير ومشاركة)

**State Management:**
- useState for stats, loading, error
- useEffect لجلب البيانات
- Realtime subscription للتحديثات

#### `app/[locale]/(dashboard)/locations/page.tsx`
**الوصف:** صفحة إدارة المواقع  
**المكونات:**
- LocationsStats (إحصائيات)
- LocationsFilters (بحث وفلترة)
- EnhancedLocationCard (بطاقة موقع)
- LocationMapDashboard (خريطة Google Maps)
- GMBConnectionBanner (banner للاتصال)

**Features:**
- Grid/List view toggle
- Search by name
- Filter by status, category
- Sync button
- Realtime updates

#### `app/[locale]/(dashboard)/reviews/page.tsx`
**الوصف:** صفحة إدارة المراجعات  
**المكونات:**
- ReviewResponseCockpit (بيئة عمل للردود)
- SentimentAnalysisCard (تحليل المشاعر)
- ReviewCard (بطاقة مراجعة)
- ReplyDialog (dialog للرد)

**Features:**
- Filter by location, status, sentiment
- AI-generated replies
- Priority sorting
- Bulk actions

#### `app/[locale]/(dashboard)/settings/page.tsx`
**الوصف:** صفحة الإعدادات  
**الأقسام:**
- GMB Account Management
- OAuth connection/disconnection
- Sync schedules
- Notification preferences
- Profile settings
- API keys management

---

### 8. Essential UI Components (10 files)

#### `components/ui/button.tsx`
**الوصف:** زر قابل لإعادة الاستخدام  
**المصدر:** shadcn/ui  
**Variants:** default, destructive, outline, secondary, ghost, link

#### `components/ui/card.tsx`
**الوصف:** بطاقة (Card, CardHeader, CardTitle, CardContent)  
**المصدر:** shadcn/ui

#### `components/ui/dialog.tsx`
**الوصف:** نافذة منبثقة modal  
**المصدر:** shadcn/ui

#### `components/ui/input.tsx`
**الوصف:** حقل إدخال  
**المصدر:** shadcn/ui

#### `components/ui/select.tsx`
**الوصف:** قائمة منسدلة  
**المصدر:** shadcn/ui

#### `components/ui/skeleton.tsx`
**الوصف:** Loading placeholder  
**المصدر:** shadcn/ui

#### `components/ui/toast.tsx`
**الوصف:** إشعارات toast  
**المكتبة:** sonner

#### `components/ui/progress.tsx`
**الوصف:** شريط تقدم  
**المصدر:** shadcn/ui

#### `components/ui/badge.tsx`
**الوصف:** Badge/Tag  
**المصدر:** shadcn/ui

#### `components/ui/tabs.tsx`
**الوصف:** تبويبات  
**المصدر:** shadcn/ui

---

### 9. Utilities & Helpers (6 files)

#### `lib/utils.ts`
**الوصف:** Utility functions  
**الوظائف المطلوبة:**
- `cn()`: Class name merger (clsx + tailwind-merge)
- Date formatting helpers
- Number formatting helpers

#### `lib/rate-limit.ts`
**الوصف:** Rate limiting مع Upstash Redis  
**الوظيفة:**
- `checkRateLimit(userId)`: Check and update rate limit
- Configuration: 100 requests per 15 minutes per user

#### `lib/utils/sanitize.ts`
**الوصف:** Input sanitization  
**الوظائف:**
- SQL injection prevention
- XSS protection
- HTML escaping

#### `lib/utils/api-error-handler.ts`
**الوصف:** Centralized error handling  
**الوظيفة:**
- Format errors consistently
- User-friendly messages
- Error logging

#### `lib/navigation.ts`
**الوصف:** i18n navigation helpers  
**المطلوب:**
- Wrap next-intl navigation
- Type-safe routing

#### `lib/validations/dashboard.ts`
**الوصف:** Zod validation schemas  
**Schemas:**
- dateRangeSchema
- filterSchema
- statsQuerySchema

---

### 10. Internationalization (3 files)

#### `messages/en.json`
**الوصف:** English translations  
**الأقسام:**
- Common
- Dashboard
- Locations
- Reviews
- Auth
- Errors

#### `messages/ar.json`
**الوصف:** Arabic translations  
**ملاحظة:** نفس هيكل en.json

#### `middleware.ts`
**الوصف:** Next.js middleware  
**الوظائف:**
1. i18n routing (next-intl)
2. Session management (Supabase)
3. Protected routes handling

---

## 🟡 PRIORITY 2: Important Files (Enhanced Features)

### Dashboard Components (15 files)

#### `components/dashboard/stats-cards.tsx`
**الوصف:** بطاقات الإحصائيات الرئيسية  
**Props:** loading, data (totalLocations, averageRating, totalReviews, responseRate)  
**Features:**
- Animated numbers
- Trend indicators (up/down arrows)
- Color-coded by performance
- Loading skeletons

#### `components/dashboard/welcome-hero.tsx`
**الوصف:** رسالة ترحيبية  
**Props:** userName, profileStrength, tasksRemaining, estimatedMinutes  
**Features:**
- Animated progress bar
- Dynamic strength labels
- Gradient background

#### `components/dashboard/performance-comparison-chart.tsx`
**الوصف:** مقارنة الأداء  
**Props:** monthlyComparison data  
**المكتبة:** recharts  
**Chart Type:** Bar chart with current vs previous period

#### `components/dashboard/ai-insights-widget.tsx`
**الوصف:** توصيات AI  
**العملية:**
1. Fetch GMB data
2. Calculate metrics
3. Generate insights based on thresholds
4. Display with priority badges

**Insight Types:**
- Rating alerts (low/high)
- Response rate recommendations
- Review volume analysis
- Custom tips

#### `components/dashboard/bottlenecks-widget.tsx`
**الوصف:** تحديد المشاكل  
**Props:** bottlenecks array  
**Severity Levels:** high (red), medium (yellow), low (blue)  
**Types:** Response, Reviews, Content, Compliance, General

#### `components/dashboard/location-highlights-carousel.tsx`
**الوصف:** عرض أبرز المواقع  
**Categories:**
- Top performers (5★)
- Need attention (low rating)
- Recently improved (positive trend)

**المكتبة:** embla-carousel-react

#### `components/dashboard/gamification-widget.tsx`
**الوصف:** الإنجازات  
**Features:**
- Progress bars
- Achievement badges
- Streak counter
- Goal tracking

#### `components/dashboard/quick-actions-bar.tsx`
**الوصف:** إجراءات سريعة  
**Actions:**
- Reply to reviews
- Answer questions
- Create post
- View analytics

#### `components/dashboard/last-sync-info.tsx`
**الوصف:** معلومات آخر مزامنة  
**Features:**
- Last sync timestamp
- Manual sync button
- Disconnect option
- Syncing indicator

#### `components/dashboard/realtime-updates-indicator.tsx`
**الوصف:** مؤشر التحديثات  
**Features:**
- Last update time
- Auto-refresh countdown (30s)
- Manual refresh button

#### `components/dashboard/date-range-controls.tsx`
**الوصف:** اختيار فترة زمنية  
**Presets:**
- Last 7 Days
- Last 30 Days
- Last 90 Days
- Custom range

#### `components/dashboard/export-share-bar.tsx`
**الوصف:** تصدير ومشاركة  
**Features:**
- Export PDF (print dialog)
- Copy share link

#### `components/dashboard/performance-chart.tsx`
**الوصف:** رسم بياني للأداء  
**Data Source:** getMonthlyStats()  
**Chart Type:** Line chart (rating trends)

#### `components/dashboard/weekly-tasks-widget.tsx`
**الوصف:** المهام الأسبوعية  
**Features:**
- AI-generated tasks
- Completion checkboxes
- Priority indicators

#### `components/dashboard/completion-score-widget.tsx`
**الوصف:** نسبة اكتمال الملف  
**Features:**
- Progress percentage
- Missing sections list
- Quick fix links

---

### Location Components (8 files)

#### `components/locations/enhanced-location-card.tsx`
**الوصف:** بطاقة موقع محسّنة  
**Props:** location data  
**Features:**
- Rating display
- Review count
- Health score badge
- Quick actions menu
- Status indicator
- Last sync time

#### `components/locations/locations-stats.tsx`
**الوصف:** إحصائيات المواقع  
**Metrics:**
- Total locations
- Average rating
- Total reviews
- Active locations percentage

#### `components/locations/locations-filters.tsx`
**الوصف:** فلاتر البحث  
**Filters:**
- Search input
- Status dropdown (all, verified, pending, suspended)
- Category dropdown
- Sort by (rating, reviews, name)

#### `components/locations/LocationMapDashboard.tsx`
**الوصف:** خريطة Google Maps  
**المكتبة:** @react-google-maps/api  
**Features:**
- Markers للمواقع
- Info windows مع التفاصيل
- Clustering للمواقع المتقاربة
- Center on user's locations

#### `components/locations/gmb-connection-banner.tsx`
**الوصف:** Banner للاتصال بـ GMB  
**Variants:**
- NoAccountsPlaceholder (لا حسابات متصلة)
- EmptyLocationsState (لا مواقع)
- ConnectionBanner (دعوة للاتصال)

#### `components/locations/location-profile-enhanced.tsx`
**الوصف:** ملف موقع مفصل  
**Tabs:**
- Overview (معلومات أساسية)
- Reviews (المراجعات)
- Posts (المنشورات)
- Questions (الأسئلة)
- Insights (التحليلات)
- Attributes (السمات)

#### `components/locations/locations-error-alert.tsx`
**الوصف:** عرض الأخطاء  
**Props:** error message  
**Features:**
- Retry button
- Contact support link

#### `components/locations/responsive-locations-layout.tsx`
**الوصف:** Responsive layout hooks  
**Exports:**
- useIsMobile()
- useResponsiveGrid()
- MobileLocationsToolbar
- MobileFiltersDrawer
- ResponsiveStatsGrid

---

### Review Components (4 files)

#### `components/reviews/ReviewResponseCockpit.tsx`
**الوصف:** بيئة عمل متقدمة للردود  
**Features:**
- Review list مع priority sorting
- AI reply generation
- Edit/approve workflow
- Bulk actions
- Sentiment indicators

#### `components/reviews/review-card.tsx`
**الوصف:** بطاقة مراجعة  
**Props:** review data  
**Features:**
- Star rating display
- Reviewer info
- Review text
- Reply section
- Status badge
- Action buttons

#### `components/reviews/reply-dialog.tsx`
**الوصف:** Dialog للرد على مراجعة  
**Features:**
- AI suggestion button
- Text editor
- Character counter
- Preview
- Publish/Save draft buttons

#### `components/reviews/reviews-list.tsx`
**الوصف:** قائمة المراجعات  
**Features:**
- Pagination
- Filters (location, status, rating)
- Sort options
- Bulk selection

---

### Custom Hooks (4 files)

#### `hooks/use-locations-cache.ts`
**الوصف:** Caching hook للمواقع  
**Exports:**
- useLocationsData(filters)
- useLocationsStats()
- locationsCacheUtils

**Features:**
- SWR or React Query
- Auto-refresh
- Cache invalidation

#### `hooks/use-dashboard-cache.ts`
**الوصف:** Caching hook للداشبورد  
**Exports:**
- useDashboardStats(dateRange)
- Cache management

#### `lib/hooks/use-dashboard-realtime.ts`
**الوصف:** Realtime subscriptions  
**الوظيفة:**
- Subscribe to gmb_locations changes
- Subscribe to gmb_reviews changes
- Auto-update local state

#### `hooks/use-keyboard-shortcuts.ts`
**الوصف:** Keyboard shortcuts  
**Shortcuts:**
- Ctrl+K: Open command palette
- Ctrl+S: Sync
- Ctrl+R: Refresh
- G then D: Go to Dashboard
- G then L: Go to Locations

---

### Additional API Routes (8 files)

#### `app/api/gmb/disconnect/route.ts`
**الوصف:** قطع اتصال حساب GMB  
**HTTP Method:** POST  
**Body:** { accountId? }

#### `app/api/gmb/location/list-data/route.ts`
**الوصف:** قائمة تفصيلية للمواقع  
**Response:** Locations مع health scores و performance metrics

#### `app/api/gmb/location/[locationId]/attributes/route.ts`
**الوصف:** إدارة Attributes  
**HTTP Methods:** GET, PATCH

#### `app/api/gmb/posts/publish/route.ts`
**الوصف:** نشر منشور على Google  
**HTTP Method:** POST

#### `app/api/gmb/posts/list/route.ts`
**الوصف:** قائمة المنشورات  
**HTTP Method:** GET

#### `app/api/gmb/questions/route.ts`
**الوصف:** إدارة الأسئلة  
**HTTP Methods:** GET, POST

#### `app/api/gmb/questions/[questionId]/answer/route.ts`
**الوصف:** نشر إجابة  
**HTTP Method:** POST

#### `app/api/locations/bulk-publish/route.ts`
**الوصف:** نشر تحديثات جماعية  
**HTTP Method:** POST  
**Body:** { locationIds[], updates }

---

## 🟢 PRIORITY 3: Nice-to-Have Files (Enhancements)

### Analytics Components (6 files)

#### `components/analytics/analytics-dashboard.tsx`
**الوصف:** لوحة التحليلات

#### `components/analytics/traffic-chart.tsx`
**الوصف:** رسم بياني للزيارات

#### `components/analytics/impressions-breakdown-chart.tsx`
**الوصف:** تحليل مرات الظهور

#### `components/analytics/review-sentiment-chart.tsx`
**الوصف:** رسم بياني لمشاعر المراجعات

#### `components/analytics/performance-metrics-chart.tsx`
**الوصف:** مقاييس الأداء

#### `components/analytics/search-keywords.tsx`
**الوصف:** الكلمات المفتاحية

---

### Additional Pages (5 files)

#### `app/[locale]/(dashboard)/analytics/page.tsx`
**الوصف:** صفحة التحليلات الكاملة

#### `app/[locale]/(dashboard)/gmb-posts/page.tsx`
**الوصف:** صفحة إدارة المنشورات

#### `app/[locale]/(dashboard)/questions/page.tsx`
**الوصف:** صفحة الأسئلة والأجوبة

#### `app/[locale]/(dashboard)/media/page.tsx`
**الوصف:** صفحة إدارة الوسائط

#### `app/[locale]/(dashboard)/calendar/page.tsx`
**الوصف:** صفحة التقويم والجدولة

---

### Extra UI Components (10 files من shadcn/ui)

- `components/ui/dropdown-menu.tsx`
- `components/ui/popover.tsx`
- `components/ui/sheet.tsx`
- `components/ui/separator.tsx`
- `components/ui/switch.tsx`
- `components/ui/textarea.tsx`
- `components/ui/tooltip.tsx`
- `components/ui/scroll-area.tsx`
- `components/ui/checkbox.tsx`
- `components/ui/label.tsx`

---

## 🎨 Styling Files

### `app/globals.css`
**الوصف:** Global styles  
**المحتوى:**
- CSS variables for colors
- Dark theme configuration
- Custom animations
- Typography styles
- Tailwind directives

**Color Scheme:**
```css
--background: 0 0% 0%; /* Pure black */
--primary: 20 100% 50%; /* Electric orange */
--foreground: 0 0% 100%; /* White */
```

---

## 🛡️ Security Checklist

### ملفات الأمان المطلوبة:

#### `lib/utils/security.ts`
**الوظائف:**
- validateInput(input, schema)
- sanitizeHtml(html)
- escapeSQL(query) ← **لا تستخدم raw SQL أبداً**
- hashPassword(password)
- verifyPassword(password, hash)

---

## 📝 Validation Schemas

### `lib/validations/`

#### `auth.ts`
- signUpSchema
- signInSchema
- resetPasswordSchema

#### `locations.ts`
- LocationSchema
- UpdateLocationSchema
- LocationFiltersSchema

#### `reviews.ts`
- ReviewStatusSchema
- ReviewReplySchema

#### `gmb-post.ts`
- PostSchema
- PublishPostSchema

---

## 🔄 Data Flow Files

### `lib/hooks/use-supabase.ts`
**الوصف:** Custom hook للـ Supabase operations  
**الوظائف:**
- useSupabaseQuery(table, filters)
- useSupabaseSubscription(table, callback)
- useSupabaseMutation(operation)

---

## 📊 Chart Configuration

### `lib/chart-config.ts`
**الوصف:** Recharts configuration  
**المحتوى:**
- Default colors
- Chart themes
- Responsive settings

---

## 🎯 التسلسل المقترح للبناء

### Phase 1: Foundation (Week 1)
1. ✅ Setup project (Next.js, Tailwind, TypeScript)
2. ✅ Install dependencies
3. ✅ Create database schema
4. ✅ Setup Supabase clients
5. ✅ Build authentication system
6. ✅ Create basic UI components (shadcn/ui)

### Phase 2: Core Features (Week 2)
1. ✅ Build Dashboard API routes
2. ✅ Build GMB OAuth flow
3. ✅ Build Sync mechanism
4. ✅ Create Dashboard page with basic stats
5. ✅ Create Locations page with list view

### Phase 3: Enhanced Features (Week 3)
1. ✅ Build Reviews management
2. ✅ Implement AI reply generation
3. ✅ Add Realtime updates
4. ✅ Build Analytics dashboard
5. ✅ Add Google Maps integration

### Phase 4: Polish & Testing (Week 4)
1. ✅ Add animations (Framer Motion)
2. ✅ Implement gamification
3. ✅ Add i18n (Arabic support)
4. ✅ Performance optimization
5. ✅ Security audit
6. ✅ Testing & bug fixes

---

## ⚠️ ملاحظات مهمة للمطور

### 🔴 أخطاء يجب تجنبها:

1. **Authentication:**
   - ❌ لا تستخدم `getSession()` أبداً
   - ✅ استخدم `getUser()` فقط

2. **Database:**
   - ❌ لا تستخدم raw SQL queries
   - ✅ استخدم Supabase query builder

3. **Security:**
   - ❌ لا تكشف service role key في الـ client
   - ✅ استخدم RLS policies

4. **Performance:**
   - ❌ لا تفتح subscriptions بدون cleanup
   - ✅ استخدم `useEffect` cleanup functions

5. **Error Handling:**
   - ❌ لا تعرض errors تقنية للمستخدم
   - ✅ استخدم رسائل واضحة ومفيدة

---

## 📚 Resources المطلوبة

### Documentation to Read:
1. Next.js 14 App Router
2. Supabase Auth (Server-side)
3. Google My Business API
4. Tailwind CSS 4
5. shadcn/ui components
6. Zod validation
7. Recharts library

### APIs المطلوبة:
1. Google My Business API
2. Google Business Information API
3. Google My Business Q&A API
4. Google Business Profile Performance API
5. Groq AI API (optional)
6. OpenAI API (optional)

---

## 🎯 Success Criteria

عند الانتهاء من بناء كل الملفات، يجب أن يكون النظام قادراً على:

✅ تسجيل دخول/خروج المستخدمين  
✅ الاتصال بحسابات Google My Business  
✅ مزامنة المواقع والمراجعات تلقائياً  
✅ عرض Dashboard مع إحصائيات دقيقة  
✅ إدارة المواقع والمراجعات  
✅ توليد ردود AI على المراجعات  
✅ عرض التحليلات والرسوم البيانية  
✅ دعم اللغتين (عربي/إنجليزي)  
✅ Realtime updates بدون refresh  
✅ Mobile responsive  
✅ آمن بالكامل (RLS, Auth, Rate Limiting)  

---

## 📞 Support

إذا احتجت مساعدة في أي ملف أو وظيفة:
1. راجع `GMB_DASHBOARD_REFERENCE.md` للتفاصيل الفنية
2. راجع `replit.md` لفهم الـ architecture العام
3. راجع الـ documentation الرسمية للمكتبات

---

**إعداد:** Replit Agent  
**التاريخ:** نوفمبر 2025  
**الإصدار:** 1.0

**ملاحظة نهائية:** هذا الملف يحتوي على أسماء الملفات والوصف فقط. جميع الملفات يجب بناؤها من الصفر بكود نظيف وآمن ومُختبر.
