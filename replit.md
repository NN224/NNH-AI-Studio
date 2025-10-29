# GMB Platform - Replit Configuration

## Overview

GMB Platform is a Next.js-based Google My Business (GMB) management application that helps businesses and agencies manage multiple GMB locations, reviews, and content. The platform leverages AI-powered tools for content generation and sentiment analysis, providing a comprehensive dashboard for monitoring business performance across locations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Server Actions Architecture (Added Oct 29, 2025)

**Centralized Server Actions**: `/server/actions/`
- All server-side mutations isolated in dedicated server action files
- Each action file starts with `"use server"` directive
- Strict authentication checks on all actions
- Cache revalidation via `revalidatePath` after mutations
- Comprehensive error handling with try/catch blocks
- Input validation using Zod schemas
- Modular organization:
  - `auth.ts`: Authentication actions (signOut, getCurrentUser, getSession)
  - `accounts.ts`: GMB account management (getAccounts, deleteAccount, syncAccount)
  - `locations.ts`: Location CRUD operations with Zod validation (getLocations, addLocation, updateLocation, deleteLocation)
  - `reviews.ts`: Review management with Zod validation (getReviews, updateReviewStatus, addReviewReply)
  - `dashboard.ts`: Dashboard data (getDashboardStats, getActivityLogs, getMonthlyStats)
  - `index.ts`: Centralized export point for all actions

**Input Validation**: `/lib/validations/`
- Zod schemas for all user inputs
- `dashboard.ts`: LocationSchema, UpdateLocationSchema, ReviewReplySchema, ReviewStatusSchema
- Validation errors return user-friendly messages
- Prevents SQL injection and data corruption
- Type-safe input constraints (string length, regex patterns, enums)

**Benefits:**
- ✅ No "Functions cannot be passed directly to Client Components" errors
- ✅ Clear separation between server and client code
- ✅ Type-safe server actions with automatic serialization
- ✅ Centralized authentication and authorization
- ✅ Comprehensive error handling with meaningful error messages
- ✅ Input validation prevents bad data from entering the database
- ✅ Simplified testing and maintenance

### Frontend Architecture

**Framework**: Next.js 14+ with App Router
- Uses React Server Components (RSC) for optimal performance
- TypeScript for type safety across the application
- Tailwind CSS with custom OKLCH color system for styling
- Dark mode theme as default
- Proper `"use client"` directive on all client components

**UI Component System**: 
- Radix UI primitives for accessible component foundation
- shadcn/ui component library (New York style variant)
- Custom components built on top of Radix primitives
- Framer Motion for animations and transitions

**State Management**:
- React hooks for local state
- Supabase real-time subscriptions for live data updates
- Client-side Supabase client for browser interactions
- Server-side Supabase client for server components

**Routing Strategy**:
- Public routes: Landing page, pricing, about, contact, terms, privacy
- Authentication routes: Login, signup, password reset
- Protected dashboard routes: Dashboard, locations, reviews, AI studio, analytics, settings, accounts
- Middleware-based route protection with automatic redirects

### Backend Architecture

**Authentication & Database**: Supabase
- Supabase Auth for user authentication (email/password, OAuth, magic links, phone/SMS)
- Session management with cookie-based authentication
- Row Level Security (RLS) for data access control
- Server-side rendering with session validation

**Database Schema**:
- `profiles`: User profile information
- `gmb_accounts`: Connected Google My Business accounts
- `gmb_locations`: Business locations with metadata
- `gmb_reviews`: Customer reviews with AI sentiment analysis
- `activity_logs`: User activity tracking

**API Pattern**:
- Server Actions for mutations
- Server Components for data fetching
- Edge Functions (referenced for OAuth callbacks)
- Real-time subscriptions via Supabase channels

### Authentication Flow

**Multi-Method Authentication**:
1. Email/Password with optional "Remember Me"
2. Google OAuth integration
3. Magic link (passwordless email)
4. Phone/SMS with OTP verification

**Session Management**:
- Persistent sessions stored in cookies
- Optional non-persistent sessions for enhanced security
- Automatic session refresh via middleware
- Protected route enforcement

### AI Integration

**Content Generation**:
- AI-powered content creation for posts, responses, descriptions, and FAQs
- Multiple AI provider support (OpenAI GPT-4, Anthropic Claude, Groq)
- Customizable tone selection (professional, friendly, casual, formal, enthusiastic)
- Content history tracking and reuse

