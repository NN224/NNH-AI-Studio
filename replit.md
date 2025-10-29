# GMB Platform - Replit Configuration

## Overview

GMB Platform is a Next.js-based Google My Business (GMB) management application that helps businesses and agencies manage multiple GMB locations, reviews, and content. The platform leverages AI-powered tools for content generation and sentiment analysis, providing a comprehensive dashboard for monitoring business performance across locations. The project aims to provide a comprehensive and intuitive solution for GMB management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Server Actions Architecture

All server-side mutations are isolated in dedicated server action files within `/server/actions/`. Each action file uses the `"use server"` directive and includes strict authentication, Zod validation for inputs, comprehensive error handling, and cache revalidation. Modules are organized by feature (e.g., `auth.ts`, `accounts.ts`, `locations.ts`, `reviews.ts`, `dashboard.ts`).

Input validation uses Zod schemas defined in `/lib/validations/` to ensure type-safe input constraints and prevent data corruption.

### Frontend Architecture

The frontend is built with Next.js 14+ using the App Router, React Server Components (RSC), and TypeScript. Styling is managed with Tailwind CSS and a custom OKLCH color system, with dark mode as default. UI components leverage Radix UI primitives and shadcn/ui (New York style variant), with Framer Motion for animations.

State management primarily uses React hooks for local state and Supabase real-time subscriptions for live data updates. Client-side and server-side Supabase clients are used as appropriate. Routing includes public, authentication, and protected dashboard routes, with middleware-based route protection.

### Backend Architecture

Supabase is used for authentication (Auth, OAuth, magic links) and as the primary PostgreSQL database. Row Level Security (RLS) enforces data access control. The database schema includes `profiles`, `gmb_accounts`, `gmb_locations`, `gmb_reviews`, and `activity_logs`. Server Actions handle mutations, Server Components fetch data, and Edge Functions are used for specific tasks like OAuth callbacks and real-time subscriptions.

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