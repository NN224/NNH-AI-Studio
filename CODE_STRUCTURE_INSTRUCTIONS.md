# 🤖 AI Agent Instructions & Project Description
# تعليمات الـ AI Agent ووصف المشروع

> **For AI Agents**: This document provides comprehensive context about the NNH AI Studio codebase structure, patterns, and conventions. Use this as your primary reference when working on this project.

---

## ⚠️ IMPORTANT CONTEXT FOR AI AGENTS / سياق مهم للـ AI Agents

### 🎯 Your Role & Working Environment

**أنت مساعد AI تعمل مع Auto (AI Assistant في Cursor) كفريق واحد**

- **المنصة في الإنتاج (PRODUCTION)** - ليست في مرحلة التطوير
- **المستخدمون الحقيقيون يستخدمون المنصة الآن** - أي تغيير يؤثر على مستخدمين حقيقيين
- **كن حذراً** - لا تكسر الميزات الموجودة
- **اختبر قبل التغيير** - تأكد أن التغييرات تعمل بشكل صحيح

### 🌍 Communication Style

- **رد بالعربية** - دائماً رد باللغة العربية
- **كن مختصراً** - اشرح بشكل مختصر وواضح
- **فكر بطريقة مختلفة** - قدم حلول إبداعية ومبتكرة
- **ركز على الحل** - لا تشرح المشكلة فقط، قدم الحل

### 🤖 AI-First Platform Philosophy

**المنصة مصممة ليكون AI مساعد موجود في كل مكان:**

- **AI في كل ميزة** - كل ميزة في المنصة لها مكون AI مساعد
- **AI-generated content** - المحتوى يُنشأ بالذكاء الاصطناعي
- **AI recommendations** - التوصيات والاقتراحات من AI
- **AI-powered responses** - الردود على المراجعات والأسئلة بالذكاء الاصطناعي
- **AI insights** - التحليلات والرؤى من AI
- **AI automation** - الأتمتة الذكية في كل مكان

**عند إضافة ميزة جديدة:**
- فكر: كيف يمكن للـ AI أن يساعد هنا؟
- أضف AI assistant component إذا لزم الأمر
- استخدم AI APIs الموجودة في `/api/ai/`
- اجعل AI جزءاً من تجربة المستخدم

### 🚨 Critical Reminders

1. **PRODUCTION = Real Users** - كن حذراً جداً
2. **Test Everything** - اختبر قبل أي تغيير
3. **Backward Compatibility** - لا تكسر الميزات الموجودة
4. **Data Safety** - لا تفقد بيانات المستخدمين
5. **Performance** - المنصة يجب أن تكون سريعة
6. **Security First** - الأمان أولوية قصوى

### 💡 Think Differently

- **لا تتبع الأنماط التقليدية فقط** - فكر في حلول مبتكرة
- **AI-First Thinking** - كيف يمكن للـ AI أن يحسن هذه الميزة؟
- **User Experience** - ركز على تجربة المستخدم
- **Efficiency** - اجعل الأمور أسهل وأسرع

---

## 📖 PROJECT DESCRIPTION / وصف المشروع

### What is NNH AI Studio?

**NNH AI Studio** is a production-ready SaaS platform for managing Google My Business (GMB) locations and YouTube channels. It's a comprehensive business management tool that enables users to:

- **Multi-Location GMB Management**: Manage multiple Google My Business accounts and locations from a single dashboard
- **YouTube Channel Management**: Manage YouTube channels, videos, comments, and analytics
- **AI-Powered Features**: 
  - AI-generated review responses
  - AI content creation for posts
  - Smart recommendations and insights
- **Real-time Analytics**: Track performance metrics, reviews, ratings, and engagement
- **Review Management**: Respond to reviews, manage Q&A, and track response rates
- **Content Publishing**: Create and schedule posts for GMB and YouTube
- **Multi-language Support**: English and Arabic with RTL support

### Technical Stack

- **Framework**: Next.js 14.2.33 (App Router)
- **Language**: TypeScript 5.9.3
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth + OAuth (Google)
- **State Management**: TanStack Query (React Query)
- **UI Library**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS 4
- **Internationalization**: next-intl (English & Arabic)
- **Maps**: @react-google-maps/api
- **Forms**: react-hook-form + zod validation
- **Animations**: Framer Motion

### Key Features

