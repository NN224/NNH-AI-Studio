# GMB Platform - Replit Configuration

## Overview

GMB Platform is a Next.js-based Google My Business (GMB) management application that helps businesses and agencies manage multiple GMB locations, reviews, and content. The platform leverages AI-powered tools for content generation and sentiment analysis, providing a comprehensive dashboard for monitoring business performance across locations. The project aims to provide a comprehensive and intuitive solution for GMB management.

**Status:** Production-Ready ✅ (October 29, 2025)

## Recent Changes

### October 30, 2025 - Professional Home Page Redesign with NNH Branding
- **Complete UI Overhaul:** Redesigned `/home` page with same professional design as auth pages (animated gradient background, glass morphism effects, modern typography).
- **NNH Branding Integration:** Added NNH logo (48x48px) to header, "NNH - AI Studio" title with gradient text effect, and updated all content to reflect NNH brand identity.
- **Animated Background:** Implemented three rotating gradient orbs with CSS animations (7s duration, staggered delays) for dynamic visual appeal.
- **Enhanced Components:** Upgraded CTA button with gradient styling (from-primary to-accent), feature cards with hover scale animations, welcome badge with icon, and glass-effect header with Sign Out button.
- **Improved UX:** Better typography hierarchy (5xl/6xl headings), enhanced descriptions, smooth transitions, and responsive design for all screen sizes.
- **Architect Verified:** Production-ready implementation with recommendation to add prefers-reduced-motion guard for accessibility improvements.

### October 30, 2025 - Content-Type Validation for Google API Responses
- **Enhanced Error Handling:** Added Content-Type verification to `fetchLocations()`, `fetchReviews()`, and `fetchMedia()` functions in `app/api/gmb/sync/route.ts` to prevent crashes when Google API returns HTML error pages instead of JSON.
- **Pre-Parse Validation:** All functions now check `Content-Type` header before attempting `.json()` parsing, with fallback to `.text()` for debugging non-JSON responses.
- **Graceful Degradation:** Reviews and Media fetch failures return empty arrays instead of crashing, while Locations failures throw descriptive errors with parsed error messages.
- **Improved Logging:** Enhanced error messages include actual Content-Type received, truncated error text (200 chars), and clear indication of JSON parse failures.
- **Production Safety:** Prevents "Unexpected token '<'" errors when Google APIs return HTML error pages, ensuring sync process continues gracefully even with API failures.

### October 30, 2025 - All-Time Analytics Implementation
- **Removed Time Constraints:** Eliminated all time-based filters (6 months, 30 days, 7 days) from analytics queries to show complete historical data across entire platform lifetime.
- **Server Actions Update:** Modified `getMonthlyStats()` in `server/actions/dashboard.ts` to fetch all reviews without date restrictions, removed `.slice(-6)` limitation, and updated error messages to reflect all-time scope.
- **Traffic Chart Enhancement:** Converted `TrafficChart` from daily (last 7 days) to monthly view (all time), automatically grouping reviews by month with proper chronological sorting.
- **UI Updates:** Changed all time-range labels from "Last 30 Days"/"Last 7 Days" to "All time" across Analytics page and component headers.
- **User Preference Alignment:** Implementation follows user's explicit preference for lifetime cumulative statistics instead of time-boxed metrics.

### October 30, 2025 - Google API JSON Response Enforcement
- **Fixed "Unexpected token '<'" Errors:** Added explicit JSON request/response handling to ALL Google API calls by including `Accept: application/json` headers and `alt=json` query parameters, preventing HTML error pages from being returned instead of JSON.
- **Comprehensive API Coverage:** Updated all Google API fetch calls in `sync/route.ts` (fetchLocations, fetchReviews, fetchMedia, account discovery) and `oauth-callback/route.ts` (userinfo, GMB accounts, locations) with JSON safeguards.
- **Production-Ready Implementation:** Architect-verified that all Google API endpoints now enforce JSON responses, eliminating parsing errors and ensuring graceful error handling across OAuth flows and sync operations.