**Review Management**:
- Automated sentiment analysis (positive, neutral, negative)
- AI-suggested review responses
- Response workflow (new → in_progress → responded)
- Kanban-style review organization

### Real-time Features

**Live Data Synchronization**:
- Location status updates via Supabase channels
- Review notifications and updates
- Activity feed real-time updates
- Dashboard metrics live refresh

**Optimistic UI Updates**:
- Immediate UI feedback for user actions
- Background synchronization with database
- Error handling with rollback capability

### Dashboard Features (Enhanced Oct 29, 2025)

**Real-Time Dashboard**:
- Live statistics: total locations, total reviews, average rating, response rate
- Monthly performance chart with real review data (last 6 months)
- Activity feed with real-time Supabase subscriptions
- Error handling: graceful degradation with user-friendly error messages
- Loading states: skeleton loaders for better UX
- Empty states: helpful messages when no data exists

**Performance Chart**:
- Dynamic data from `getMonthlyStats()` server action
- Groups reviews by month automatically
- Calculates average rating per month
- Shows review count trends
- Handles empty data gracefully
- Client-side loading and error states

**Data Integrity**:
- All dashboard queries check authentication first
- Database errors are caught and logged
- User sees clear error messages instead of crashes
- Null-safe calculations (handles missing ratings)

### Analytics & Visualization

**Chart Library**: Recharts for data visualization
- Traffic trends (line charts)
- Review sentiment distribution (bar charts)
- Response time metrics (area charts)
- Location performance rankings

**Metrics Tracked**:
- Total locations, reviews, ratings
- Response rates and times
- Sentiment analysis trends
- Traffic and engagement data

## External Dependencies

### Core Services

**Supabase** (Primary Backend)
- PostgreSQL database
- Authentication service
- Real-time subscriptions
- Edge Functions for OAuth callbacks
- Row Level Security policies

**Replit** (Deployment & Hosting)
- Autoscale deployment
- Environment secrets management
- Built-in workflow system
- Port 5000 binding (0.0.0.0:5000)

### Third-Party APIs

**Google My Business API** (Implied)
- OAuth 2.0 authentication flow
- Location data synchronization
- Review fetching and management
- Account connection management

**AI Services** (Planned Integration)
- OpenAI GPT-4 API
- Anthropic Claude API
- Groq API
- Content generation and sentiment analysis

### UI & Visualization Libraries