1. **Dashboard**: Real-time analytics, health scores, performance metrics
2. **Locations Management**: Map view, list view, bulk operations
3. **Reviews**: Review management with AI-powered response generation
4. **Posts**: Create and publish GMB posts and YouTube videos
5. **Analytics**: Comprehensive analytics for GMB and YouTube
6. **Settings**: Account settings, team management, integrations
7. **AI Studio**: Content generation and optimization tools

---

## 🎯 INSTRUCTIONS FOR AI AGENTS

### ⚠️ Remember:
- **You work with Auto as a team** - You're an AI assistant helping Auto (Cursor's AI)
- **PRODUCTION environment** - Real users are using this platform NOW
- **Respond in Arabic** - Always communicate in Arabic, be concise
- **Think differently** - Provide creative and innovative solutions
- **AI-First mindset** - Every feature should consider how AI can enhance it

### When Working on This Project:

1. **Always use TypeScript** - All files should be `.ts` or `.tsx`
2. **Follow Next.js 14 App Router patterns** - Use Server Components by default, Client Components only when needed
3. **Respect the folder structure** - Don't create new top-level folders without understanding the existing structure
4. **Use existing components** - Check `components/ui/` before creating new UI components
5. **Internationalization** - All user-facing text must use `useTranslations()` from `next-intl`
6. **Type Safety** - Use types from `lib/types/database.ts` for database entities
7. **Error Handling** - Use error boundaries and proper error handling patterns
8. **Security** - Always validate inputs with Zod, check authentication, respect RLS policies
9. **AI Integration** - When adding features, consider how AI can enhance the user experience
10. **Production Safety** - Test thoroughly, don't break existing features, protect user data

---

## 📁 هيكل المشروع الرئيسي (Main Project Structure)

```
NNH-AI-Studio/
├── app/                    # Next.js App Router (الصفحات والمسارات)
├── components/             # مكونات React القابلة لإعادة الاستخدام
├── lib/                    # مكتبات ووظائف مساعدة
├── hooks/                  # React Hooks مخصصة
├── server/                 # Server Actions والخدمات
├── supabase/              # إعدادات Supabase والـ Migrations
├── sql/                    # ملفات SQL إضافية
├── public/                 # الملفات الثابتة (صور، أيقونات)
├── messages/               # ملفات الترجمة (i18n)
├── styles/                 # ملفات CSS
└── utils/                  # أدوات مساعدة
```

---

## 📂 شرح المجلدات الرئيسية (Main Directories Explanation)

### 1. 📱 `app/` - Next.js App Router

هذا المجلد يحتوي على جميع الصفحات والمسارات في التطبيق باستخدام Next.js 14 App Router.

#### `app/[locale]/` - الصفحات متعددة اللغات
- **`(auth)/`** - صفحات المصادقة (تسجيل الدخول، التسجيل)
- **`(dashboard)/`** - لوحة التحكم الرئيسية:
  - `dashboard/` - الصفحة الرئيسية
  - `locations/` - إدارة المواقع
  - `analytics/` - التحليلات
  - `reviews/` - إدارة المراجعات
  - `gmb-posts/` - منشورات GMB
  - `youtube-posts/` - منشورات YouTube
  - `settings/` - الإعدادات
  - وغيرها...

#### `app/api/` - API Routes
جميع نقاط النهاية (endpoints) للـ API:

- **`/api/auth/`** - مصادقة المستخدمين
- **`/api/gmb/`** - Google My Business API:
  - `accounts/` - حسابات GMB
  - `location/` - بيانات المواقع
  - `posts/` - إدارة المنشورات
  - `reviews/` - المراجعات
  - `questions/` - الأسئلة والأجوبة
  - `sync/` - مزامنة البيانات
- **`/api/youtube/`** - YouTube API:
  - `analytics/` - تحليلات YouTube
  - `videos/` - إدارة الفيديوهات
  - `comments/` - التعليقات
- **`/api/locations/`** - إدارة المواقع المحلية
- **`/api/ai/`** - وظائف الذكاء الاصطناعي

#### ملفات مهمة في `app/`:
- `layout.tsx` - التخطيط الرئيسي للتطبيق
- `providers.tsx` - موفرو React Query والخدمات
- `globals.css` - الأنماط العامة
- `global-error.tsx` - معالج الأخطاء العامة

---

### 2. 🧩 `components/` - مكونات React

