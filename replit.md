# GMB Platform - Replit Configuration

## Overview

GMB Platform is a Next.js-based Google My Business (GMB) management application that helps businesses and agencies manage multiple GMB locations, reviews, and content. The platform leverages AI-powered tools for content generation and sentiment analysis, providing a comprehensive dashboard for monitoring business performance across locations. The project aims to provide a comprehensive and intuitive solution for GMB management.

**Status:** Production-Ready ✅ (October 29, 2025)

## Recent Changes

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