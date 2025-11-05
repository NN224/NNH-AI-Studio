# NNH AI Studio - GMB & YouTube Management Platform

## Overview

NNH AI Studio is a production-ready SaaS platform for managing Google My Business (GMB) locations and YouTube channels. Built with Next.js 14 App Router and Supabase, it provides AI-powered features for content generation, review management, and analytics tracking. The platform supports multi-account OAuth integration, real-time data synchronization, and comprehensive analytics dashboards.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: Next.js 14 with App Router
- TypeScript-based React application
- Server and Client Components separation pattern
- File-based routing with `app/[locale]` structure for internationalization
- Custom component library built on shadcn/ui with Radix UI primitives

**Internationalization (i18n)**:
- `next-intl` for multi-language support (English and Arabic)
- Locale-prefixed routes (`/en/*`, `/ar/*`)
- RTL support for Arabic language
- Translation files in `messages/` directory
- Custom navigation helpers in `lib/navigation.ts` that wrap next-intl's routing utilities

**UI Component System**:
- Tailwind CSS 4 with custom dark theme (pure black background with electric orange accent)
- shadcn/ui components (Radix UI primitives)
- Framer Motion for animations
- Custom color system defined in `app/globals.css` with CSS variables
- Glass morphism effects and gradient designs

**State Management**:
- React hooks for local state
- Supabase realtime subscriptions for live data updates
- Server Actions for mutations
- Client-side data fetching with Supabase client

### Backend Architecture

**Database & Backend**: Supabase (PostgreSQL + Auth + Realtime)
- PostgreSQL database with Row Level Security (RLS)
- Supabase Auth for user authentication (email/password + OAuth)
- Realtime subscriptions for live data updates
- Three distinct client patterns:
  - `createClient()` from `lib/supabase/client` for browser/client components
  - `createClient()` from `lib/supabase/server` for server components/actions
  - `createAdminClient()` from `lib/supabase/server` for admin operations (bypasses RLS)