مجلد يحتوي على جميع مكونات React القابلة لإعادة الاستخدام:

#### المجلدات الرئيسية:
- **`ui/`** - مكونات UI الأساسية (shadcn/ui):
  - `button.tsx`, `dialog.tsx`, `input.tsx`, `card.tsx`, إلخ.
- **`locations/`** - مكونات إدارة المواقع (51 ملف):
  - `locations-map-tab-new.tsx` - خريطة المواقع
  - `map-view.tsx` - عرض الخريطة
  - `map-cards/` - بطاقات الخريطة
- **`dashboard/`** - مكونات لوحة التحكم (29 ملف)
- **`analytics/`** - مكونات التحليلات (9 ملفات)
- **`auth/`** - مكونات المصادقة
- **`reviews/`** - مكونات المراجعات (5 ملفات)
- **`layout/`** - مكونات التخطيط (6 ملفات)
- **`accounts/`**, **`ai/`**, **`settings/`**, وغيرها...

#### ملفات مهمة:
- `error-boundary.tsx` - معالج أخطاء React
- `theme-provider.tsx` - موفر الثيم (Dark/Light Mode)

---

### 3. 📚 `lib/` - المكتبات والوظائف المساعدة

#### `lib/supabase/` - Supabase Clients:
- `client.ts` - Supabase Client للعميل (Client-side)
- `server.ts` - Supabase Client للخادم (Server-side)
- `middleware.ts` - Supabase Middleware

#### `lib/services/` - الخدمات:
- `auth-service.ts` - خدمة المصادقة
- `email-service.ts` - خدمة البريد الإلكتروني
- `sendgrid-service.ts` - تكامل SendGrid
- `activity.ts` - تتبع الأنشطة

#### `lib/utils/` - أدوات مساعدة:
- `api-error-handler.ts` - معالجة أخطاء API
- `api-response.ts` - تنسيق استجابات API
- `auth-helpers.ts` - مساعدات المصادقة
- `debounce.ts` - Debounce function
- `location-coordinates.ts` - إحداثيات المواقع
- `performance-calculations.ts` - حسابات الأداء

#### `lib/validations/` - التحقق من البيانات:
- `auth.ts` - تحقق بيانات المصادقة
- `dashboard.ts` - تحقق بيانات لوحة التحكم
- `gmb-post.ts` - تحقق بيانات منشورات GMB

#### `lib/gmb/` - Google My Business:
- `helpers.ts` - وظائف مساعدة لـ GMB

#### `lib/hooks/` - Hooks مخصصة:
- `use-dashboard-realtime.ts` - Realtime للوحة التحكم
- `use-supabase.ts` - Hook لـ Supabase
- `useAccountsManagement.ts` - إدارة الحسابات

---

### 4. 🎣 `hooks/` - React Hooks المخصصة

- `use-google-maps.ts` - Hook لـ Google Maps
- `use-locations.ts` - Hook لإدارة المواقع
- `use-locations-cache.ts` - Cache للمواقع
- `use-dashboard-cache.ts` - Cache للوحة التحكم
- `use-keyboard-shortcuts.ts` - اختصارات لوحة المفاتيح
- `use-location-map-data.ts` - بيانات خريطة المواقع
- `use-toast.ts` - Toast notifications

---

### 5. 🖥️ `server/` - Server Actions والخدمات

#### `server/actions/` - Server Actions:
ملفات تحتوي على Server Actions لـ Next.js (9 ملفات)

#### `server/services/` - الخدمات:
خدمات الخادم (1 ملف)

---

### 6. 🗄️ `supabase/` - Supabase Configuration

#### `supabase/migrations/` - Database Migrations:
جميع ملفات الـ migrations لتحديث قاعدة البيانات (34 ملف SQL):
- `20250102_*.sql` - إنشاء الجداول الأساسية
- `20250131_*.sql` - إصلاحات وتحسينات
- `20250201_*.sql` - إضافة الميزات
- `20251029_*.sql` - OAuth والمصادقة
- `20251102_*.sql` - إصلاحات الأمان

#### `supabase/functions/` - Edge Functions:
- `scheduled-sync/` - مزامنة مجدولة

#### ملفات الإعداد:
- `config.toml` - إعدادات Supabase

---

### 7. 📊 `sql/` - ملفات SQL إضافية

