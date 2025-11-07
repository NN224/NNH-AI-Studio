# NNH AI Studio - Copilot Instructions

## Project Overview

NNH AI Studio is a **bilingual (English/Arabic) Google My Business & YouTube management platform** built with Next.js 14, Supabase, and extensive AI integration. The platform enables businesses to manage GMB locations, reviews, posts, Q&A, YouTube content, and location creation workflows.

## Architecture & Core Patterns

### Multi-Language Support (Critical)
- **RTL/LTR Support**: Use `dir={locale === 'ar' ? 'rtl' : 'ltr'}` in layouts
- **Route Structure**: All routes use `app/[locale]/(dashboard)/` pattern
- **Translations**: Import from `@/messages/{locale}.json`, use `useTranslations()` hook
- **Navigation**: Use `@/lib/navigation.ts` for locale-aware routing

### Authentication & Security
- **Supabase Auth**: Always use `createClient()` from `@/lib/supabase/server` in API routes
- **User Validation**: Use `supabase.auth.getUser()` (NOT `getSession()`) for security
- **Rate Limiting**: Implemented in `middleware.ts` - 100 requests/hour per user
- **Authorization**: Check user ownership for all data operations

### Component Architecture
- **Shadcn/ui**: Base design system in `components/ui/` - never modify directly
- **Feature Components**: Organized by domain (`gmb/`, `ai-studio/`, `dashboard/`)
- **Shared Components**: `GMBConnectionManager` centralizes all GMB button logic
- **Component Patterns**: Use `forwardRef`, `displayName`, and `cn()` utility consistently

## Database Schema (Supabase)

### Core Tables
```sql
-- Primary entities (reference lib/types/database.ts)
gmb_accounts        -- Google My Business connections
gmb_locations       -- Business locations 
gmb_reviews         -- Customer reviews with AI sentiment
gmb_posts           -- Social media posts
gmb_questions       -- Q&A management
youtube_channels    -- YouTube integration
content_generation  -- AI-generated content tracking
profiles           -- User profiles and settings
activity_logs      -- User action history
```

### Critical Relationships
- All GMB data links to `user_id` and `gmb_account_id`
- Locations are the central hub - reviews/posts/questions reference `location_id`
- Use proper foreign key constraints for data integrity

## AI Integration Patterns

### Multi-Provider Support
```typescript
// AI providers: OpenAI, Anthropic, Groq, DeepSeek, Together
const providers = ["groq", "deepseek", "together", "openai"];
// Route: /api/ai/generate (multi-provider content)
// Route: /api/ai/generate-response (Anthropic for reviews)
```

### Content Generation
- **Review Responses**: Anthropic Claude via `/api/ai/generate-response`
- **Posts/Content**: Multi-provider via `/api/ai/generate` 
- **Tone Support**: Professional, friendly, casual, engaging
- **Storage**: Track all generations in `content_generation` table

## Google Integrations

### GMB API Patterns
```typescript
// Always normalize location IDs for consistency
normalized_location_id = location_id.replace(/[^a-zA-Z0-9]/g, '_');

// Use proper resource names from Google
google_resource_name = `accounts/{accountId}/locations/{locationId}`;
```

### Connection Management
- **Central Component**: Use `GMBConnectionManager` for all GMB operations
- **State Management**: React Query for caching (`use-gmb-connection.ts`)
- **Disconnect Options**: Keep data (recommended), export then keep, or delete permanently

## Development Workflows

### Essential Commands
```bash
# Development with custom port
npm run dev              # Runs on port 5000, host 0.0.0.0

# Database operations
node scripts/show_all_tables.js          # Inspect DB schema
node scripts/inspect_db_structure.js     # Detailed table analysis

# Build and deployment
npm run clean && npm run build           # Clean build
```

### File Organization Conventions
- **API Routes**: Organized by feature (`/api/gmb/`, `/api/ai/`, `/api/youtube/`)
- **Server Actions**: Centralized in `server/actions/` with domain separation
- **Utilities**: Domain-specific utils in `lib/{domain}/`
- **Types**: Comprehensive types in `lib/types/database.ts`

## Critical Implementation Details

### Component Composition
```typescript
// Always destructure className and spread props
const Component = ({ className, ...props }: Props) => (
  <div className={cn("base-styles", className)} {...props} />
);

// Use proper display names for debugging
Component.displayName = "ComponentName";
```

### Data Fetching Patterns
```typescript
// API routes: Always validate user first
const { data: { user }, error } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

// Client: Use React Query for caching
const { data, isLoading } = useQuery({
  queryKey: ['key'],
  queryFn: async () => await serverAction(),
  staleTime: 1000 * 60 * 5, // 5 minutes
});
```

### Error Handling
- **API Routes**: Return structured error objects with status codes
- **Client**: Use Sonner toasts for user feedback
- **Database**: Proper foreign key constraints and validation
- **Rate Limiting**: Respect middleware limits in API calls

## Specialized Features

### Location Creation Workflow
- **Phase 2**: Complete UI with mock data (see `app/[locale]/(dashboard)/approvals/README.md`)
- **4-Step Wizard**: Basic info → Category/hours → Features → Review
- **Verification**: Postcard, phone, email, instant methods
- **Status Management**: Draft → Submitted → Pending → Verified/Rejected

### YouTube Integration
- **Content Planning**: AI-assisted video scripts and descriptions
- **Drafts Management**: Save and schedule YouTube content
- **Analytics**: Track performance metrics

## Performance Optimizations

### Caching Strategy
- **React Query**: 5-minute stale time for most data
- **Server Actions**: Implement proper revalidation
- **Static Assets**: Use Next.js Image optimization
- **Database**: Proper indexing on foreign keys and common queries

### Build Optimizations
- **Dynamic Routes**: Use `export const dynamic = 'force-dynamic'` for API routes
- **Bundle Analysis**: Monitor component bundle sizes
- **Image Optimization**: Always use Next.js Image component

## Common Pitfalls to Avoid

1. **Never modify files in `components/ui/`** - these are generated by shadcn
2. **Always use locale-aware routing** - never hardcode `/en` or `/ar` 
3. **Don't bypass authentication** - always validate users in API routes
4. **Avoid direct database mutations** - use proper server actions
5. **Remember RTL support** - test Arabic layout for all new components
6. **Use normalized IDs** - critical for location data consistency

## Quick References

- **Main Config**: `next.config.mjs`, `i18n.ts`, `middleware.ts`
- **Database Types**: `lib/types/database.ts`
- **Styling**: Tailwind with CSS variables, dark mode default
- **Icons**: Lucide React (see `components.json`)
- **Forms**: React Hook Form + Zod validation
- **State**: React Query + server actions pattern

This codebase prioritizes bilingual support, security, and scalable architecture. When implementing new features, follow established patterns for consistency and maintainability.