**Server Actions Pattern**:
- All server actions in `server/actions/` directory with `"use server"` directive
- Domain-grouped actions: `auth.ts`, `dashboard.ts`, `reviews.ts`, etc.
- Authentication check required at start of each action
- Error handling with try-catch and user-friendly messages
- Production optimization: Suppresses `AuthSessionMissingError` logs (expected when users aren't logged in) while still logging actual authentication failures

**API Routes**:
- API routes protected with `withAuth` middleware wrapper (`lib/api/auth-middleware.ts`)
- RESTful endpoints for external integrations
- Scheduled cron jobs via Vercel (`vercel.json`) for hourly GMB data sync

### Authentication & Authorization

**Authentication Flow**:
- Supabase Auth with email/password and OAuth providers (Google)
- Middleware chain: `next-intl` routing → `updateSession` (Supabase auth)
- Session managed via cookies with automatic refresh
- Protected routes redirect to `/{locale}/auth/login` when unauthenticated
- Session expiration handling with automatic cookie clearing

**OAuth Integration Pattern** (GMB & YouTube):
1. **Create Auth URL**: Generate state token → Store in `oauth_states` table (30min expiry) → Return Google OAuth URL
2. **Callback**: Validate state from `oauth_states` → Mark state as `used: true` → Exchange code for tokens → Store in `oauth_tokens` → Trigger data sync
3. **Token Refresh**: Check token expiry before API calls → Auto-refresh if needed → Update database

**Security**:
- Row Level Security (RLS) policies on all Supabase tables
- State token validation for OAuth to prevent CSRF attacks
- Service role key used only in admin operations
- API routes protected with authentication middleware

### Database Schema

**Core Tables**:
- `profiles`: User profile data linked to Supabase Auth
- `gmb_accounts`: Connected GMB accounts with OAuth tokens reference
- `gmb_locations`: Business locations linked to GMB accounts
- `gmb_reviews`: Customer reviews with AI sentiment analysis
- `gmb_posts`: Business posts/updates
- `gmb_insights`: Analytics and performance metrics
- `youtube_channels`: Connected YouTube channels
- `youtube_videos`: Video metadata and analytics
- `youtube_drafts`: Saved AI-generated content drafts
- `oauth_tokens`: OAuth access/refresh tokens for GMB and YouTube
- `oauth_states`: Temporary state tokens for OAuth flow (with expiry)
- `ai_generation_history`: Content generation logs
- `notifications`: User notifications

**Key Design Decisions**:
- All tables include `user_id` for RLS filtering
- Soft deletes with `deleted_at` timestamp where applicable
- Foreign key relationships with cascading deletes
- Composite indexes for performance on frequent queries
- JSONB columns for flexible metadata storage (e.g., `metadata` in posts)

### External Dependencies

**Third-Party Services**:

1. **Supabase** (Database + Auth + Realtime)
   - PostgreSQL database hosting
   - Built-in authentication and user management
   - Real-time subscriptions for live data
   - Storage for media files

2. **Google APIs**:
   - **Google My Business API**: Location management, reviews, posts, insights
   - **YouTube Data API v3**: Channel stats, videos, comments, analytics
   - OAuth 2.0 flow for both services
   - API credentials managed via environment variables

3. **AI Providers** (Content Generation):
   - **Groq**: Fast inference for content generation
   - **Together AI**: Alternative AI provider
   - **DeepSeek**: Additional AI model option
   - **OpenAI GPT-4**: Premium AI option
   - Fallback mechanism: tries providers in order until success

4. **SendGrid** (Email Service):
   - Transactional emails via `@sendgrid/mail`
   - Custom email templates in `supabase-email-templates/`

5. **Vercel** (Hosting & Deployment):
   - Production hosting platform
   - Serverless functions for API routes
   - Cron jobs for scheduled sync tasks
   - Environment variable management

**Key Libraries**:
- `next-intl`: Internationalization
- `framer-motion`: Animations
- `chart.js`: Analytics charts
- `react-chartjs-2`: React wrapper for Chart.js
- `date-fns`: Date manipulation
- `sonner`: Toast notifications
- `@react-google-maps/api`: Google Maps integration
- `zod`: Schema validation with `@hookform/resolvers`

**Development Tools**:
- TypeScript for type safety
- ESLint for code quality
- Tailwind CSS for styling
- Custom VS Code launch configurations

### Data Flow

**GMB Integration**:
1. User connects GMB account via OAuth
2. System exchanges code for tokens and stores in `oauth_tokens`
3. Fetches accounts, locations, reviews from Google My Business API
4. Stores data in respective tables with user_id association
5. Hourly cron job syncs new data automatically
6. Realtime subscriptions update UI when data changes

**YouTube Integration**:
1. User connects YouTube channel via OAuth
2. System stores tokens and fetches channel metadata
3. Pulls video list, statistics, and comments
4. AI composer generates titles/descriptions/hashtags
5. Draft system saves generated content to `youtube_drafts`
6. Auto token refresh before API calls to maintain connection

**AI Content Generation**:
1. User provides prompt and selects tone/type
2. System tries AI providers in order (Groq → Together → Deepseek → OpenAI)
3. Generated content saved to `ai_generation_history` or `youtube_drafts`
4. Realtime updates notify UI of new generations
5. Users can copy, edit, or delete generated content

## Development Tools

### NNH Code Auditor Extension

**Location**: `code-auditor/`  
**Purpose**: AI-powered code analysis and automatic fixing tool  
**Powered by**: Claude Sonnet 4.5 (Anthropic)

**Features**:
- Comprehensive code audit (Frontend, Backend, Security, Performance, Database)
- Priority-based issue classification (Critical, High, Medium, Low)
- Automatic fix application with backup creation
- Real-time analysis via web UI or REST API
- Runs on port 3001 alongside main Next.js app (port 5000)

**Architecture**:
```
code-auditor/
├── src/
│   ├── index.js          # Express server & API endpoints
│   ├── claudeClient.js   # Claude Sonnet 4.5 integration
│   ├── fileHandler.js    # File reading/writing with backup
│   └── prompts.js        # Comprehensive audit prompts
├── public/               # Web UI for auditing
├── .env                  # Configuration (PROJECT_PATH, ANTHROPIC_API_KEY)
└── HOW_TO_USE.md        # Detailed usage guide
```

**API Endpoints**:
- `GET /api/health` - Service status check
- `POST /api/audit/dashboard` - Audit dashboard components
- `POST /api/fix/apply` - Apply code fixes automatically
- `GET /api/files/:component` - List component files

**Usage**:
```bash
# Via Web UI
http://localhost:3001

# Via API
curl -X POST http://localhost:3001/api/audit/dashboard
```

**Configuration**:
- `PROJECT_PATH`: Points to main workspace (`/home/runner/workspace`)
- `ANTHROPIC_API_KEY`: Claude API key from Replit Secrets
- Port: 3001 (separate from main app)

**Audit Scope**:
- Component structure and organization
- State management patterns
- Responsive design and accessibility
- TypeScript type safety
- Security vulnerabilities (XSS, SQL injection, CSRF)
- Database query optimization
- API authentication and validation
- Performance bottlenecks

**Cost**: ~$0.15-$0.30 per comprehensive dashboard audit

**Key Decision**: Extension runs as separate workflow to avoid interfering with main application development flow