ملفات SQL للصيانة والإصلاحات (31 ملف):
- `fix_metadata_default.sql`
- `safe_fix_gmb_posts.sql`
- `remove_duplicate_migration.sql`
- وغيرها...

---

### 8. 🌐 `messages/` - ملفات الترجمة (i18n)

- `en.json` - الترجمة الإنجليزية
- `ar.json` - الترجمة العربية

يدعم التطبيق اللغتين الإنجليزية والعربية مع RTL support.

---

### 9. 🎨 `styles/` و `public/`

- `styles/globals.css` - الأنماط العامة
- `public/` - الملفات الثابتة (صور، أيقونات، favicon)

---

### 10. ⚙️ `utils/` - أدوات مساعدة

- `map-styles.ts` - أنماط Google Maps

---

## 🔧 ملفات الإعداد المهمة (Important Configuration Files)

### `package.json`
- **Framework**: Next.js 14.2.33
- **UI Library**: Radix UI + shadcn/ui
- **State Management**: TanStack Query (React Query)
- **Database**: Supabase
- **Styling**: Tailwind CSS
- **Internationalization**: next-intl
- **Maps**: @react-google-maps/api
- **Forms**: react-hook-form + zod

### `next.config.mjs`
- إعدادات Next.js
- تكامل next-intl للترجمة
- متغيرات البيئة

### `tsconfig.json`
- إعدادات TypeScript
- Path aliases: `@/*` → `./*`

### `middleware.ts`
- معالجة الترجمة (i18n routing)
- Rate limiting للـ API
- معالجة المصادقة

### `i18n.ts`
- إعدادات الترجمة
- اللغات المدعومة: `en`, `ar`

### `components.json`
- إعدادات shadcn/ui
- Path aliases للمكونات

---

## 🏗️ البنية المعمارية (Architecture)

### 1. **App Router Structure** (Next.js 14)
```
app/
├── [locale]/          # Dynamic route للغات
│   ├── (auth)/        # Route group للمصادقة
│   └── (dashboard)/   # Route group للوحة التحكم
└── api/               # API Routes
```

### 2. **Component Architecture**
- **UI Components** (`components/ui/`) - مكونات أساسية قابلة لإعادة الاستخدام
- **Feature Components** (`components/locations/`, `components/dashboard/`) - مكونات خاصة بالميزات
- **Layout Components** (`components/layout/`) - مكونات التخطيط

### 3. **Data Flow**
```
Client Component → API Route → Supabase → Database
                ↓
         React Query Cache
```

### 4. **State Management**
- **Server State**: TanStack Query (React Query)
- **Client State**: React useState/useReducer
- **Form State**: react-hook-form

### 5. **Authentication Flow**
```
User → Supabase Auth → Middleware → Protected Routes
```

---

## 🔐 الأمان (Security)

### 1. **Row Level Security (RLS)**
- جميع الجداول محمية بـ RLS policies
- المستخدمون يمكنهم الوصول فقط لبياناتهم

### 2. **API Security**
- Rate limiting في middleware
- Authentication checks في API routes
- Input validation باستخدام Zod

### 3. **Environment Variables**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- وغيرها من المتغيرات الحساسة

---

## 📡 API Structure

### GMB API Endpoints:
```
/api/gmb/
├── accounts/              # GET - قائمة الحسابات
├── location/[locationId]/ # GET, PUT - بيانات موقع
├── posts/                 # GET, POST - المنشورات
├── reviews/               # GET - المراجعات
├── questions/             # GET, POST - الأسئلة
├── sync/                  # POST - مزامنة البيانات
└── oauth-callback/        # GET - OAuth callback
```

### YouTube API Endpoints:
```
/api/youtube/
├── analytics/             # GET - التحليلات
├── videos/                # GET, POST - الفيديوهات
├── comments/              # GET - التعليقات
└── oauth-callback/        # GET - OAuth callback
```

---

## 🗄️ Database Schema (Supabase)

### الجداول الرئيسية:
- `profiles` - ملفات المستخدمين
- `gmb_accounts` - حسابات Google My Business
- `gmb_locations` - المواقع
- `gmb_posts` - المنشورات
- `gmb_reviews` - المراجعات
- `gmb_questions` - الأسئلة
- `youtube_channels` - قنوات YouTube
- `youtube_videos` - الفيديوهات
- `notifications` - الإشعارات
- `oauth_states` - حالات OAuth

