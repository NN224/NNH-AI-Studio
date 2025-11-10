# GMB Dashboard Refactoring - Implementation Guide

## Overview
This document describes the newly refactored GMB Dashboard with tab-based navigation.

## Architecture

### Components Created

#### 1. `components/gmb/gmb-dashboard.tsx`
Main dashboard component that orchestrates the GMB interface.

**Features:**
- Integrates with `GMBConnectionManager` for account management
- Shows loading states with skeleton UI
- Displays error states with proper alerts
- Includes location selector dropdown when multiple locations exist
- Conditionally renders tabs based on location selection

**Usage Example:**
```tsx
import GMBDashboard from "@/components/gmb/gmb-dashboard";

export default function GMBPage() {
  return <GMBDashboard />;
}
```

#### 2. `components/gmb/gmb-dashboard-tabs.tsx`
Tab-based navigation component with four management sections.

**Tabs:**
- **Insights**: Location metrics and performance data
- **Reviews**: Review management and response interface
- **Posts**: Post creation and management
- **Q&A**: Question and answer management

**Props:**
```typescript
interface GMBTabsProps {
  location: GMBLocation;
}
```

#### 3. Card Components

**`components/gmb/location-insights-card.tsx`**
- Displays location name, address, rating, and review count
- Shows category and contact information
- Visual metrics cards for key KPIs

**`components/reviews/review-management-card.tsx`**
- Shows total reviews and response rate
- Provides quick insights on response performance
- Action buttons to manage reviews

**`components/posts/post-management-card.tsx`**
- Information about post types (What's New, Events, Offers, Products)
- Action buttons for post creation and management
- Visibility tips

**`components/questions/qa-management-card.tsx`**
- Shows answered vs pending questions
- Quick tips for better Q&A management
- Action buttons for question management

### 4. Hook: `hooks/use-gmb.ts`

Custom React hook for managing GMB locations and selection state.

**Returns:**
```typescript
interface UseGMBReturn {
  locations: GMBLocation[];        // All available locations
  isLoading: boolean;              // Loading state
  error: Error | null;             // Error state
  selectedLocation: GMBLocation | null; // Currently selected location
  handleLocationSelect: (locationId: string) => void; // Selection handler
  refresh: () => void;             // Refresh locations
}
```

**Features:**
- Fetches locations from `/api/gmb/locations`
- Auto-selects first active location on load
- React Query integration for caching (5-minute stale time)
- Automatic refetch on window focus

### 5. Type Definitions: `lib/types/gmb-types.ts`

Re-exports GMB types from database for convenience:
```typescript
export type { 
  GMBLocation, 
  GMBLocationWithRating, 
  GMBReview, 
  GmbAccount 
} from './database';
```

## User Flow

1. **Initial Load**: Dashboard checks for GMB connection
   - If not connected: Shows `GMBConnectionManager` with full variant
   - If connected but no locations: Shows connection status
   - If locations exist: Shows compact connection manager + location selector

2. **Location Selection**: 
   - Dropdown appears when multiple locations exist
   - Auto-selects first active location
   - User can switch between locations

3. **Tab Navigation**:
   - Four tabs: Insights, Reviews, Posts, Q&A
   - Each tab shows relevant management interface
   - Consistent UI/UX across all tabs

## API Requirements

The dashboard expects the following API endpoint:

**`GET /api/gmb/locations`**
```json
{
  "locations": [
    {
      "id": "string",
      "location_name": "string",
      "location_id": "string",
      "normalized_location_id": "string",
      "address": "string",
      "phone": "string",
      "website": "string",
      "category": "string",
      "rating": number,
      "review_count": number,
      "response_rate": number,
      "is_active": boolean,
      ...
    }
  ]
}
```

## Styling

All components follow the application's design system:
- Dark theme with zinc color palette
- Orange accent colors for GMB branding
- Responsive grid layouts
- Consistent card designs
- Hover states and transitions

## Future Enhancements

1. **Real-time Data**: Add WebSocket or polling for live updates
2. **Bulk Actions**: Multi-location bulk operations
3. **Advanced Filtering**: Filter reviews/questions by various criteria
4. **Analytics Integration**: Deep dive into location performance
5. **AI Suggestions**: Smart recommendations for each tab

## Testing

To test the new dashboard:
1. Ensure GMB account is connected
2. Navigate to the page using `<GMBDashboard />`
3. Verify all tabs load correctly
4. Test location switching if multiple locations exist
5. Check responsive behavior on mobile devices

## Migration Notes

This refactoring provides:
- ✅ Cleaner, more organized UI
- ✅ Better separation of concerns
- ✅ Scalable architecture for adding new features
- ✅ Improved user experience with tabs
- ✅ Reduced visual clutter

The implementation follows the repository's existing patterns and integrates seamlessly with the current codebase.
