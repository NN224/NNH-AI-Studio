# Dashboard Components

## Overview

This directory contains all the components for the main Dashboard page of the Google My Business management platform.

## Components

### Main Dashboard Page
**File:** `app/(dashboard)/dashboard/page.tsx`

- Server component with authentication check
- Fetches data in parallel using Promise.all
- Implements Suspense boundaries for progressive loading
- Responsive grid layout

### Stats Overview
**File:** `components/dashboard/stats-overview.tsx`

Displays key metrics in 4 cards:
- Active Accounts - Number of connected Google Business accounts
- Total Locations - Active business locations count
- Average Rating - Overall rating across all locations
- Response Rate - Percentage of reviews replied to with pending indicator

### Reviews Widget
**File:** `components/dashboard/reviews-widget.tsx`

Shows recent customer reviews with:
- Star ratings (1-5 stars)
- Review text (truncated to 2 lines)
- Location name
- Time ago formatting
- Reply button for unreplied reviews
- "Replied" badge for responded reviews
- Empty state with icon

### Locations Widget
**File:** `components/dashboard/locations-widget.tsx`

Lists business locations with:
- Location name and address
- Status badge (Active/Pending/Suspended)
- Rating and review count
- Clickable links to location detail pages
- Empty state with sync action
- Hover states for better UX

### Quick Actions
**File:** `components/dashboard/quick-actions.tsx`

Action buttons for common tasks:
1. **Sync GMB Data** - Update locations, reviews, and posts
2. **AI Autopilot** - Automate review responses
3. **View Analytics** - Insights and performance metrics
4. **Manage Reviews** - Reply to customer feedback

Each button shows an icon, label, and description.

### Recent Activity
**File:** `components/dashboard/recent-activity.tsx`

Displays recent user activities:
- Activity type icon
- Activity message
- Time ago formatting
- Empty state for no activities

### Dashboard Skeleton
**File:** `components/dashboard/dashboard-skeleton.tsx`

Loading skeletons for different sections:
- `stats` - For stats overview cards
- `actions` - For quick actions bar
- `widget` - For widget cards (default)

## Data Flow

### Database Tables Used

1. **gmb_accounts** - Google Business accounts
2. **gmb_locations** - Business locations
3. **gmb_reviews** - Customer reviews
4. **activity_logs** - User activities
5. **v_dashboard_stats** - Dashboard statistics view

### Authentication

The dashboard checks user authentication and redirects to `/auth/login` if not authenticated.

### Data Fetching

All data is fetched in parallel using `Promise.all` for optimal performance:

```typescript
const [accounts, locations, reviews, activities, stats] = await Promise.all([...])
```

## TypeScript Interfaces

All components use proper TypeScript interfaces from:
- `@/lib/types/database` - Database type definitions

Key interfaces:
- `GmbAccount`
- `GMBLocation`
- `GMBReview`
- `ActivityLog`
- `DashboardStats`

## Styling

- Uses Tailwind CSS utility classes
- Follows shadcn/ui design patterns
- Responsive breakpoints: `md:`, `lg:`
- Consistent spacing with `space-y-6`
- Muted colors for secondary text
- Hover states for interactive elements

## Component Dependencies

All components import from:
- `@/components/ui/*` - shadcn/ui components
- `lucide-react` - Icons
- `date-fns` - Date formatting
- `next/link` - Navigation

## Empty States

All widgets gracefully handle empty data:
- Centered layout with icon
- Descriptive message
- Action button when applicable

## Error Handling

Errors are logged to console but don't break the UI:
```typescript
if (accountsError) console.error('Error fetching accounts:', accountsError)
```

## Performance

- Server-side data fetching
- Parallel queries with Promise.all
- Suspense boundaries for progressive loading
- Skeleton loaders for better UX
- Efficient database queries with limits

## Responsive Design

- Mobile-first approach
- Grid layouts adapt to screen size:
  - Mobile: Single column
  - Tablet (md): 2 columns
  - Desktop (lg): 3-4 columns

## Future Enhancements

Potential improvements:
- Real-time updates with Supabase subscriptions
- Customizable dashboard layout
- More detailed analytics charts
- Export dashboard data functionality
- Dashboard filters and date ranges