### October 30, 2025 - API Error Handling & Schema Column Fixes
- **Improved Sync Error Handling:** Fixed "Unexpected token '<'" errors in `useAccountsManagement.ts` by using `.text()` first before attempting `.json()` parsing, preventing crashes when API returns HTML error pages (500, 404, etc.).
- **Enhanced Error Logging:** Added comprehensive error context logging (status, url, text) for debugging sync failures, with automatic JSON/HTML response detection.
- **Schema Column Fix:** Corrected `review-sentiment-chart.tsx` to use `ai_sentiment` instead of non-existent `sentiment` column, eliminating 400 errors from Supabase queries.
- **User-Friendly Error Messages:** Trimmed error messages to 200 characters to prevent overwhelming toast notifications with full HTML error pages.
- **Production Readiness:** Architect-verified fixes ensure graceful degradation and clear error reporting for all sync failure scenarios.

### October 30, 2025 - OAuth Callback Composite Key UPSERT
- **Database Schema Enhancement:** Changed from single UNIQUE constraint on `account_id` to composite UNIQUE constraint on `(user_id, account_id)`, enabling proper multi-account support per user while preventing cross-user takeover at database level.
- **Simplified Account Persistence:** Replaced manual security check + conditional INSERT/UPDATE with streamlined UPSERT on composite key `(user_id, account_id)`, reducing code complexity while maintaining robust security.
- **Enhanced Error Handling:** Eliminated silent failures by ensuring all error paths (cross-user conflict, upsert failure, no account saved) return explicit error redirects with clear messages, preventing false success indicators.
- **Refresh Token Preservation:** Maintained refresh token preservation logic with fallback (`tokenData.refresh_token || existingAccount?.refresh_token || null`) to prevent token loss when Google omits new refresh token.
- **Production-Ready Flow:** Implemented comprehensive validation ensuring success redirect only occurs when `savedAccountId` exists, architect-verified as production-ready with zero silent failure paths.

### October 30, 2025 - Database View for Location Ratings
- **Created gmb_locations_with_rating View:** Added database view that aggregates rating, reviews_count, and last_review_date from gmb_reviews table, eliminating need for manual joins and ensuring consistent rating calculations across the application.
- **Real-time Rating Updates:** Updated LocationPerformance component to subscribe to both gmb_locations and gmb_reviews tables, ensuring UI automatically reflects new reviews and rating changes.
- **Type Safety for Views:** Created GMBLocationWithRating TypeScript interface in lib/types/database.ts for type-safe view queries.
- **Migration File:** Added supabase/migrations/20251030000013_create_locations_with_rating_view.sql for production deployment.

### October 29, 2025 - Production Deployment Preparation
- **Created Comprehensive Deployment Documentation:** Added 4 detailed guides (54KB total) in Arabic for Google Console, Supabase, and Replit Secrets configuration.
- **Backup Creation:** Complete backup of all GMB and Auth files (34 files) in `beso/` folder for safekeeping.
- **Environment Variables Documentation:** Created `SECRETS_CHECKLIST.txt` with all 7 required environment variables for deployment on `nnh.ae` domain.
- **OAuth Configuration:** Documented exact redirect URI setup: `https://nnh.ae/api/gmb/oauth-callback` for Google OAuth integration.

### October 29, 2025 - Critical Bug Fixes & Production Readiness
- **Fixed OAuth Callback Routing:** Reordered condition checks in `app/auth/callback/route.ts` to prioritize `state` parameter before `code`, ensuring Google OAuth callbacks are properly routed to `/api/gmb/oauth-callback` instead of being incorrectly handled by Supabase auth flow.
- **Enhanced Error Handling:** Added comprehensive try-catch blocks to `app/(dashboard)/locations/page.tsx` and `app/(dashboard)/reviews/page.tsx` to prevent silent failures and ensure proper error logging for Supabase queries.
- **Removed Deprecated Code:** Deleted obsolete Supabase Edge Functions (38 TypeScript errors) that were replaced by Next.js API routes.
- **Type Safety Improvements:** Fixed all TypeScript errors related to `GmbAccount.status` property usage by using `is_active` boolean field instead.
- **Build Optimization:** Project now builds successfully with zero TypeScript errors and server starts in ~420ms.

