# NNH AI Studio - GMB Platform

## Overview

NNH AI Studio is a comprehensive Google My Business (GMB) management platform built with Next.js 14 and Supabase. The platform enables businesses and agencies to manage multiple GMB locations, reviews, and analytics through an AI-powered interface. It integrates with Google's Business Profile API and YouTube Data API to provide centralized management of online business presence.

The application features automated review response generation using AI, real-time analytics dashboards, multi-location management, and a content composer for both GMB posts and YouTube content. The platform is designed for scalability and supports multi-tenant usage with row-level security.

## Recent Changes

### October 31, 2025 - Full Polish Update
**GMB Dashboard Enhancements:**
- Added mobile menu with Sheet component for responsive navigation
- Migrated all toast notifications from useToast to Sonner for consistency
- Implemented shimmer loading skeletons across Dashboard, Locations, and Reviews pages
- Enhanced Framer Motion animations for AccountCard, LocationCard, and ReviewCard with hover effects
- Improved mobile responsiveness with hamburger menu in dashboard layout

**AI Studio Real Integration:**
- Created `content_generations` database table with RLS policies for storing AI-generated content
- Implemented `/api/ai/generate` API route with multi-provider fallback (Groq → DeepSeek → Together → OpenAI)
- Integrated real AI generation replacing mock data in Content Composer
- Added real-time database updates and content history with Supabase subscriptions
- Implemented production-safe error handling with sanitized logging (API keys protected)
- Added input validation for contentType with allowlist enforcement

**Analytics & Settings:**
- Enhanced Analytics page with Framer Motion animations and shimmer skeletons
- Updated Settings page with Sonner toast notifications throughout
- Added interactive notification preferences with toggle functionality

**Security Improvements:**
- Removed API key exposure from server logs (sanitized console.error calls)
- Implemented input validation to prevent database corruption
- Added structured error responses with generic messages (no Supabase internals leaked)
- Fixed silent database failure bug - errors now properly halt execution

## User Preferences

Preferred communication style: Simple, everyday language (Arabic preferred)

## System Architecture

### Frontend Architecture

**Framework**: Next.js 14 with App Router and React Server Components
- Server-side rendering for initial page loads with client-side hydration
- App Router structure separates public pages, authenticated dashboard routes, and API endpoints
- Server Components used for data fetching to reduce client-side JavaScript
- Client Components (`"use client"`) used only where interactivity is required (forms, charts, animations)