---

## 🚀 كيفية البدء (Getting Started)

### 1. تثبيت المتطلبات:
```bash
npm install
```

### 2. إعداد متغيرات البيئة:
أنشئ ملف `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
# ... متغيرات أخرى
```

### 3. تشغيل المشروع:
```bash
npm run dev  # Development mode على المنفذ 5000
npm run build  # Build للإنتاج
npm start  # Production mode
```

---

## 📝 ملاحظات مهمة (Important Notes)

1. **الترجمة**: جميع النصوص يجب أن تكون في ملفات `messages/en.json` و `messages/ar.json`
2. **API Routes**: جميع API routes في `app/api/` يجب أن تستخدم Server Components
3. **Database**: جميع التغييرات على قاعدة البيانات يجب أن تكون عبر Migrations في `supabase/migrations/`
4. **Components**: استخدم مكونات shadcn/ui من `components/ui/` عند الإمكان
5. **Type Safety**: استخدم TypeScript types من `lib/types/database.ts`

---

## 🔍 البحث في الكود (Code Search Tips)

### للعثور على:
- **صفحة معينة**: ابحث في `app/[locale]/`
- **API endpoint**: ابحث في `app/api/`
- **مكون UI**: ابحث في `components/`
- **Hook مخصص**: ابحث في `hooks/`
- **دالة مساعدة**: ابحث في `lib/utils/`
- **Database query**: ابحث في `lib/supabase/` أو `server/actions/`

---

## 📚 الموارد الإضافية (Additional Resources)

- **Next.js 14 Docs**: https://nextjs.org/docs
- **Supabase Docs**: https://supabase.com/docs
- **shadcn/ui**: https://ui.shadcn.com
- **TanStack Query**: https://tanstack.com/query

---

---

## 💻 CODE PATTERNS & EXAMPLES

### 1. Creating a New Page

**Pattern**: Server Component by default, Client Component only when needed

```typescript
// app/[locale]/(dashboard)/new-feature/page.tsx
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';

export default async function NewFeaturePage() {
  const t = await getTranslations('NewFeature');
  const supabase = createClient();
  
  // Server-side data fetching
  const { data, error } = await supabase
    .from('table_name')
    .select('*');
  
  if (error) {
    // Handle error
  }
  
  return (
    <div>
      <h1>{t('title')}</h1>
      {/* Page content */}
    </div>
  );
}
```

### 2. Creating an API Route

**Pattern**: Always validate input, check authentication, handle errors

```typescript
// app/api/feature/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Validate input
    const body = await request.json();
    const validated = schema.parse(body);
    
    // Database operation
    const { data, error } = await supabase
      .from('table_name')
      .insert(validated)
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 3. Creating a Client Component

**Pattern**: Use 'use client' directive, use hooks for state

```typescript
// components/feature/feature-component.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

export function FeatureComponent() {
  const t = useTranslations('Feature');
  const [data, setData] = useState(null);
  const supabase = createClient();
  
  useEffect(() => {
    // Client-side data fetching
    async function fetchData() {
      const { data, error } = await supabase
        .from('table_name')
        .select('*');
      
      if (!error) {
        setData(data);
      }
    }
    
    fetchData();
  }, []);
  
  return (
    <div>
      <Button>{t('action')}</Button>
    </div>
  );
}
```

### 4. Using Internationalization

**Pattern**: Always use translations, never hardcode text

```typescript
import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations('ComponentName');
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>
      <button>{t('button.label')}</button>
    </div>
  );
}
```

**Add translations to**:
- `messages/en.json`
- `messages/ar.json`

### 5. Database Queries with Supabase

**Pattern**: Use typed queries, handle errors, respect RLS

```typescript
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/types/database';

type Location = Database['public']['Tables']['gmb_locations']['Row'];

export async function getLocations(): Promise<Location[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('gmb_locations')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new Error(`Failed to fetch locations: ${error.message}`);
  }
  
  return data || [];
}
```

### 6. Form Handling with Validation

**Pattern**: Use react-hook-form + zod

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
});

type FormData = z.infer<typeof formSchema>;

export function MyForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });
  
  async function onSubmit(data: FormData) {
    // Handle form submission
    const response = await fetch('/api/endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Input {...form.register('name')} />
      <Input {...form.register('email')} />
      <Button type="submit">Submit</Button>
    </form>
  );
}
```

