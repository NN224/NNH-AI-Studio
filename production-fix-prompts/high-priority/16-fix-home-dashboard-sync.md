# 🔧 Fix Home vs Dashboard Data Synchronization

> ⚠️ **قبل البدء:** اقرأ `AI_AGENT_START_HERE.md` أولاً! اقرأ الملف المستهدف كاملاً قبل أي تعديل.

## 📋 المشكلة / Problem

**الملفات:**

- `/app/[locale]/home/page.tsx` - Server Component
- `/app/[locale]/(dashboard)/dashboard/page.tsx` - Client Component

**الخطورة:** 🟡 **HIGH PRIORITY** - Data inconsistency between pages

### Architecture Mismatch:

#### **Home Page (`/home`):**

```typescript
// ✅ Server Component
export default async function HomePage() {
  const supabase = await createClient();

  // Direct database queries
  const { data: cachedStats } = await supabase
    .from("user_home_stats")
    .select("*")
    .maybeSingle();

  const { data: gmbAccounts } = await supabase
    .from("gmb_accounts")
    .select("*");

  // Pre-rendered on server
  return <HomePageWrapper data={...} />;
}
```

**Características:**

- Server-side rendering (SSR)
- Uses materialized view `user_home_stats`
- 4-7 database queries on page load
- Static data until page refresh
- No real-time updates

#### **Dashboard Page (`/dashboard`):**

```typescript
// ❌ Client Component
"use client";
export default function DashboardPage() {
  const { data, isLoading } = useAICommandCenterData();

  // Client-side fetching
  // Real-time updates
  // Interactive features
}
```

**Características:**

- Client-side rendering (CSR)
- Uses React Query hooks
- Real-time data fetching
- Auto-refresh capabilities
- Dynamic updates

---

## 🐛 **المشاكل الحالية / Current Issues**

### Issue 1: Stale Data on Home Page

```
User Flow:
1. User views /home → sees 10 reviews (cached from materialized view)
2. User navigates to /dashboard
3. GMB sync runs → fetches 5 new reviews
4. User returns to /home → STILL sees only 10 reviews! (stale cache)
```

**Root Cause:**

- Home page uses materialized view `user_home_stats`
- Materialized view is NOT auto-refreshed
- Dashboard uses live queries
- Data diverges between pages

### Issue 2: Different Data Sources

**Home:**

```sql
-- Uses materialized view (refreshed manually)
SELECT * FROM user_home_stats WHERE user_id = ?
```

**Dashboard:**

```sql
-- Uses live tables (always current)
SELECT * FROM gmb_reviews WHERE user_id = ?
SELECT * FROM gmb_questions WHERE user_id = ?
```

**Result:** Numbers don't match!

### Issue 3: No Cache Invalidation

When dashboard performs actions (reply to review, sync data), home page cache is NOT invalidated.

---

## ✅ الحل / Solution

### Strategy: Unified Data Layer + Cache Invalidation

#### Solution 1: Auto-Refresh Materialized View

**File:** `supabase/migrations/[timestamp]_auto_refresh_user_home_stats.sql`

```sql
-- Create function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_user_home_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Refresh materialized view for affected user
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_home_stats;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on gmb_reviews changes
CREATE TRIGGER refresh_home_stats_on_review_change
AFTER INSERT OR UPDATE OR DELETE ON gmb_reviews
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_user_home_stats();

-- Trigger on gmb_questions changes
CREATE TRIGGER refresh_home_stats_on_question_change
AFTER INSERT OR UPDATE OR DELETE ON gmb_questions
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_user_home_stats();

-- Trigger on gmb_posts changes
CREATE TRIGGER refresh_home_stats_on_post_change
AFTER INSERT OR UPDATE OR DELETE ON gmb_posts
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_user_home_stats();

-- Index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_home_stats_user_id
ON user_home_stats(user_id);
```

**Benefits:**

- ✅ Materialized view stays current
- ✅ No stale data
- ✅ Automatic updates on data changes

**Drawbacks:**

- ⚠️ Slower writes (trigger overhead)
- ⚠️ Full table refresh on every change

---

#### Solution 2: Revalidate Home Page After Actions

**File:** `server/actions/reviews-management.ts`

```typescript
import { revalidatePath } from "next/cache";

export async function replyToReview(reviewId: string, replyText: string) {
  // ... existing logic

  // ✅ Invalidate home page cache
  revalidatePath("/[locale]/home", "page");

  // ✅ Also invalidate dashboard
  revalidatePath("/[locale]/(dashboard)/dashboard", "page");

  return { success: true };
}
```

**File:** `server/actions/gmb-sync.ts`