**Component Libraries**:
- @radix-ui/* (22+ component primitives)
- shadcn/ui components
- lucide-react for icons
- cmdk for command palette

**Animation & Interaction**:
- framer-motion for animations
- embla-carousel-react for carousels
- react-hook-form with zod validation (@hookform/resolvers)

**Data Visualization**:
- recharts for analytics charts
- Custom chart configurations for brand consistency

### Development Tools

**Build & Development**:
- Next.js framework
- TypeScript compiler
- Tailwind CSS with custom configuration
- ESLint for code quality

**Date & Time**:
- date-fns for date manipulation and formatting

**Utilities**:
- class-variance-authority for component variants
- clsx and tailwind-merge for className management
- @emotion/is-prop-valid for styled components

### Environment Configuration

**Required Environment Variables**:
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- Additional OAuth credentials for Google integration (server-side)

**Deployment Settings**:
- Build command: `npm run build` (includes `unset NODE_ENV` to avoid Next.js warnings)
- Dev command: `npm run dev` (port 5000)
- Start command: `npm run start` (port 5000)
- Install command: `npm install --legacy-peer-deps`
- Deployment type: Autoscale
- Region: iad1 (US East)
- Next.js version: 14.2.24 (stable, downgraded from 16.0.0 due to build issues)

## Production Status (✅ DEPLOYED - Oct 29, 2025)

### Latest Update (Oct 29, 2025)

**Build & Deployment Health:**
- ✅ Next.js 14.2.24 build succeeds without errors
- ✅ TypeScript compilation clean
- ✅ All 25 routes generated successfully
- ✅ Production runtime stable
- ✅ Middleware (middleware.ts) working correctly
- ✅ OAuth redirects fixed for production domain (nnh.ae)
- ⚠️ Build command updated to unset NODE_ENV (Replit environment issue)

**Recent Fixes (Oct 29, 2025):**

*Database Schema & Security (Critical - Latest):*
- **Database user_id columns**: Added missing user_id foreign keys to gmb_locations and gmb_reviews
  - SQL migrations created in `supabase/migrations/`
  - Migration 1: Adds user_id UUID columns with foreign key to auth.users
  - Migration 2: Enables Row Level Security (RLS) with user-scoped policies
  - Server actions (locations.ts, reviews.ts) write user_id on all inserts
  - GMB Sync edge function updated to propagate user_id from account owner
  - **Requires**: Manual execution of SQL migrations in Supabase Dashboard (see QUICK_FIX_AR.md)
  
*Session Management:*
- **Middleware session handling**: Enhanced error handling for expired/invalid sessions
  - Try/catch blocks for auth errors with graceful degradation
  - Automatic redirect to login on session expiration
  - Cookie cleanup on invalid sessions
  - Reduced logging noise for public and auth routes
  
*Environment & Build:*
- **NODE_ENV warning fix**: Added `unset NODE_ENV &&` to both build and start scripts
  - Resolves Replit environment non-standard NODE_ENV value
  - Eliminates production warnings

*OAuth & Authentication:*
- **OAuth Redirect Fix**: Resolved `0.0.0.0:5000` redirect issue
  - Added `getOriginFromRequest()` helper in auth/callback/route.ts
  - Uses request headers (x-forwarded-host, x-forwarded-proto) for reverse proxy support
  - Works in development (localhost, 127.0.0.1), Replit preview, and production (nnh.ae)
  - Client-side components use `getBaseUrlClient()` utility
  - Supports environment override via `NEXT_PUBLIC_BASE_URL`
  
*Framework & Infrastructure:*
- Downgraded from Next.js 16.0.0 to 14.2.24 (stable)
  - Reason: Next.js 16 had global-error prerendering bug causing build failures
- Reverted proxy.ts back to middleware.ts
  - Reason: middleware.ts is standard in Next.js 14

**OAuth Configuration:**
- Server-side callbacks: Use `getOriginFromRequest(request)` for dynamic origin detection
- Client-side redirects: Use `getBaseUrlClient()` for browser-based flows
- Supports Google OAuth, Magic Links, Password Reset, and Email Signup

### Recent Changes for Production

**Build Configuration**:
- Removed `ignoreBuildErrors` from next.config.mjs for production safety
- Excluded `supabase/` folder from tsconfig.json (Edge Functions are Deno-based)
- Fixed TypeScript errors in analytics components
- Build process completes successfully with zero errors

**Environment Variables**:
All required secrets configured in Replit Secrets:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase public anonymous key
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `GROQ_API_KEY` - Groq AI API key
- `DEEPSEEK_API_KEY` - DeepSeek AI API key
- `TOGETHER_API_KEY` - Together AI API key

**Deployment Configuration**:
- Configured for Autoscale deployment on Replit
- Build: `npm run build`
- Run: `npm run start`
- Port binding: 0.0.0.0:5000 (required for Replit)

### ✅ Deployment Completed

**Status**: Successfully deployed to production on nnh.ae

**Completed Tasks**:

1. ✅ **Row Level Security (RLS)** - Enabled on all tables with security policies
2. ✅ **Supabase Edge Functions** - All 6 functions deployed and active
3. ✅ **Database Setup** - Profile trigger and schema created
4. ✅ **Google OAuth** - Production URLs configured
5. ✅ **Custom Domain** - nnh.ae connected and active
6. ✅ **Supabase URLs** - Redirect URLs updated for production
7. ✅ **Environment Variables** - All 7 secrets configured

**Production URLs**:
- Primary: https://nnh.ae
- Backup: https://[app-name].replit.app

### Code Quality

**Type Safety**:
- Full TypeScript coverage with strict mode enabled
- All components properly typed
- Database types defined in `lib/types/database.ts`

**Security Best Practices**:
- No secrets in code
- Environment variables properly managed
- Client/server separation maintained
- Supabase RLS ready for production (requires manual enablement)

**Performance**:
- Next.js 16 with Turbopack for fast builds
- React 18.3.1 for optimal rendering
- Static page generation where applicable
- Dynamic rendering for authenticated routes

For complete production deployment guide, see `PRODUCTION_CHECKLIST.md`