---

## 🔄 COMMON TASKS & WORKFLOWS

### Task 1: Add a New Feature Page

1. Create page: `app/[locale]/(dashboard)/feature-name/page.tsx`
2. Add translations to `messages/en.json` and `messages/ar.json`
3. Create API route if needed: `app/api/feature-name/route.ts`
4. Add navigation link in `components/layout/sidebar.tsx` (if needed)
5. Test in both English and Arabic

### Task 2: Add a New Database Table

1. Create migration: `supabase/migrations/YYYYMMDD_description.sql`
2. Add RLS policies in the migration
3. Update types: Run `supabase gen types typescript` or update `lib/types/database.ts`
4. Test the migration locally

### Task 3: Add a New API Endpoint

1. Create route: `app/api/feature/route.ts`
2. Add authentication check
3. Add input validation with Zod
4. Add error handling
5. Add rate limiting (if needed)
6. Test with different scenarios

### Task 4: Create a Reusable Component

1. Check if similar component exists in `components/ui/`
2. Create component in appropriate folder: `components/feature-name/`
3. Use TypeScript interfaces for props
4. Add translations if needed
5. Export from component file
6. Use shadcn/ui components when possible

---

## 🚨 IMPORTANT RULES FOR AI AGENTS

### DO ✅

- ✅ Always check existing code before creating new files
- ✅ Use existing utilities from `lib/utils/`
- ✅ Use existing hooks from `hooks/` or `lib/hooks/`
- ✅ Follow the existing naming conventions
- ✅ Add proper TypeScript types
- ✅ Handle errors gracefully
- ✅ Add translations for all user-facing text
- ✅ Test both English and Arabic versions
- ✅ Respect RLS policies in database queries
- ✅ Use Server Components by default

### DON'T ❌

- ❌ Don't create new top-level folders without checking existing structure
- ❌ Don't hardcode text - always use translations
- ❌ Don't bypass authentication checks
- ❌ Don't skip input validation
- ❌ Don't create duplicate functionality
- ❌ Don't modify database schema without migrations
- ❌ Don't use Client Components when Server Components work
- ❌ Don't ignore TypeScript errors
- ❌ Don't commit sensitive data or API keys

---

## 📍 WHERE TO FIND THINGS

### Looking for...

- **Pages**: `app/[locale]/(dashboard)/` or `app/[locale]/(auth)/`
- **API Routes**: `app/api/`
- **UI Components**: `components/ui/` (basic) or `components/[feature]/` (feature-specific)
- **Hooks**: `hooks/` or `lib/hooks/`
- **Utilities**: `lib/utils/`
- **Services**: `lib/services/` or `server/services/`
- **Database Types**: `lib/types/database.ts`
- **Translations**: `messages/en.json` and `messages/ar.json`
- **Database Migrations**: `supabase/migrations/`
- **Supabase Clients**: `lib/supabase/client.ts` (browser) or `lib/supabase/server.ts` (server)
- **Navigation Helpers**: `lib/navigation.ts` (use instead of next/navigation)

---

## 🎨 STYLING GUIDELINES

### Theme Colors

- **Background**: Pure black (`#000000`)
- **Accent**: Electric orange (`#FF6B35` or similar)
- **Text**: White/Light gray for dark theme
- **Use CSS variables** defined in `app/globals.css`

### Component Styling

- Use Tailwind CSS classes
- Use shadcn/ui components from `components/ui/`
- Follow existing component patterns
- Support RTL for Arabic (`dir="rtl"`)

---

## 🔐 SECURITY CHECKLIST

Before deploying any code:

- [ ] All API routes check authentication
- [ ] Input validation with Zod
- [ ] RLS policies are in place
- [ ] No sensitive data in client-side code
- [ ] Environment variables are properly used
- [ ] Rate limiting is implemented (if needed)
- [ ] SQL injection prevention (use Supabase queries, not raw SQL)
- [ ] XSS prevention (sanitize user input)

---

## 🧪 TESTING PATTERNS

### Testing a Page

1. Test in English (`/en/...`)
2. Test in Arabic (`/ar/...`)
3. Test with authenticated user
4. Test with unauthenticated user (should redirect)
5. Test error states
6. Test loading states

### Testing an API Route

1. Test with valid input
2. Test with invalid input
3. Test without authentication
4. Test with different user roles (if applicable)
5. Test error handling

