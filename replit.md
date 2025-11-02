# NNH AI Studio - Google My Business & YouTube Management Platform

## Overview

NNH AI Studio is a comprehensive SaaS platform for managing Google My Business (GMB) locations and YouTube channels. Built with Next.js 14 (App Router) and Supabase, it provides AI-powered features for content generation, review management, analytics, and multi-location business operations. The platform enables users to connect multiple GMB accounts, manage unlimited locations, respond to reviews with AI assistance, track performance metrics, and manage YouTube content through an integrated dashboard.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### November 2, 2025 - Deployment Fixes (TypeScript Compilation)

**Critical Bug Fixes**: Fixed 3 blocking TypeScript compilation errors preventing deployment:

1. **Variable Scope Issue - 'reviews' not defined**: 
   - Root cause: Local variables (`reviews`, `posts`, `locations`) declared inside first try-catch block were being accessed in second try-catch block (lines 426+)
   - Solution: Added component-level state variables (`currentReviews`, `currentPosts`, `currentLocations`) that persist across function scopes
   - Impact: AI recommendations now have access to data across all try-catch blocks

2. **useEffect Infinite Loop Prevention**:
   - Root cause: `supabase` object in dependency array gets recreated on every render, triggering infinite re-runs
   - Solution: Removed `supabase` from useEffect dependency array, keeping only `router`
   - Impact: Prevents infinite loop while maintaining proper re-fetching on route changes

3. **Missing CSS Utility Classes**:
   - Root cause: Components used `text-destructive` and `text-info` classes but they weren't defined in globals.css
   - Solution: Added `.text-destructive` and `.text-info` classes mapped to CSS variables
   - Impact: All priority badges and status indicators now display correct colors

**Deployment Status**: ✅ TypeScript compilation successful, no LSP errors, workflow running without errors. Production build verified (`npm run build`) - all 25 pages compiled successfully, ready for deployment.

### November 2, 2025 - GMB Dashboard Tab 1 Redesign

**Implementation**: Completely redesigned the Dashboard Overview (Tab 1) with AI-first approach and progressive onboarding.

**New Components Created**:
- `WelcomeHero`: Personalized greeting with Profile Strength progress bar (0-100%) and estimated time to complete onboarding
- `SmartChecklist`: 8-task progressive onboarding checklist with AI suggestions, impact metrics, and locked/unlocked states
- `AICopilotEnhanced`: Priority-based AI recommendations (High/Medium/Low) with 1-click actions and contextual insights
- `PerformanceSnapshot`: Last 7 days performance visualization with bar charts, trend indicators, and AI insights
- `AchievementBadges`: Gamification system with unlockable badges, streak tracking, and progress indicators

**Server Actions Added**:
- `getOnboardingTasks()`: Calculates 8 onboarding tasks based on user's current GMB setup (locations, reviews, posts, etc.)
- `getProfileStrength()`: Returns profile completion percentage (0-100%) and remaining tasks
- `getWeeklyPerformance()`: Fetches last 7 days of GMB metrics with AI-generated insights about peak days
- `getUserAchievements()`: Tracks user achievements (first reply, 7-day streak, content creator, etc.) with progress

**Sidebar Optimization**: Reduced from 10 tabs to 7 tabs by removing:
- Attributes tab (moved functionality to Locations)
- AI Assistant tab (AI now omnipresent throughout dashboard)
- Recommendations tab (merged into Dashboard Overview)

**Design Philosophy**: AI feels like a helpful assistant always present, not isolated in a separate tab. Progressive onboarding guides users from 0% to 100% profile completion with clear impact metrics.

**Edge Cases Handled**: All components gracefully handle empty states when no GMB account is connected, showing appropriate empty state messages instead of crashes.

## System Architecture

### Frontend Architecture

**Framework**: Next.js 14 with App Router pattern for server-side rendering and client-side interactivity.

**Rationale**: App Router provides improved performance through React Server Components, simplified data fetching, and better SEO. The hybrid rendering approach allows critical data to be fetched server-side while maintaining interactive UI elements client-side.

**UI Components**: Radix UI primitives with shadcn/ui component library for accessible, customizable components.