## User Preferences

Preferred communication style: Simple, everyday language (Arabic for user communication).

## System Architecture

### Server Actions Architecture

All server-side mutations are isolated in dedicated server action files within `/server/actions/`. Each action file uses the `"use server"` directive and includes strict authentication, Zod validation for inputs, comprehensive error handling, and cache revalidation. Modules are organized by feature (e.g., `auth.ts`, `accounts.ts`, `locations.ts`, `reviews.ts`, `dashboard.ts`).

Input validation uses Zod schemas defined in `/lib/validations/` to ensure type-safe input constraints and prevent data corruption.

### Database Schema Management

The project uses Supabase PostgreSQL with direct SQL migrations stored in `/supabase/migrations/`. TypeScript interfaces are defined in `/lib/types/database.ts` to match the database schema. There is no ORM layer - database interactions use the Supabase client directly.

### Frontend Architecture

The frontend is built with Next.js 14+ using the App Router, React Server Components (RSC), and TypeScript. Styling is managed with Tailwind CSS and a custom OKLCH color system, with dark mode as default. UI components leverage Radix UI primitives and shadcn/ui (New York style variant), with Framer Motion for animations.

State management primarily uses React hooks for local state and Supabase real-time subscriptions for live data updates. Client-side and server-side Supabase clients are used as appropriate. Routing includes public, authentication, and protected dashboard routes, with middleware-based route protection.

### Backend Architecture

Supabase is used for authentication (Auth, OAuth, magic links) and as the primary PostgreSQL database. Row Level Security (RLS) enforces data access control. The database schema includes `profiles`, `gmb_accounts`, `gmb_locations`, `gmb_reviews`, and `activity_logs`. Server Actions handle mutations, Server Components fetch data. OAuth callbacks and API integrations are handled via Next.js API routes in `/app/api/gmb/`.

### Authentication Flow

The platform supports multi-method authentication (Email/Password, Google OAuth, Magic Link, Phone/SMS). Session management uses persistent, cookie-based sessions with automatic refresh and protected route enforcement.

### AI Integration

AI-powered tools are integrated for content generation (posts, responses, descriptions, FAQs) with support for multiple AI providers (OpenAI, Anthropic, Groq) and customizable tone selection. For review management, AI performs automated sentiment analysis and suggests responses, with a workflow for tracking review responses.

### Real-time Features

Live data synchronization for location status, review notifications, activity feed, and dashboard metrics is achieved via Supabase real-time subscriptions. Optimistic UI updates provide immediate feedback to users.

### Dashboard Features

The dashboard provides real-time statistics (total locations, reviews, average rating, response rate), monthly performance charts powered by `getMonthlyStats()` server action, and an activity feed with live updates. It includes robust error handling, loading states, and empty states. Analytics and visualization utilize Recharts for displaying traffic trends, sentiment distribution, and performance metrics.

## External Dependencies

### Core Services

-   **Supabase**: PostgreSQL database, Authentication, Real-time subscriptions, Edge Functions, Row Level Security.
-   **Replit**: Deployment, hosting, environment secrets management, autoscale deployment.

### Third-Party APIs

-   **Google My Business API**: Location data synchronization, review management, account connection.
-   **AI Services**: OpenAI GPT-4 API, Anthropic Claude API, Groq API (for content generation and sentiment analysis).

### UI & Visualization Libraries

-   **Component Libraries**: `@radix-ui/*`, `shadcn/ui`, `lucide-react` (icons), `cmdk` (command palette).
-   **Animation & Interaction**: `framer-motion`, `embla-carousel-react`, `react-hook-form` with `zod` validation.
-   **Data Visualization**: `recharts`.

### Development Tools

-   **Framework**: Next.js, TypeScript.
-   **Styling**: Tailwind CSS.
-   **Linting**: ESLint.
-   **Date Manipulation**: `date-fns`.
-   **Utilities**: `class-variance-authority`, `clsx`, `tailwind-merge`.