---

## 📚 KEY FILES TO UNDERSTAND

1. **`app/layout.tsx`** - Root layout
2. **`app/providers.tsx`** - React Query and other providers
3. **`middleware.ts`** - i18n routing and rate limiting
4. **`i18n.ts`** - Internationalization config
5. **`lib/supabase/client.ts`** - Browser Supabase client
6. **`lib/supabase/server.ts`** - Server Supabase client
7. **`lib/navigation.ts`** - Navigation helpers (use this instead of next/navigation)
8. **`lib/types/database.ts`** - Database types

---

## ✅ Checklist للمطورين الجدد

- [ ] فهم بنية App Router في Next.js 14
- [ ] إعداد Supabase وربطه بالمشروع
- [ ] فهم نظام الترجمة (i18n)
- [ ] التعرف على مكونات shadcn/ui
- [ ] فهم React Query للـ state management
- [ ] قراءة ملفات الـ migrations لفهم قاعدة البيانات
- [ ] فهم نظام المصادقة (Supabase Auth)
- [ ] التعرف على API structure
- [ ] فهم patterns المستخدمة في المشروع
- [ ] قراءة هذا الملف بالكامل! 📖

---

---

## 🤖 HOW TO USE THIS DOCUMENT WITH AI AGENTS

### For AI Agents:

**⚠️ قبل البدء - اقرأ هذا القسم أولاً:**
- أنت **مساعد AI** تعمل مع **Auto (Cursor AI)** كفريق واحد
- المنصة في **الإنتاج (PRODUCTION)** - مستخدمون حقيقيون يستخدمونها الآن
- **رد بالعربية** - دائماً رد بالعربية وباختصار
- **فكر بطريقة مختلفة** - قدم حلول إبداعية
- **AI-First** - كل ميزة يجب أن تفكر: كيف يمكن للـ AI أن يحسنها؟

When you receive a task related to this project:

1. **Read the "IMPORTANT CONTEXT" section first** - Understand your role and the production environment
2. **Read this document** - Understand the project structure and patterns
3. **Check the relevant section** - Find the section that matches your task
4. **Follow the patterns** - Use the code examples as templates
5. **Respect the rules** - Follow the DO's and DON'Ts
6. **Search existing code** - Before creating new files, search for similar implementations
7. **Think AI-First** - How can AI enhance this feature?
8. **Be careful** - This is production, real users depend on it

### Quick Reference:

- **New feature?** → See "COMMON TASKS & WORKFLOWS"
- **New API?** → See "CODE PATTERNS & EXAMPLES" → "Creating an API Route"
- **New component?** → See "CODE PATTERNS & EXAMPLES" → "Creating a Client Component"
- **Database changes?** → See "COMMON TASKS & WORKFLOWS" → "Task 2: Add a New Database Table"
- **Where to put files?** → See "WHERE TO FIND THINGS"
- **Security concerns?** → See "SECURITY CHECKLIST"

### Context for AI Agents:

**⚠️ تذكر دائماً:**
- أنت **مساعد AI** تعمل مع **Auto** كفريق
- **PRODUCTION = مستخدمون حقيقيون** - كن حذراً جداً
- **رد بالعربية** - مختصر وواضح
- **AI موجود في كل مكان** - فكر كيف يمكن للـ AI أن يحسن كل ميزة

This is a **production SaaS platform** with:
- **Real users and data** - أي خطأ يؤثر على مستخدمين حقيقيين
- Multi-language support (EN/AR)
- Complex integrations (Google APIs, YouTube API)
- Real-time features
- **AI-powered functionality everywhere** - AI مساعد في كل ميزة

**Always prioritize:**
1. **Production Safety** - لا تكسر الميزات الموجودة
2. Security - الأمان أولوية
3. Type safety - TypeScript في كل مكان
4. Error handling - معالجة الأخطاء بشكل صحيح
5. User experience - تجربة المستخدم مهمة
6. Performance - الأداء مهم
7. **AI Integration** - كيف يمكن للـ AI أن يحسن هذه الميزة؟

---

**آخر تحديث**: يناير 2025  
**الإصدار**: 0.1.0  
**للاستخدام مع**: AI Agents, Developers, Code Reviewers  
**الملف الرئيسي**: `CODE_STRUCTURE_INSTRUCTIONS.md`