```typescript
import { revalidatePath } from "next/cache";

export async function syncGMBData(accountId: string) {
  // ... sync logic

  // ✅ Invalidate both pages after sync
  revalidatePath("/[locale]/home", "page");
  revalidatePath("/[locale]/(dashboard)", "layout");

  return { success: true };
}
```

**Benefits:**

- ✅ Simple implementation
- ✅ Explicit cache control
- ✅ Works with Next.js caching

---

#### Solution 3: Use Same Data Source

**Convert Home to use React Query like Dashboard:**

**File:** `app/[locale]/home/page.tsx`

```typescript
// BEFORE: Server Component with direct queries
export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase.from("user_home_stats").select("*");
  return <HomePageWrapper data={data} />;
}

// AFTER: Client Component with React Query
"use client";
export default function HomePage() {
  const { data, isLoading } = useUserHomeStats();

  if (isLoading) return <LoadingSkeleton />;
  return <HomePageWrapper data={data} />;
}
```

**New Hook:** `hooks/use-user-home-stats.ts`

```typescript
"use client";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export function useUserHomeStats() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["user-home-stats"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Use LIVE queries instead of materialized view
      const [reviews, questions, posts, locations] = await Promise.all([
        supabase
          .from("gmb_reviews")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("gmb_questions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("gmb_posts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase.from("gmb_locations").select("*").eq("user_id", user.id),
      ]);

      return {
        reviewsCount: reviews.count || 0,
        questionsCount: questions.count || 0,
        postsCount: posts.count || 0,
        locationsCount: locations.data?.length || 0,
      };
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

**Benefits:**

- ✅ Same data source as dashboard
- ✅ React Query cache shared between pages
- ✅ Automatic invalidation
- ✅ Real-time consistency

**Drawbacks:**

- ⚠️ Slower initial load (client-side fetching)
- ⚠️ SEO impact (client-rendered content)

---

#### Solution 4: Hybrid Approach (RECOMMENDED) ⭐

**Keep Home as Server Component + Add client-side revalidation:**

**File:** `app/[locale]/home/page.tsx`

```typescript
// Server Component for initial load (fast SSR)
export default async function HomePage() {
  const supabase = await createClient();
  const { data: initialData } = await supabase
    .from("user_home_stats")
    .select("*")
    .maybeSingle();

  // Pass initial data to client wrapper
  return <HomePageClientWrapper initialData={initialData} />;
}
```

**File:** `components/home/home-page-client-wrapper.tsx`

```typescript
"use client";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function HomePageClientWrapper({ initialData }) {
  const queryClient = useQueryClient();

  // Listen to dashboard updates
  useEffect(() => {
    const channel = supabase
      .channel("home-page-sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "gmb_reviews",
        },
        () => {
          // Invalidate home stats when reviews change
          queryClient.invalidateQueries({ queryKey: ["user-home-stats"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return <HomePageWrapper data={initialData} />;
}
```

**Benefits:**

- ✅ Fast initial load (SSR)
- ✅ Real-time updates (Supabase Realtime)
- ✅ Best of both worlds
- ✅ SEO friendly

---

## 🧪 اختبار / Testing

### Test 1: Data Consistency

```typescript
describe('Home vs Dashboard Data Sync', () => {
  it('should show same review count on both pages', async () => {
    // Load home page
    const homePage = await render(<HomePage />);
    const homeReviewCount = homePage.getByTestId('review-count').textContent;

    // Navigate to dashboard
    const dashboardPage = await render(<DashboardPage />);
    const dashboardReviewCount = dashboardPage.getByTestId('review-count').textContent;

    // Counts should match
    expect(homeReviewCount).toBe(dashboardReviewCount);
  });

  it('should update home page after dashboard sync', async () => {
    const { getByTestId } = render(<HomePage />);
    const initialCount = getByTestId('review-count').textContent;

    // Trigger sync from dashboard
    await syncGMBData('account-id');

    // Reload home page
    await revalidate();

    const updatedCount = getByTestId('review-count').textContent;
    expect(updatedCount).not.toBe(initialCount);
  });
});
```

---

## ✅ معايير القبول / Acceptance Criteria

- [ ] Home and Dashboard show consistent data
- [ ] Home page updates after dashboard actions (sync, reply, post)
- [ ] No stale data on page navigation
- [ ] Materialized view auto-refreshes OR is replaced with live queries
- [ ] revalidatePath() calls added to all data-mutating actions
- [ ] Tests verify data consistency between pages
- [ ] No performance regression (home page loads in < 2 seconds)

---

## 📊 التأثير / Impact

**الخطورة:** 🟡 **HIGH PRIORITY**
**الأولوية:** **P1** - Fix after critical security issues
**الوقت المقدر:** 4-6 hours

**User Impact:**

- **Current:** Confusing - numbers don't match between pages
- **After Fix:** Consistent data everywhere, real-time updates