**Styling**: Tailwind CSS 4.0 with custom CSS variables for theming. Pure black theme (#000000) with electric orange (#FF6B00) as primary accent color.

**State Management**: React hooks (useState, useEffect) for local component state. Supabase real-time subscriptions for live data updates across reviews, locations, and activity feeds.

**Animation**: Framer Motion for page transitions, loading states, and interactive elements to enhance user experience.

**Data Visualization**: Chart.js and Recharts for analytics dashboards, performance metrics, and trend visualizations.

### Backend Architecture

**Database**: Supabase (PostgreSQL) for data persistence with Row Level Security (RLS) policies.

**Core Tables**:
- `profiles`: User profile information
- `gmb_accounts`: Google My Business OAuth credentials and account metadata
- `gmb_locations`: Business location data synced from Google
- `gmb_reviews`: Customer reviews with AI sentiment analysis
- `gmb_performance_metrics`: Daily/monthly performance data (views, clicks, calls)
- `youtube_channels`: Connected YouTube channel information
- `youtube_videos`: Video metadata and statistics
- `content_generations`: AI-generated content history
- `activity_logs`: User activity tracking

**Authentication**: Supabase Auth with OAuth 2.0 integration for Google My Business and YouTube APIs.

**API Routes**: Next.js API routes in `/app/api/` for:
- GMB OAuth flow (`/api/gmb/oauth`)
- Data synchronization (`/api/gmb/sync`, `/api/gmb/scheduled-sync`)
- Review responses (`/api/gmb/reviews`)
- AI content generation (`/api/ai/generate`)
- YouTube API integration (`/api/youtube/*`)

**Server Actions**: Next.js Server Actions in `/server/actions/` for server-side data operations with improved type safety and reduced client bundle size.

### AI Integration

**Providers**: Multi-provider support with fallback mechanism:
- Groq (primary, fastest)
- DeepSeek (cost-effective)
- Together AI (reliable)
- OpenAI GPT-4 (premium quality)

**Use Cases**:
- Review response generation with context-awareness
- YouTube title, description, and hashtag generation
- Content draft management (save, load, delete)
- Business insights and recommendations
- Sentiment analysis for reviews

**Architecture Decision**: Provider abstraction layer allows switching between AI services based on availability, cost, or quality requirements without changing application logic.

### External Dependencies

**Google APIs**:
- Google My Business API (Business Information API) - Location data, reviews, Q&A
- Google My Business API (Performance API) - Analytics metrics (views, clicks, calls, directions)
- YouTube Data API v3 - Channel statistics, video data, comments
- OAuth 2.0 - User authentication and authorization

**Configuration**: API credentials stored in environment variables. Token refresh handled automatically by Supabase for long-lived sessions.

**Supabase Services**:
- Authentication - User management, OAuth flows
- Database - PostgreSQL with real-time subscriptions
- Storage - (Available for future media uploads)
- Edge Functions - (Available for background jobs)

**Third-Party Libraries**:
- `@supabase/supabase-js` & `@supabase/ssr` - Database client and SSR utilities
- `chart.js` & `recharts` - Data visualization
- `framer-motion` - Animations
- `date-fns` - Date formatting and manipulation
- `zod` - Runtime type validation (via @hookform/resolvers)
- `react-hook-form` - Form management
- `sonner` - Toast notifications
- `lucide-react` - Icon library

### Deployment Architecture

**Platform**: Vercel for Next.js hosting with serverless functions.

**Scheduled Jobs**: Vercel Cron configured in `vercel.json` for hourly GMB data synchronization (`/api/gmb/scheduled-sync`).

**Environment Variables**:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side operations
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` - OAuth credentials
- `GROQ_API_KEY`, `DEEPSEEK_API_KEY`, etc. - AI provider keys

**Design Rationale**: Vercel provides seamless Next.js integration, automatic HTTPS, global CDN, and zero-config deployments. Serverless functions scale automatically based on demand.

### Data Synchronization

**GMB Data Sync**: Scheduled hourly sync via Vercel Cron pulls latest locations, reviews, and performance metrics from Google APIs. Manual sync available per account in UI.

**Real-time Updates**: Supabase real-time subscriptions notify clients of database changes for immediate UI updates without polling.

**Token Management**: OAuth tokens stored in `gmb_accounts` table with automatic refresh before expiration.

### Error Handling & Monitoring

**Global Error Boundaries**: React error boundaries (`/app/error.tsx`, `/app/global-error.tsx`) catch and display user-friendly error messages.

**API Error Responses**: Consistent JSON error format with status codes and descriptive messages.

**Logging**: Console logging for development; production errors logged to browser console for debugging.

### Security Considerations

**Row Level Security (RLS)**: Supabase RLS policies ensure users only access their own data.

**API Route Protection**: Authentication checks in all API routes via Supabase session validation.

**OAuth Scopes**: Minimal required scopes requested for Google APIs.

**Environment Variables**: Sensitive keys never exposed to client; server-side only operations use service role key.