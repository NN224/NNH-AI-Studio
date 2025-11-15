# 📘 Dashboard Developer Guide

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Getting Started](#getting-started)
4. [Core Features](#core-features)
5. [API Reference](#api-reference)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The NNH-AI-Studio Dashboard is a production-ready, feature-rich dashboard for managing Google My Business locations, reviews, posts, and more. It includes real-time updates, advanced filtering, AI insights, and comprehensive performance monitoring.

### Key Features

- ✅ Real-time updates via Supabase subscriptions
- ✅ Advanced caching with SWR (Stale-While-Revalidate)
- ✅ Notification center with real-time alerts
- ✅ Advanced filtering with saved presets
- ✅ AI-powered insights and recommendations
- ✅ Rate limiting and input sanitization
- ✅ Performance monitoring and tracking
- ✅ Bilingual support (Arabic/English)
- ✅ Dark mode support
- ✅ Mobile responsive

---

## Architecture

### Component Structure

```
components/dashboard/
├── Core Components
│   ├── stats-overview.tsx          # Dashboard statistics
│   ├── reviews-widget.tsx          # Recent reviews
│   ├── locations-widget.tsx        # Active locations
│   ├── quick-actions.tsx           # Quick action buttons
│   └── recent-activity.tsx         # Activity feed
│
├── New Production Components
│   ├── notifications-center.tsx    # Real-time notifications
│   ├── advanced-filters.tsx        # Advanced filtering
│   └── ai-insights-panel.tsx       # AI insights
│
└── Charts
    ├── reviews-trend-chart.tsx
    ├── rating-distribution-chart.tsx
    ├── response-rate-chart.tsx
    └── activity-heatmap.tsx
```

### Data Flow

```
User Action
    ↓
Dashboard Component
    ↓
Cache Check (dashboardCache)
    ↓ (miss)
API Call / Supabase Query
    ↓
Rate Limit Check
    ↓
Data Fetching
    ↓
Cache Update
    ↓
Real-time Subscription
    ↓
Component Update
```

---

## Getting Started

### 1. Database Setup

Run the migration to create required tables:

```bash
psql -h your-db-host -U your-user -d your-db -f sql/dashboard-production-tables.sql
```

Or via Supabase CLI:

```bash
supabase db push
```

### 2. Install Dependencies

```bash
npm install date-fns lucide-react recharts framer-motion isomorphic-dompurify
```

### 3. Environment Variables

Ensure these are set in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Import Components

```typescript
import { NotificationCenter } from '@/components/dashboard/notifications-center'
import { AdvancedFilters } from '@/components/dashboard/advanced-filters'
import { AIInsightsPanel } from '@/components/dashboard/ai-insights-panel'
import { useDashboardRealtime } from '@/hooks/use-dashboard-realtime'
import { dashboardCache, CACHE_KEYS } from '@/lib/dashboard-cache'
```

---

## Core Features

### 1. Real-time Updates

**Hook: `useDashboardRealtime`**

```typescript
import { useDashboardRealtime } from '@/hooks/use-dashboard-realtime'

function MyDashboard() {
  const { isConnected, lastUpdate, updateCount } = useDashboardRealtime({
    userId: user.id,
    onReviewUpdate: (data) => {
      console.log('New review:', data)
      // Refresh dashboard data
    },
    onPostUpdate: (data) => {
      console.log('Post updated:', data)
    },
    enabled: true,
  })

  return (
    <div>
      {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      <p>Updates: {updateCount}</p>
    </div>
  )
}
```

### 2. Caching System

**Module: `lib/dashboard-cache.ts`**

```typescript
import { dashboardCache, CACHE_KEYS, cacheHelpers } from '@/lib/dashboard-cache'

// Get data with caching
const stats = await cacheHelpers.getDashboardData(
  CACHE_KEYS.DASHBOARD_STATS(userId),
  async () => {
    const { data } = await supabase
      .from('v_dashboard_stats')
      .select('*')
      .eq('user_id', userId)
      .single()
    return data
  },
  { ttl: 5 * 60 * 1000 } // 5 minutes
)

// Get data with SWR
const reviews = await cacheHelpers.getDashboardDataSWR(
  CACHE_KEYS.DASHBOARD_REVIEWS(userId),
  async () => {
    const { data } = await supabase
      .from('gmb_reviews')
      .select('*')
      .eq('user_id', userId)
      .limit(10)
    return data
  }
)

// Invalidate cache
dashboardCache.invalidate(CACHE_KEYS.DASHBOARD_STATS(userId))

// Invalidate all user caches
cacheHelpers.invalidateUserDashboard(userId)
```

### 3. Notifications

**Component: `NotificationCenter`**

```typescript
import { NotificationCenter } from '@/components/dashboard/notifications-center'

function Header() {
  return (
    <div className="flex items-center gap-4">
      <NotificationCenter userId={user.id} locale="en" />
    </div>
  )
}
```

**Create Notification (Server-side):**

```typescript
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()

await supabase.from('notifications').insert({
  user_id: userId,
  type: 'review',
  title: 'New Review',
  message: 'You received a 5-star review!',
  link: '/dashboard/reviews',
  metadata: { reviewId: '123' },
})
```

### 4. Advanced Filters

**Component: `AdvancedFilters`**

```typescript
import { AdvancedFilters } from '@/components/dashboard/advanced-filters'

function Dashboard() {
  const [filters, setFilters] = useState<DashboardFilters>({})

  const handleApplyFilters = (newFilters: DashboardFilters) => {
    setFilters(newFilters)
    // Fetch data with filters
    fetchDashboardData(newFilters)
  }

  return (
    <AdvancedFilters
      onApply={handleApplyFilters}
      onExport={(filters) => exportData(filters)}
      locations={locations}
      locale="en"
    />
  )
}
```

### 5. AI Insights

**Component: `AIInsightsPanel`**

```typescript
import { AIInsightsPanel } from '@/components/dashboard/ai-insights-panel'

function Dashboard() {
  const stats = {
    totalReviews: 150,
    averageRating: 4.5,
    responseRate: 85,
    pendingReviews: 5,
    unansweredQuestions: 2,
    ratingTrend: 5.2,
    reviewsTrend: 10.5,
  }

  return <AIInsightsPanel stats={stats} loading={false} locale="en" />
}
```

### 6. Rate Limiting

**Module: `lib/security/rate-limiter.ts`**

```typescript
import { checkRateLimit, RATE_LIMITS } from '@/lib/security/rate-limiter'

// In API route
export async function GET(request: Request) {
  const userId = await getUserId(request)

  const rateLimit = await checkRateLimit(
    userId,
    '/api/dashboard/stats',
    RATE_LIMITS.DASHBOARD_LOAD
  )

  if (!rateLimit.success) {
    return new Response(JSON.stringify({ error: rateLimit.message }), {
      status: 429,
      headers: {
        'X-RateLimit-Limit': rateLimit.limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': rateLimit.reset.toISOString(),
      },
    })
  }

  // Process request...
}
```

### 7. Input Sanitization

**Module: `lib/security/input-sanitizer.ts`**

```typescript
import { sanitizeInput, sanitizeObject } from '@/lib/security/input-sanitizer'

// Sanitize single input
const cleanText = sanitizeInput(userInput, 'text')
const cleanHtml = sanitizeInput(userInput, 'html')
const cleanUrl = sanitizeInput(userInput, 'url')

// Sanitize object
const cleanData = sanitizeObject(formData, {
  name: 'text',
  email: 'email',
  website: 'url',
  description: 'html',
})
```

### 8. Performance Tracking

**Module: `lib/performance-tracking.ts`**

```typescript
import { performanceTracker, trackDashboardLoad, trackApiCall } from '@/lib/performance-tracking'

// Track dashboard load
const tracker = trackDashboardLoad()

// Track data fetching
const endFetch = tracker.trackDataFetch('reviews')
await fetchReviews()
endFetch()

// End dashboard load
tracker.end()

// Track API call
const data = await trackApiCall('getStats', async () => {
  return await fetch('/api/stats').then((r) => r.json())
})

// Initialize tracking (in _app.tsx or layout.tsx)
useEffect(() => {
  initPerformanceTracking()
}, [])
```

---

## API Reference

### Hooks

#### `useDashboardRealtime`

```typescript
interface UseDashboardRealtimeOptions {
  userId: string
  onReviewUpdate?: (data: any) => void
  onPostUpdate?: (data: any) => void
  onQuestionUpdate?: (data: any) => void
  onLocationUpdate?: (data: any) => void
  onActivityUpdate?: (data: any) => void
  enabled?: boolean
}

function useDashboardRealtime(options: UseDashboardRealtimeOptions): {
  isConnected: boolean
  lastUpdate: RealtimeUpdate | null
  updateCount: number
  reconnect: () => void
}
```

### Classes

#### `DashboardCache`

```typescript
class DashboardCache {
  get<T>(key: string): T | null
  getWithSWR<T>(key: string): { data: T | null; isStale: boolean }
  set<T>(key: string, data: T, options?: CacheOptions): void
  invalidate(key: string): void
  invalidatePattern(pattern: string): void
  clear(): void
  getStats(): CacheStats
  cleanup(): void
}
```

#### `PerformanceTracker`

```typescript
class PerformanceTracker {
  start(metricName: string): void
  end(metricName: string, metadata?: Record<string, any>): number
  record(name: string, value: number, metadata?: Record<string, any>): void
  get(metricName: string): number | undefined
  getAll(): Record<string, number>
  clear(): void
  flush(): Promise<void>
  trackWebVitals(): void
  trackNavigationTiming(): void
  trackResourceTiming(): void
}
```

### Functions

#### Rate Limiting

```typescript
async function checkRateLimit(
  identifier: string,
  endpoint: string,
  config?: RateLimitConfig
): Promise<RateLimitResult>

async function cleanupRateLimitRecords(olderThanMs?: number): Promise<void>

async function getRateLimitStatus(
  identifier: string,
  endpoint: string,
  windowMs?: number
): Promise<{ count: number; resetAt: Date }>
```

#### Input Sanitization

```typescript
function sanitizeHtml(dirty: string): string
function sanitizeText(input: string): string
function sanitizeUrl(url: string): string
function sanitizeEmail(email: string): string
function sanitizePhone(phone: string): string
function sanitizeFileName(fileName: string): string
function sanitizeJson<T>(input: string): T | null
function sanitizeInput(input: string, type: InputType): string
function sanitizeObject<T>(obj: T, schema: Schema): T
```

---

## Best Practices

### 1. Caching

- **Always use caching** for dashboard data
- Set appropriate TTL based on data freshness requirements
- Use SWR for better UX (show stale data while revalidating)
- Invalidate cache after mutations

```typescript
// ✅ Good
const data = await cacheHelpers.getDashboardDataSWR(key, fetcher, { ttl: 300000 })

// ❌ Bad
const data = await fetcher() // No caching
```

### 2. Real-time Updates

- Enable real-time only when needed
- Clean up subscriptions on unmount
- Handle reconnection gracefully
- Batch updates to avoid excessive re-renders

```typescript
// ✅ Good
useEffect(() => {
  const { reconnect } = useDashboardRealtime({ userId, enabled: isActive })
  return () => {
    // Cleanup handled automatically
  }
}, [userId, isActive])

// ❌ Bad
useDashboardRealtime({ userId, enabled: true }) // Always on, no cleanup
```

### 3. Performance

- Use React.memo for expensive components
- Use useMemo for expensive calculations
- Lazy load heavy components
- Track performance metrics

```typescript
// ✅ Good
const StatsCard = React.memo(({ data }: Props) => {
  const formattedData = useMemo(() => formatData(data), [data])
  return <Card>{formattedData}</Card>
})

// ❌ Bad
function StatsCard({ data }: Props) {
  const formattedData = formatData(data) // Recalculates on every render
  return <Card>{formattedData}</Card>
}
```

### 4. Security

- Always sanitize user input
- Check rate limits for sensitive operations
- Validate data on both client and server
- Use parameterized queries

```typescript
// ✅ Good
const cleanInput = sanitizeInput(userInput, 'text')
const rateLimit = await checkRateLimit(userId, endpoint, config)
if (!rateLimit.success) return error

// ❌ Bad
const result = await query(`SELECT * FROM users WHERE name = '${userInput}'`)
```

### 5. Error Handling

- Use error boundaries for components
- Log errors to database
- Show user-friendly messages
- Provide retry mechanisms

```typescript
// ✅ Good
<ErrorBoundary fallback={<ErrorMessage />}>
  <DashboardComponent />
</ErrorBoundary>

// ❌ Bad
<DashboardComponent /> // No error handling
```

---

## Troubleshooting

### Real-time Not Working

**Problem:** Real-time updates not received

**Solutions:**
1. Check Supabase connection
2. Verify RLS policies allow subscriptions
3. Check browser console for errors
4. Ensure correct user ID is passed
5. Try reconnecting manually

```typescript
const { reconnect } = useDashboardRealtime({ userId })
// Call reconnect() if connection drops
```

### Cache Not Updating

**Problem:** Stale data shown after mutation

**Solution:** Invalidate cache after mutations

```typescript
// After creating/updating data
dashboardCache.invalidate(CACHE_KEYS.DASHBOARD_STATS(userId))
// Or invalidate all user caches
cacheHelpers.invalidateUserDashboard(userId)
```

### Rate Limit Errors

**Problem:** 429 Too Many Requests

**Solutions:**
1. Increase rate limit for endpoint
2. Implement request debouncing
3. Use caching to reduce API calls
4. Check for infinite loops

```typescript
// Increase limit
const RATE_LIMITS = {
  MY_ENDPOINT: {
    maxRequests: 100, // Increase from 30
    windowMs: 60000,
  },
}
```

### Performance Issues

**Problem:** Dashboard loads slowly

**Solutions:**
1. Enable caching
2. Use lazy loading
3. Optimize queries
4. Add indexes to database
5. Use React.memo and useMemo

```typescript
// Check performance metrics
const stats = performanceTracker.getAll()
console.log(stats)
```

---

## Additional Resources

- [Dashboard Components README](../components/dashboard/README.md)
- [Dashboard Enhancements](../components/dashboard/ENHANCEMENTS.md)
- [Dashboard Charts](../components/dashboard/charts/README.md)
- [Production Implementation](../DASHBOARD_PRODUCTION_IMPLEMENTATION.md)

---

**Last Updated:** Current Session  
**Version:** 1.0.0  
**Maintainer:** NNH-AI-Studio Team