**UI Component System**: shadcn/ui with Radix UI primitives
- Headless UI components from Radix UI provide accessibility and behavior
- Custom styling with Tailwind CSS v4 using CSS variables for theming
- Dark theme with orange accent colors (Electric Orange #FF6B00 as primary)
- Framer Motion for animations and transitions

**State Management**: Minimal client-side state using React hooks
- Supabase client for data fetching and real-time subscriptions
- No global state management library (Redux/Zustand) - relies on React Context and server-side data
- Real-time updates handled through Supabase channels for locations, reviews, and analytics

**Styling Approach**: Pure black theme with electric orange accents
- Tailwind CSS with custom color system defined in CSS variables
- Glassmorphism effects for cards and overlays
- Gradient backgrounds for CTAs and accent elements

### Backend Architecture

**Database**: Supabase (PostgreSQL) with Row Level Security (RLS)
- Tables: `profiles`, `gmb_accounts`, `gmb_locations`, `gmb_reviews`, `oauth_tokens`, `oauth_states`, `activity_logs`, `youtube_drafts`
- Database View: `gmb_locations_with_rating` aggregates review ratings per location
- RLS policies ensure users only access their own data
- Foreign key relationships maintain referential integrity

**Authentication**: Supabase Auth with multiple providers
- Email/password authentication
- Google OAuth for both platform login and GMB/YouTube integration
- Session management handled by Supabase middleware
- Protected routes enforced at layout level with server-side auth checks

**API Routes** (Next.js App Router):
- `/api/gmb/*` - Google My Business operations (OAuth, location sync, review management)
- `/api/youtube/*` - YouTube integration (OAuth, analytics, video/comment fetching, AI composer)
- `/api/auth/*` - Authentication callbacks and session handling
- Server actions in `/server/actions/*` for mutations (create, update, delete operations)

**OAuth Flow**:
- Custom OAuth implementation for GMB and YouTube (not using Supabase Auth providers)
- State tokens stored in `oauth_states` table with expiration
- Access/refresh tokens stored in `oauth_tokens` table per service
- Automatic token refresh before API calls using middleware pattern
- Redirect URIs: `https://nnh.ae/api/gmb/oauth-callback` and `https://nnh.ae/api/youtube/oauth-callback`

### Data Storage Solutions

**Primary Database**: Supabase PostgreSQL
- Stores user profiles, GMB accounts, locations, reviews, OAuth tokens
- JSONB columns for flexible metadata storage (`gmb_locations.metadata`, `gmb_accounts.metadata`)
- Timestamps (`created_at`, `updated_at`) on all tables for audit trails
- Indexes on frequently queried columns (user_id, location_id, google_account_id)

**Real-time Capabilities**: Supabase Realtime
- WebSocket connections for live updates on reviews, locations, activity logs
- Channels configured per component (e.g., `location-performance` channel)
- Automatic UI updates when database records change

**File Storage**: Not currently implemented (future: Supabase Storage for profile images, location photos)

### Authentication & Authorization

**User Authentication**: Supabase Auth
- Email/password with email verification
- Google OAuth for platform login (separate from GMB OAuth)
- Session stored in cookies with automatic refresh
- Middleware intercepts all requests to validate session

**Authorization Model**: Row Level Security (RLS)
- All tables have RLS policies checking `auth.uid() = user_id`
- Service role key used sparingly for admin operations (OAuth callbacks)
- No user can access another user's GMB accounts, locations, or reviews

**Google OAuth Scopes**:
- GMB: `https://www.googleapis.com/auth/business.manage`
- YouTube: `https://www.googleapis.com/auth/youtube.readonly`, `https://www.googleapis.com/auth/yt-analytics.readonly`
- Profile: `https://www.googleapis.com/auth/userinfo.email`, `https://www.googleapis.com/auth/userinfo.profile`

### External Dependencies

**Google Cloud Platform APIs**:
- Google My Business API (Business Profile API, Account Management API, Business Information API)
- YouTube Data API v3
- OAuth 2.0 for authentication
- API keys and client credentials stored in environment variables

**Supabase Services**:
- PostgreSQL database hosting
- Authentication service
- Realtime subscriptions
- Connection pooling and auto-scaling

**AI Providers** (Optional - for Content Composer):
- Groq API (primary, fast inference)
- Together AI (fallback)
- DeepSeek (fallback)
- Used for generating GMB post content and YouTube video descriptions
- API calls made from server-side API routes to protect keys

**Third-party Libraries**:
- Recharts for analytics visualization
- Chart.js for YouTube dashboard charts
- date-fns for date manipulation
- Lucide React for icons
- Framer Motion for animations

**Environment Variables**:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase connection
- `SUPABASE_SERVICE_ROLE_KEY` - Admin operations
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - GMB OAuth
- `YT_CLIENT_ID`, `YT_CLIENT_SECRET` - YouTube OAuth (optional, falls back to GOOGLE_*)
- `GROQ_API_KEY`, `TOGETHER_API_KEY`, `DEEPSEEK_API_KEY` - AI providers
- `NEXT_PUBLIC_BASE_URL` - Production domain (https://nnh.ae)

**Deployment Platform**: Replit
- Configured for Next.js with port 5000
- Environment variables managed through Replit Secrets
- Production domain: https://nnh.ae (or https://www.nnh.ae)