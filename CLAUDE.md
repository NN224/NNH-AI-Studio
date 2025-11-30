# CLAUDE.md - AI Assistant Guide for NNH AI Studio

> **Last Updated:** November 30, 2025
> **Version:** 0.9.0-beta
> **Production:** https://nnh.ae

---

## ⚠️ MANDATORY - اقرأ أولاً

**قبل أي عمل، اقرأ `AI_AGENT_START_HERE.md` للقواعد الصارمة.**

### القواعد الذهبية:

1. **لا تنشئ ملفات جديدة** إلا إذا ستُستخدم فعلاً
2. **لا تحذف كود** قبل البحث عن استخداماته
3. **لا تترك `console.log`** في الكود
4. **لا تستخدم `any`** إلا للضرورة القصوى
5. **شغّل `npm run lint`** بعد كل تعديل

### عند إصلاح مشكلة:

```bash
# تحقق من وجود prompt جاهز
ls production-fix-prompts/critical/
ls production-fix-prompts/high-priority/
ls production-fix-prompts/medium-priority/
```

---

## 📋 Table of Contents

1. [Project Overview](#-project-overview)
2. [Tech Stack](#-tech-stack)
3. [Architecture Patterns](#-architecture-patterns)
4. [Directory Structure](#-directory-structure)
5. [Critical Rules](#-critical-rules--never-violate)
6. [Development Workflows](#-development-workflows)
7. [Code Standards](#-code-standards)
8. [Database & Backend](#-database--backend)
9. [Testing](#-testing)
10. [Security Patterns](#-security-patterns)
11. [Common Tasks](#-common-tasks)
12. [Key Files Reference](#-key-files-reference)
13. [Troubleshooting](#-troubleshooting)

---

## 🎯 Project Overview

**NNH AI Studio** is a production-ready, enterprise-grade Next.js application providing professional Google My Business (GMB) and YouTube management with AI-powered automation.

### Key Information

- **Platform:** Next.js 14 + TypeScript + Supabase + Multi-AI Provider System
- **Version:** 0.9.0-beta (PERMANENT BETA STATUS)
- **Production URL:** https://nnh.ae (LIVE - worldwide access)
- **Development Ports:**
  - Dev server: `5050`
  - Production: `5000`
  - Storybook: `6006`
- **Codebase Size:** 756 TypeScript/TSX files
- **Database:** 24 tables, 462 columns (PostgreSQL via Supabase)

### Core Features

- **GMB Management:** Multi-location business profile management
- **Reviews AI:** Automated review replies with multi-provider AI fallback
- **Questions AI:** Automated Q&A responses
- **Content Generation:** AI-powered post and content creation
- **Analytics:** Comprehensive metrics and insights
- **YouTube Integration:** YouTube channel management
- **Automation:** Rule-based workflows and auto-pilot features
- **Internationalization:** Full English/Arabic support with RTL

---

## 🛠️ Tech Stack

### Frontend Framework

- **Next.js 14.2.33** - App Router architecture
- **React 18.3.1** - UI framework
- **TypeScript 5.9.3** - Strict mode enabled

### Styling & UI

- **Tailwind CSS 4.1.9** - CSS-based configuration
- **Radix UI** - 25+ primitive components
- **Shadcn/ui** - Component system (style: "new-york")
- **Framer Motion 12.23.24** - Animations
- **Lucide React** - Icon library
- **Styled Components 6.1.19** - CSS-in-JS (legacy components)

### State Management

- **Zustand 5.0.8** - Global state stores
  - Dashboard store (`lib/stores/dashboard-store.ts`)
  - Reviews store (`lib/stores/reviews-store.ts`)
  - Questions store (`lib/stores/questions-store.ts`)
- **TanStack React Query 5.90.9** - Server state management
  - 5-minute stale time
  - 10-minute garbage collection
  - 3 retries with exponential backoff
- **React Context API** - BrandProfileContext

### Backend & Database

- **Supabase 2.81.1** - PostgreSQL with Row Level Security (RLS)
  - Server client: `lib/supabase/server.ts`
  - Client: `lib/supabase/client.ts`
  - Middleware: `lib/supabase/middleware.ts`
  - Transactions: `lib/supabase/transactions.ts`

### AI Providers (Multi-Provider Fallback System)

**Priority Order:** Anthropic → OpenAI → Google → Groq → DeepSeek

- **Anthropic Claude SDK 0.68.0** (Primary)
- **OpenAI 6.9.1** (Secondary)
- **Google Generative AI 0.24.1** (Gemini)
- **Groq SDK 0.36.0**
- **Model Context Protocol SDK 1.21.1**

**Key Files:**

- `lib/ai/provider.ts` - Multi-provider orchestration
- `lib/ai/fallback-provider.ts` - Fallback logic
- `lib/services/ai-review-reply-service.ts` - Review automation
- `lib/services/ai-question-answer-service.ts` - Q&A automation
- `lib/services/ai-content-generation-service.ts` - Content generation
- `lib/services/ml-sentiment-service.ts` - Sentiment analysis

### Caching & Performance

- **Upstash Redis 1.35.6** - Distributed caching
  - `lib/redis/client.ts`
  - `lib/redis/lock-manager.ts`
- **Upstash Ratelimit 2.0.7** - API rate limiting
- **React Query** - Client-side caching (5-10 min stale times)
- **Dashboard Cache** - `lib/dashboard-cache.ts`
- **Cache Manager** - `lib/cache/cache-manager.ts`

### Monitoring & Analytics

- **Sentry 10.26.0** - Error tracking & performance
  - Server config: `sentry.server.config.ts`
  - Edge config: `sentry.edge.config.ts`
  - Instrumentation: `instrumentation.ts`
- **Vercel Analytics 1.5.0** - User analytics
- **Vercel Speed Insights 1.2.0** - Performance metrics
- **Custom Metrics:** `lib/monitoring/metrics.ts`
- **Audit Logging:** `lib/monitoring/audit.ts`

### Internationalization (i18n)

- **next-intl 4.5.5** - Framework integration
- **i18next ecosystem** - Browser detection, HTTP backend
- **Locales:** English (`en`), Arabic (`ar`)
- **Config:** `i18n.ts`
- **Messages:**
  - `messages/en.json` (35KB)
  - `messages/ar.json` (43KB, RTL support)

### Forms & Validation

- **React Hook Form 7.60.0** - Form management
- **Zod 3.25.76** - Schema validation
- **@hookform/resolvers 3.10.0** - RHF + Zod integration

### Testing

- **Jest 30.2.0** - Unit testing (95% coverage threshold)
- **Playwright 1.56.1** - E2E testing
- **Vitest 4.0.9** - Storybook integration tests
- **Testing Library** - React testing utilities
- **Jest Axe** - Accessibility testing

### Developer Tools

- **Storybook 10.0.7** - Component documentation
- **ESLint 9.39.1** - TypeScript, React, React Hooks
- **Prettier 3.6.2** - Code formatting
- **Husky 9.1.7** - Git hooks
- **lint-staged 16.2.7** - Pre-commit linting

### Data Visualization

- **Recharts 3.4.1** - Primary charting library
- **Chart.js 4.5.1** - Alternative charts
- **react-chartjs-2 5.3.1** - React wrapper for Chart.js

---

## 🏗️ Architecture Patterns

### 1. Routing Structure (App Router)

```
app/
├── layout.tsx                    # Root layout (dark mode, Vercel)
├── globals.css                   # Tailwind + custom CSS
├── providers.tsx                 # React Query & Store providers
│
├── [locale]/                     # i18n wrapper
│   ├── layout.tsx               # Locale layout (i18n, RTL)
│   │
│   ├── (dashboard)/             # Protected routes (route group)
│   │   ├── layout.tsx          # Dashboard layout with sidebar
│   │   ├── dashboard/          # Main dashboard
│   │   ├── reviews/            # Reviews management
│   │   │   └── ai-cockpit/    # AI review automation
│   │   ├── questions/          # Q&A management
│   │   ├── posts/              # Content posts
│   │   ├── gmb-posts/          # GMB-specific posts
│   │   ├── locations/          # Location management
│   │   ├── media/              # Media library
│   │   ├── metrics/            # Analytics
│   │   ├── settings/           # Settings
│   │   │   ├── ai/            # AI provider settings
│   │   │   └── auto-pilot/    # Automation settings
│   │   └── sync-diagnostics/  # GMB sync diagnostics
│   │
│   ├── auth/                    # Authentication
│   │   ├── login/
│   │   ├── signup/
│   │   ├── reset/
│   │   └── callback/
│   │
│   └── [public pages]/          # home, pricing, about, etc.
│
└── api/                         # API Routes
    ├── ai/                      # AI endpoints
    ├── auth/                    # Auth endpoints
    ├── youtube/                 # YouTube integration
    ├── google-maps/            # Maps integration
    ├── tasks/                   # Task management
    ├── monitoring/             # Monitoring endpoints
    └── cron/                    # Scheduled jobs
```

### 2. Data Fetching Patterns

#### Server Components (Default)

```typescript
// Direct Supabase queries for initial page loads
import { createClient } from '@/lib/supabase/server';

export default async function Page() {
  const supabase = createClient();
  const { data } = await supabase.from('table').select('*');
  return <div>{/* render */}</div>;
}
```

#### Client Components + React Query

```typescript
"use client";
import { useQuery } from "@tanstack/react-query";

export function Component() {
  const { data, isLoading } = useQuery({
    queryKey: ["key"],
    queryFn: async () => {
      /* fetch */
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

#### Server Actions

```typescript
// server/actions/example.ts
"use server";

export async function actionName() {
  const supabase = createClient();
  // ... logic
}
```

#### API Routes

```typescript
// app/api/resource/route.ts
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ... logic
  return Response.json(data);
}
```

### 3. Authentication Flow

**Middleware:** `middleware.ts`

1. i18n routing (next-intl)
2. Supabase session management
3. Protected route authentication
4. Redirect authenticated users from auth pages

**Protected Routes:**

- `/dashboard`, `/reviews`, `/questions`, `/posts`
- `/settings`, `/metrics`, `/media`, `/locations`
- `/youtube-dashboard`, `/home`

**Auth Service:** `lib/services/auth-service.ts`

### 4. AI Multi-Provider System

**Fallback Chain:**

```typescript
// lib/ai/provider.ts
const providers = [
  "anthropic", // Claude (Primary)
  "openai", // GPT (Secondary)
  "google", // Gemini
  "groq", // Groq
  "deepseek", // DeepSeek
];

// Automatically falls back if primary fails
// Logs all requests to ai_requests table
```

**Usage Pattern:**

```typescript
import { getAIProvider } from "@/lib/ai/provider";

const provider = await getAIProvider();
const response = await provider.generateText({
  prompt: "...",
  context: { businessName, category, location },
});
```

---

## 📁 Directory Structure

### Root Organization

```
/home/user/NNH-AI-Studio/
├── app/                      # Next.js App Router
├── components/               # React components (35+ subdirectories)
├── lib/                      # Core business logic (24 subdirectories)
├── server/                   # Server actions and services
├── hooks/                    # Custom React hooks (35+ hooks)
├── types/                    # TypeScript type definitions
├── utils/                    # Utility functions
├── contexts/                 # React contexts
├── middleware/              # Middleware utilities
├── supabase/                # Database migrations & functions
├── tests/                    # Test files (unit, e2e)
├── public/                   # Static assets
├── styles/                   # Global CSS
├── messages/                 # i18n translation files
├── docs/                     # Documentation
├── scripts/                  # Build & utility scripts
└── google-api-docs/         # Google API documentation
```

### Key Directories Explained

#### `/components` - UI Components

```
components/
├── ui/                       # Shadcn/ui primitives (35+ components)
├── reviews/                  # Review management
│   └── ai-cockpit/          # AI review automation UI
├── questions/                # Q&A components
├── posts/                    # Post management
├── dashboard/               # Dashboard widgets
├── locations/               # Location management
├── analytics/               # Analytics visualization
├── settings/                # Settings UI
├── common/                   # Shared utilities
│   └── beta-badge.tsx       # CRITICAL: BETA indicator
└── layout/                   # Layout components
```

#### `/lib` - Core Business Logic

```
lib/
├── ai/                       # AI orchestration
│   ├── provider.ts          # Multi-provider system
│   └── fallback-provider.ts # Fallback logic
├── services/                # Business services
│   ├── ai-review-reply-service.ts
│   ├── ai-question-answer-service.ts
│   ├── ai-content-generation-service.ts
│   ├── auth-service.ts
│   └── ...
├── supabase/                # Database clients
│   ├── server.ts           # Server-side client
│   ├── client.ts           # Client-side client
│   ├── middleware.ts       # Middleware client
│   └── transactions.ts     # Transaction support
├── stores/                  # Zustand stores
│   ├── dashboard-store.ts
│   ├── reviews-store.ts
│   └── questions-store.ts
├── security/                # Security utilities
│   ├── csrf.ts
│   ├── input-sanitizer.ts
│   ├── encryption.ts
│   └── rate-limiter.ts
├── monitoring/              # Monitoring & logging
│   ├── metrics.ts
│   └── audit.ts
├── validations/            # Zod schemas
├── cache/                   # Cache management
└── utils/                   # Utilities
```

#### `/server` - Server Actions

```
server/
└── actions/
    ├── auto-reply.ts        # Review auto-reply
    ├── reviews-management.ts
    ├── questions-management.ts
    ├── gmb-sync.ts          # GMB synchronization
    ├── dashboard.ts
    └── ...
```

#### `/hooks` - Custom React Hooks

```
hooks/
├── use-dashboard.ts         # Dashboard data
├── use-reviews.ts           # Reviews data
├── use-questions-cache.ts   # Questions cache
├── use-locations.ts         # Locations data
├── use-gmb.ts              # GMB integration
├── use-ai-command-center.ts # AI features
└── ... (35+ total hooks)
```

#### `/supabase` - Database

```
supabase/
├── migrations/              # Database migrations (30+ files)
│   ├── _TEMPLATE.sql       # Migration template
│   └── [timestamp]_*.sql   # Migration files
└── functions/              # Edge functions
```

---

## 🚨 Critical Rules – NEVER VIOLATE

### 1. Documentation First (HIGHEST PRIORITY)

- **BEFORE** any GMB feature changes → Check `google-api-docs/` for official API schemas
- **AFTER** any database migration → **AUTOMATICALLY** update `DATABASE_SCHEMA.md`
- **Workflow:**
  1. Create migration file
  2. Run `npm run db:push`
  3. Export database to CSV
  4. Run `npm run db:update-docs`
- **REMINDER:** Check `.beta-reminder` file before layout changes

### 2. BETA Status (PERMANENT)

- **BETA banner MUST be visible on ALL pages**
  - Component: `components/common/beta-badge.tsx`
- **All layouts use:**
  - Headers: `top-8` (account for BETA banner height)
  - Main containers: `pt-8` (padding-top for BETA banner)
  - Sidebar: `top-8`, `h-[calc(100vh-2rem)]`
- **NEVER remove BETA indicators**
- **Version:** Must remain `0.9.0-beta` in `package.json`

### 3. Database Schema

- **Current State:** 24 tables, 462 columns (see `DATABASE_SCHEMA.md`)
- **Any schema change requires:**
  1. Migration file using template: `supabase/migrations/_TEMPLATE.sql`
  2. Documentation update in `DATABASE_SCHEMA.md`
- **NEVER modify tables directly without migration**
- **Migration naming:** `[timestamp]_descriptive_name.sql`

### 4. AI Provider System

- **ALWAYS use fallback providers** (never single provider)
- **Priority Order:**
  1. Anthropic (Claude) - Primary
  2. OpenAI - Secondary
  3. Google (Gemini) - Tertiary
  4. Groq - Quaternary
  5. DeepSeek - Fallback
- **Log all AI requests** to `ai_requests` table
- **Handle errors gracefully** with user-friendly messages
- **Never fail silently** - always show error state

### 5. Git Workflow

- **NEVER commit directly to `main`**
- **ALWAYS create feature branch:** `feature/[feature-name]`
- **Test on `localhost:5050`** before creating PR
- **After merge to main:**
  1. SSH to production server
  2. Run: `git pull origin main`
  3. Run: `npm install` (if dependencies changed)
  4. Run: `npm run build`
  5. Restart: `pm2 restart nnh-ai-studio`
  6. Verify: Check https://nnh.ae

### 6. Security Rules

- **NEVER bypass Row Level Security (RLS)**
- **NEVER commit secrets** (API keys, passwords, `.env` files)
- **ALWAYS validate user input** with Zod schemas
- **ALWAYS sanitize HTML output**
- **ALWAYS check authentication** in API routes and server actions
- **Use parameterized queries** - never string concatenation

---

## 🔄 Development Workflows

### Starting Development

```bash
# Install dependencies
npm install

# Start development server (port 5050)
npm run dev

# In browser
http://localhost:5050
```

### Making Changes

#### 1. Code Changes

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes...

# Run linter
npm run lint

# Test changes
npm run test
npm run test:e2e
```

#### 2. Database Changes

```bash
# Create migration from template
cp supabase/migrations/_TEMPLATE.sql supabase/migrations/$(date +%s)_description.sql

# Edit migration file
# Add SQL commands

# Apply migration (development)
npm run db:push

# Update documentation
npm run db:update-docs
```

#### 3. Commit & Push

```bash
# Stage changes
git add .

# Commit (pre-commit hook runs automatically)
git commit -m "feat(scope): description"

# Push to feature branch
git push -u origin feature/your-feature-name

# Create PR on GitHub
```

### Tab-by-Tab Development Strategy

**Current Strategy:** Focus on ONE tab at a time until 100% complete

1. ✅ Verify data loading works
2. ✅ Verify data displays correctly
3. ✅ Verify AI features work
4. ✅ Test with real/beta data
5. ✅ Achieve production-ready state
6. ➡️ Move to next tab

**Priority Order:**

1. Reviews Tab (Phase 1: Enhanced Auto-Reply)
2. Questions Tab (Phase 2: Auto-Answer)
3. Profile/Features Tab (Phase 3: AI Suggestions)
4. Dashboard Tab (Phase 4-6: Analytics, Chat, Predictions)

### Testing Workflow

```bash
# Unit tests
npm run test              # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage report

# E2E tests
npm run test:e2e          # Headless
npm run test:e2e:headed   # With browser UI

# All tests
npm run test:all          # Unit + E2E
```

### Build & Deploy

```bash
# Clean build
npm run clean
npm run build

# Build with bundle analysis
npm run build:analyze

# Start production server locally
npm run start  # Port 5000

# Production deployment (on server)
git pull origin main
npm install
npm run build
pm2 restart nnh-ai-studio
```

---

## 📐 Code Standards

### TypeScript

```typescript
// ✅ DO: Strict typing
interface User {
  id: string;
  name: string;
  email: string | null;
}

// ✅ DO: Handle nulls explicitly
const userName = user.name ?? "Unknown";

// ❌ DON'T: Use any (unless absolutely necessary)
const data: any = fetchData(); // Avoid

// ✅ DO: Use interfaces for object shapes
interface Props {
  title: string;
  count: number;
}

// ✅ DO: Use type for unions/intersections
type Status = "pending" | "approved" | "rejected";
```

### React/Next.js

```typescript
// ✅ DO: Server Components by default
export default async function Page() {
  const data = await fetchData();
  return <div>{data}</div>;
}

// ✅ DO: Client Components only when needed
'use client';
import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}

// ✅ DO: Error Boundaries for major features
import { ErrorBoundary } from '@/components/error-boundary';

export default function Layout({ children }) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
}

// ✅ DO: Loading states
export default function Page() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <DataComponent />
    </Suspense>
  );
}
```

### API Routes

```typescript
// ✅ DO: Check authentication first
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ... rest of logic
}

// ✅ DO: Use proper HTTP status codes
return Response.json(data, { status: 200 }); // Success
return Response.json({ error }, { status: 400 }); // Bad request
return Response.json({ error }, { status: 401 }); // Unauthorized
return Response.json({ error }, { status: 404 }); // Not found
return Response.json({ error }, { status: 500 }); // Server error

// ✅ DO: Validate input with Zod
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const validated = schema.parse(body); // Throws if invalid
  // ... use validated data
}
```

### Supabase Queries

```typescript
// ✅ DO: Use server client for server-side
import { createClient } from "@/lib/supabase/server";

const supabase = createClient();
const { data, error } = await supabase
  .from("reviews")
  .select("*")
  .eq("user_id", userId);

// ✅ DO: Handle errors
if (error) {
  console.error("Database error:", error);
  throw new Error("Failed to fetch reviews");
}

// ✅ DO: Use transactions for multi-table updates
import { executeTransaction } from "@/lib/supabase/transactions";

await executeTransaction(async (client) => {
  await client.from("table1").insert(data1);
  await client.from("table2").insert(data2);
});

// ❌ DON'T: Bypass RLS
// Never use admin client unless absolutely necessary
// and only for privileged operations
```

### Performance Standards

- **API Response Times:**
  - Target: < 200ms for data fetching
  - Maximum: < 1000ms acceptable
  - AI Calls: < 3000ms (with streaming where possible)
- **Database Queries:**
  - Use indexes for foreign keys
  - Always paginate large datasets
  - Use React Query for client-side caching
  - Avoid N+1 queries with proper joins
- **Bundle Size:**
  - Use Next.js Image component
  - Dynamic imports for heavy components
  - Import only what's needed (tree shaking)

### UI/UX Standards

```typescript
// ✅ DO: Account for BETA banner in layouts
<header className="top-8">Header</header>
<aside className="top-8 h-[calc(100vh-2rem)]">Sidebar</aside>
<main className="pt-8">Content</main>

// ✅ DO: Use Skeleton loaders (not spinners)
import { Skeleton } from '@/components/ui/skeleton';

if (isLoading) {
  return <Skeleton className="h-8 w-full" />;
}

// ✅ DO: Provide helpful empty states
if (!data.length) {
  return (
    <EmptyState
      title="No reviews yet"
      description="Reviews will appear here once customers leave them"
      action={<Button>Refresh</Button>}
    />
  );
}

// ✅ DO: Show actionable errors
if (error) {
  return (
    <ErrorState
      title="Failed to load reviews"
      description={error.message}
      action={<Button onClick={retry}>Try Again</Button>}
    />
  );
}

// ✅ DO: Use toast notifications for success
import { toast } from 'sonner';

toast.success('Review reply sent successfully');
```

### Accessibility

```typescript
// ✅ DO: Add ARIA labels
<button aria-label="Close dialog" onClick={onClose}>
  <X />
</button>

// ✅ DO: Support keyboard navigation
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => e.key === 'Enter' && onClick()}
  onClick={onClick}
>
  Click me
</div>

// ✅ DO: Ensure color contrast (WCAG AA minimum)
// Use Tailwind colors that meet contrast requirements

// ✅ DO: Make screen reader friendly
<span className="sr-only">Loading...</span>
```

---

## 🗄️ Database & Backend

### Supabase Configuration

**Environment Variables:**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Client Types:**

1. **Server Client** (RLS enforced):

```typescript
import { createClient } from "@/lib/supabase/server";

const supabase = createClient();
// Use in Server Components, Server Actions, API Routes
```

2. **Client-side Client**:

```typescript
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
// Use in Client Components only
```

3. **Transaction Support**:

```typescript
import { executeTransaction } from "@/lib/supabase/transactions";

await executeTransaction(async (client) => {
  // Multiple operations in single transaction
  await client.from("table1").insert(data1);
  await client.from("table2").update(data2);
});
```

### Database Schema

**Documentation:** `google-api-docs/DATABASE_SCHEMA.md`

- **Tables:** 24
- **Columns:** 462
- **Migrations:** `supabase/migrations/`

**Key Tables:**

- `profiles` - User profiles
- `client_profiles` - Client business profiles
- `gmb_locations` - GMB location data
- `gmb_reviews` - Review data with AI metadata
- `gmb_questions` - Q&A data
- `gmb_posts` - Posts and content
- `ai_requests` - AI usage tracking
- `auto_reply_settings` - Automation configuration
- `oauth_tokens` - OAuth credentials (encrypted)
- `audit_logs` - Activity tracking
- `error_logs` - Error logging

### Migration Workflow

```bash
# 1. Create migration from template
cp supabase/migrations/_TEMPLATE.sql \
   supabase/migrations/$(date +%s)_your_description.sql

# 2. Edit migration file with SQL
# Example:
# ALTER TABLE gmb_reviews ADD COLUMN sentiment_score DECIMAL(3,2);

# 3. Apply migration
npm run db:push

# 4. Update documentation
npm run db:update-docs

# 5. Commit changes
git add supabase/migrations/*.sql
git add google-api-docs/DATABASE_SCHEMA.md
git commit -m "feat(db): add sentiment_score to reviews"
```

### Common Query Patterns

```typescript
// Select with relations
const { data } = await supabase
  .from("gmb_reviews")
  .select(
    `
    *,
    gmb_locations (
      name,
      address
    )
  `,
  )
  .eq("user_id", userId);

// Pagination
const { data } = await supabase
  .from("gmb_reviews")
  .select("*")
  .range(0, 9) // First 10 items
  .order("created_at", { ascending: false });

// Filtering
const { data } = await supabase
  .from("gmb_reviews")
  .select("*")
  .eq("status", "pending")
  .gte("rating", 4)
  .is("replied_at", null);

// Insert with return
const { data, error } = await supabase
  .from("gmb_reviews")
  .insert({ ...reviewData })
  .select()
  .single();

// Update
const { error } = await supabase
  .from("gmb_reviews")
  .update({ status: "approved" })
  .eq("id", reviewId);

// Delete
const { error } = await supabase
  .from("gmb_reviews")
  .delete()
  .eq("id", reviewId);
```

---

## 🧪 Testing

### Unit Testing (Jest)

**Configuration:** `jest.config.mjs`

- Environment: jsdom
- Coverage threshold: 95%
- Setup: `jest.setup.mjs`

**Running Tests:**

```bash
npm run test              # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage report
```

**Example Test:**

```typescript
// tests/lib/ai/provider.test.ts
import { getAIProvider } from "@/lib/ai/provider";

describe("AI Provider", () => {
  it("should return Anthropic as primary provider", async () => {
    const provider = await getAIProvider();
    expect(provider.name).toBe("anthropic");
  });

  it("should fallback to OpenAI when Anthropic fails", async () => {
    // Mock Anthropic failure
    // Test fallback logic
  });
});
```

### E2E Testing (Playwright)

**Configuration:** `playwright.config.ts`

- Test directory: `tests/e2e/`
- Browsers: Chromium, Firefox, WebKit, Mobile
- Auto-starts dev server on port 5050

**Running Tests:**

```bash
npm run test:e2e           # Run E2E tests
npm run test:e2e:headed    # With browser UI
npm run test:e2e:install   # Install browsers
```

**Example Test:**

```typescript
// tests/e2e/reviews.spec.ts
import { test, expect } from "@playwright/test";

test("should display reviews list", async ({ page }) => {
  await page.goto("/en/reviews");
  await expect(page.getByRole("heading", { name: "Reviews" })).toBeVisible();
  await expect(page.getByTestId("reviews-list")).toBeVisible();
});
```

### Storybook Testing

**Running Storybook:**

```bash
npm run storybook           # Start Storybook (port 6006)
npm run build-storybook     # Build static Storybook
```

**Example Story:**

```typescript
// components/ui/button.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";

const meta: Meta<typeof Button> = {
  component: Button,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    children: "Button",
    variant: "default",
  },
};
```

### Accessibility Testing

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('should have no accessibility violations', async () => {
  const { container } = render(<Component />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

## 🔐 Security Patterns

### Authentication Check

```typescript
// API Route
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ... authenticated logic
}

// Server Action
("use server");

export async function serverAction() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // ... authenticated logic
}
```

### Input Validation

```typescript
import { z } from "zod";

const reviewReplySchema = z.object({
  review_id: z.string().uuid(),
  reply_text: z.string().min(1).max(1000),
  tone: z.enum(["professional", "friendly", "apologetic"]),
});

export async function POST(request: Request) {
  const body = await request.json();

  // Validate with Zod
  const validated = reviewReplySchema.parse(body);

  // ... use validated data
}
```

### Input Sanitization

```typescript
import { sanitizeInput } from "@/lib/security/input-sanitizer";
import { sanitizeHtml } from "@/lib/security/sanitize-html";

// Sanitize text input
const cleanInput = sanitizeInput(userInput);

// Sanitize HTML
const cleanHtml = sanitizeHtml(htmlContent);
```

### CSRF Protection

```typescript
import { verifyCsrfToken } from "@/lib/security/csrf";

export async function POST(request: Request) {
  const token = request.headers.get("x-csrf-token");

  if (!verifyCsrfToken(token)) {
    return Response.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  // ... process request
}
```

### Rate Limiting

```typescript
import { rateLimit } from "@/lib/security/rate-limiter";

export async function POST(request: Request) {
  const identifier = request.headers.get("x-forwarded-for") ?? "anonymous";

  const { success } = await rateLimit.limit(identifier);

  if (!success) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  // ... process request
}
```

### Encryption

```typescript
import { encrypt, decrypt } from "@/lib/security/encryption";

// Encrypt sensitive data before storing
const encryptedToken = await encrypt(oauthToken);

// Decrypt when needed
const decryptedToken = await decrypt(encryptedToken);
```

### Content Security Policy

Configured in `next.config.mjs` (lines 104-121):

- Restricts script sources
- Prevents inline scripts (except allowed domains)
- Enforces HTTPS
- Prevents clickjacking
- Controls frame ancestors

---

## 🎯 Common Tasks

### 1. Adding a New Page

```bash
# Create page file
touch app/[locale]/(dashboard)/new-feature/page.tsx

# Add to middleware protected routes if needed
# Edit middleware.ts
```

```typescript
// app/[locale]/(dashboard)/new-feature/page.tsx
import { createClient } from '@/lib/supabase/server';

export default async function NewFeaturePage() {
  const supabase = createClient();
  const { data } = await supabase.from('table').select('*');

  return (
    <div className="pt-8"> {/* Account for BETA banner */}
      <h1>New Feature</h1>
      {/* ... */}
    </div>
  );
}
```

### 2. Creating a Server Action

```typescript
// server/actions/new-action.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
});

export async function newAction(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Validate input
  const validated = schema.parse({
    name: formData.get("name"),
  });

  // Perform action
  const { data, error } = await supabase
    .from("table")
    .insert({ ...validated, user_id: user.id })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  return { data };
}
```

### 3. Creating an API Route

```typescript
// app/api/new-endpoint/route.ts
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
});

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = await supabase
    .from("table")
    .select("*")
    .eq("user_id", user.id);

  return Response.json(data);
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const validated = schema.parse(body);

  const { data, error } = await supabase
    .from("table")
    .insert({ ...validated, user_id: user.id })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data);
}
```

### 4. Adding AI Feature

```typescript
import { getAIProvider } from "@/lib/ai/provider";

export async function generateReviewReply(
  review: Review,
  businessContext: BusinessContext,
) {
  try {
    const provider = await getAIProvider();

    const response = await provider.generateText({
      prompt: `Generate a reply for this ${review.rating}-star review: "${review.text}"`,
      context: {
        businessName: businessContext.name,
        category: businessContext.category,
        tone: businessContext.tone || "professional",
      },
      maxTokens: 200,
    });

    // Log AI request
    await logAIRequest({
      provider: provider.name,
      feature: "review_reply",
      tokens: response.usage.totalTokens,
    });

    return response.text;
  } catch (error) {
    console.error("AI generation failed:", error);
    throw new Error("Failed to generate reply");
  }
}
```

### 5. Creating a Custom Hook

```typescript
// hooks/use-custom-data.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export function useCustomData(userId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["custom-data", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("table")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
```

### 6. Adding Translation

```json
// messages/en.json
{
  "NewFeature": {
    "title": "New Feature",
    "description": "Description of the feature"
  }
}

// messages/ar.json
{
  "NewFeature": {
    "title": "ميزة جديدة",
    "description": "وصف الميزة"
  }
}
```

```typescript
// In component
import { useTranslations } from 'next-intl';

export function Component() {
  const t = useTranslations('NewFeature');

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>
    </div>
  );
}
```

### 7. Creating Database Migration

```bash
# Copy template
cp supabase/migrations/_TEMPLATE.sql \
   supabase/migrations/$(date +%s)_add_new_column.sql
```

```sql
-- Migration: Add new_column to table
-- Created: 2025-11-23

BEGIN;

-- Add column
ALTER TABLE table_name
ADD COLUMN new_column VARCHAR(255);

-- Add index if needed
CREATE INDEX idx_table_new_column ON table_name(new_column);

-- Add comment
COMMENT ON COLUMN table_name.new_column IS 'Description of the column';

COMMIT;
```

```bash
# Apply migration
npm run db:push

# Update documentation
npm run db:update-docs

# Commit
git add supabase/migrations/*.sql
git add google-api-docs/DATABASE_SCHEMA.md
git commit -m "feat(db): add new_column to table_name"
```

---

## 📚 Key Files Reference

### Configuration Files

- `next.config.mjs` - Next.js configuration with security headers
- `tsconfig.json` - TypeScript configuration (strict mode)
- `package.json` - Dependencies and scripts
- `tailwind.config.ts` - Tailwind CSS configuration
- `.cursorrules` - Development guidelines for AI assistants
- `middleware.ts` - Request middleware (auth, i18n)
- `i18n.ts` - Internationalization configuration

### Core Libraries

- `lib/supabase/server.ts` - Server-side Supabase client
- `lib/supabase/client.ts` - Client-side Supabase client
- `lib/ai/provider.ts` - Multi-provider AI orchestration
- `lib/ai/fallback-provider.ts` - AI fallback logic

### Key Services

- `lib/services/auth-service.ts` - Authentication
- `lib/services/ai-review-reply-service.ts` - Review AI
- `lib/services/ai-question-answer-service.ts` - Q&A AI
- `lib/services/ai-content-generation-service.ts` - Content AI

### Security

- `lib/security/csrf.ts` - CSRF protection
- `lib/security/input-sanitizer.ts` - Input sanitization
- `lib/security/sanitize-html.ts` - HTML sanitization
- `lib/security/encryption.ts` - Encryption utilities
- `lib/security/rate-limiter.ts` - Rate limiting

### Stores (Zustand)

- `lib/stores/dashboard-store.ts` - Dashboard state
- `lib/stores/reviews-store.ts` - Reviews state
- `lib/stores/questions-store.ts` - Questions state

### Server Actions

- `server/actions/auto-reply.ts` - Review auto-reply
- `server/actions/reviews-management.ts` - Review CRUD
- `server/actions/questions-management.ts` - Q&A CRUD
- `server/actions/gmb-sync.ts` - GMB synchronization

### Important Components

- `components/common/beta-badge.tsx` - BETA banner (CRITICAL)
- `components/error-boundary/` - Error boundaries
- `app/[locale]/(dashboard)/layout.tsx` - Dashboard layout
- `app/providers.tsx` - Global providers

### Documentation

- `google-api-docs/DATABASE_SCHEMA.md` - Complete database schema
- `google-api-docs/README.md` - API documentation guide
- `.cursorrules` - AI assistant development rules
- `README.md` - Project README (if exists)

### Testing

- `jest.config.mjs` - Jest configuration
- `playwright.config.ts` - Playwright configuration
- `tests/` - Test files

### Scripts

- `scripts/next-build-with-css.js` - Custom build script
- `scripts/update-schema-docs.sh` - Schema doc updater

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Build Errors

**CSS-related build errors:**

```bash
# Clean and rebuild
npm run clean
npm run build
```

**TypeScript errors:**

```bash
# Check TypeScript
npx tsc --noEmit

# Fix with ESLint
npm run lint
```

#### 2. Database Connection Issues

**RLS Policy errors:**

```typescript
// Check if user is authenticated
const {
  data: { user },
} = await supabase.auth.getUser();
console.log("User:", user);

// Use admin client only if necessary
// (never bypass RLS without good reason)
```

**Migration issues:**

```bash
# Check migration status
# Run migrations manually if needed
npm run db:push
```

#### 3. AI Provider Failures

**All providers failing:**

```typescript
// Check environment variables
console.log(
  "Anthropic key:",
  process.env.ANTHROPIC_API_KEY ? "Set" : "Missing",
);
console.log("OpenAI key:", process.env.OPENAI_API_KEY ? "Set" : "Missing");

// Check ai_requests table for error logs
const { data } = await supabase
  .from("ai_requests")
  .select("*")
  .eq("status", "error")
  .order("created_at", { ascending: false })
  .limit(10);
```

#### 4. Authentication Issues

**Session not persisting:**

```typescript
// Check cookie settings
// Ensure middleware is running
// Verify Supabase URL and anon key
```

**Redirect loops:**

```typescript
// Check middleware.ts
// Verify protected routes configuration
// Check auth callback handling
```

#### 5. Performance Issues

**Slow queries:**

```typescript
// Add indexes to frequently queried columns
// Use pagination
// Check for N+1 queries
// Use React Query caching
```

**Large bundle size:**

```bash
# Analyze bundle
npm run build:analyze

# Use dynamic imports for heavy components
const HeavyComponent = dynamic(() => import('./HeavyComponent'));
```

### Debug Mode

```bash
# Enable verbose logging
DEBUG=* npm run dev

# Check Next.js build output
npm run build -- --debug

# Check database queries
# Add to .env.local:
NEXT_PUBLIC_SUPABASE_DEBUG=true
```

### Getting Help

1. **Check `.cursorrules`** - Development guidelines
2. **Check `DATABASE_SCHEMA.md`** - Database structure
3. **Check existing code** - Similar implementations
4. **Check Sentry** - Production errors
5. **Check browser console** - Client-side errors
6. **Check server logs** - Server-side errors

---

## 📝 Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `refactor` - Code refactoring
- `perf` - Performance improvement
- `test` - Tests
- `chore` - Maintenance

**Examples:**

```
feat(reviews): add instant auto-reply without approval

- Modified server/actions/auto-reply.ts
- Set require_approval to false by default
- Added monitoring dashboard
- Updated DATABASE_SCHEMA.md

Closes #123
```

```
fix(gmb): handle null location address

- Added null check in location display component
- Updated type definitions
- Added fallback message

Fixes #456
```

---

## 🎯 Best Practices Summary

### DO ✅

- Use Server Components by default
- Check authentication in API routes and server actions
- Validate input with Zod schemas
- Sanitize HTML output
- Use fallback AI providers
- Log AI requests to database
- Handle errors gracefully with user-friendly messages
- Use React Query for client-side caching
- Paginate large datasets
- Account for BETA banner in layouts (`top-8`, `pt-8`)
- Update `DATABASE_SCHEMA.md` after migrations
- Test on `localhost:5050` before PR
- Test with English AND Arabic
- Create feature branches, never commit to main
- Use TypeScript strict mode
- Add ARIA labels for accessibility
- Use Skeleton loaders, not spinners
- Provide helpful empty states

### DON'T ❌

- Bypass Row Level Security (RLS)
- Commit secrets or `.env` files
- Use `any` type unless absolutely necessary
- Remove BETA indicators
- Modify tables without migrations
- Use single AI provider (always use fallback)
- Fail silently on errors
- Skip authentication checks
- Ignore error handling
- Use admin Supabase client unnecessarily
- Commit directly to main branch
- Deploy without testing
- Skip documentation updates
- Ignore accessibility
- Use spinners for loading states
- Create empty states without actions

---

## 🚀 Quick Reference Commands

```bash
# Development
npm run dev              # Start dev (port 5050)
npm run build            # Production build
npm run start            # Start production (port 5000)
npm run clean            # Clean cache
npm run rebuild          # Clean + build

# Database
npm run db:push          # Apply migrations
npm run db:update-docs   # Update schema docs

# Testing
npm run test             # Jest tests
npm run test:watch       # Jest watch mode
npm run test:coverage    # Coverage report
npm run test:e2e         # Playwright E2E
npm run test:all         # All tests

# Code Quality
npm run lint             # ESLint

# Storybook
npm run storybook        # Start Storybook (port 6006)
npm run build-storybook  # Build static Storybook
```

---

## 📞 Support & Resources

- **Production:** https://nnh.ae
- **Repository:** https://github.com/NN224/NNH-AI-Studio
- **Monitoring:** Sentry dashboard
- **Documentation:** `google-api-docs/` directory
- **Guidelines:** `.cursorrules` file

---

## 🔧 Production Fix Prompts (CRITICAL - READ FIRST)

**When asked to fix ANY production issue, START HERE:**

### Location: `production-fix-prompts/`

```
production-fix-prompts/
├── README.md              # Overview & progress tracking
├── critical/              # 🔴 17 files - Security & Stability (P0)
├── high-priority/         # 🟠 9 files - Functionality & UX (P1)
└── medium-priority/       # 🟡 14 files - Code Quality (P2)
```

### Workflow for AI Agents:

1. **FIRST**: Check if issue has a prompt file

   ```bash
   ls production-fix-prompts/critical/
   ls production-fix-prompts/high-priority/
   ls production-fix-prompts/medium-priority/
   ```

2. **READ**: Open and read the entire prompt file

3. **FOLLOW**: Execute step-by-step guide exactly

4. **VERIFY**: Check ALL acceptance criteria

5. **TEST**: Run verification commands from prompt

6. **UPDATE**: Mark status as ✅ Completed in prompt file

### Issue Categories:

| Category     | Folder             | Examples                                   |
| ------------ | ------------------ | ------------------------------------------ |
| Security     | `critical/`        | CSRF, RLS, Rate Limiting, Input Validation |
| Stability    | `critical/`        | JSON.parse safety, Error handling          |
| Performance  | `high-priority/`   | Timeouts, Caching, Debouncing              |
| UX           | `high-priority/`   | Loading states, Error messages             |
| Code Quality | `medium-priority/` | Types, Memoization, Accessibility          |

### Key Files:

- `production-fix-prompts/README.md` - Full overview with tables
- `PRODUCTION_ISSUES_10.txt` - Detailed issue descriptions (Arabic)
- `eslint.config.mjs` - Linting rules (updated)

### Total Issues: 40 prompts

- 🔴 Critical: 17 (61.5h estimated)
- 🟠 High: 9 (52h estimated)
- 🟡 Medium: 14 (40h estimated)

---

**Remember:** Quality > Speed. Tab by Tab. 100% or Nothing. 🎯

**Last Updated:** November 30, 2025
