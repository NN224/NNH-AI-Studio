import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { StatsOverview } from '@/components/dashboard/stats-overview'
import { ReviewsWidget } from '@/components/dashboard/reviews-widget'
import { LocationsWidget } from '@/components/dashboard/locations-widget'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton'
import { DashboardClientWrapper, DashboardHeader } from '@/components/dashboard/dashboard-client-wrapper'
import { ErrorBoundaryWrapper } from '@/components/dashboard/dashboard-error-boundary-wrapper'
import { DashboardCharts, DashboardChartsSkeleton } from '@/components/dashboard/charts'
import type { GmbAccount, GMBLocation, GMBReview, ActivityLog } from '@/lib/types/database'

interface DashboardStats {
  user_id: string
  total_locations: number
  avg_rating: number
  total_reviews: number
  response_rate: number
  pending_reviews: number
  recent_reviews: number
  pending_questions: number
  recent_questions: number
  calculated_at: string
}

interface LocationWithRating extends GMBLocation {
  rating: number
  review_count: number
}

interface ReviewWithLocation extends GMBReview {
  location_name: string
}

async function getDashboardData(userId: string) {
  const supabase = await createClient()

  // Fetch all data in parallel for optimal performance
  const [
    { data: accounts, error: accountsError },
    { data: locations, error: locationsError },
    { data: reviews, error: reviewsError },
    { data: activities, error: activitiesError },
    { data: stats, error: statsError },
  ] = await Promise.all([
    // Get active GMB accounts
    supabase
      .from('gmb_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),

    // Get locations with ratings
    supabase
      .from('gmb_locations')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(5),

    // Get recent reviews with location names
    supabase
      .from('gmb_reviews')
      .select(`
        *,
        gmb_locations!inner(location_name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),

    // Get recent activity logs
    supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5),

    // Get dashboard stats
    supabase
      .from('v_dashboard_stats')
      .select('*')
      .eq('user_id', userId)
      .single(),
  ])

  // Handle errors gracefully
  if (accountsError) console.error('Error fetching accounts:', accountsError)
  if (locationsError) console.error('Error fetching locations:', locationsError)
  if (reviewsError) console.error('Error fetching reviews:', reviewsError)
  if (activitiesError) console.error('Error fetching activities:', activitiesError)
  if (statsError) console.error('Error fetching stats:', statsError)

  // Transform reviews data to include location_name
  const reviewsWithLocation: ReviewWithLocation[] = reviews?.map((review: any) => ({
    ...review,
    location_name: review.gmb_locations?.location_name || 'Unknown Location',
  })) || []

  return {
    accounts: (accounts || []) as GmbAccount[],
    locations: (locations || []) as LocationWithRating[],
    reviews: reviewsWithLocation,
    activities: (activities || []) as ActivityLog[],
    stats: stats as DashboardStats | null,
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/auth/login')
  }

  // Fetch dashboard data
  const dashboardData = await getDashboardData(user.id)

  return (
    <DashboardClientWrapper initialData={dashboardData} userId={user.id}>
      {(data, actions) => (
        <div className="container mx-auto p-6 space-y-6" id="dashboard-content">
          {/* Page Header with Actions */}
          <DashboardHeader
            onRefresh={actions.refresh}
            onExport={actions.exportToPDF}
            isRefreshing={actions.isRefreshing}
            isExporting={actions.isExporting}
          />

          {/* Stats Overview */}
          <ErrorBoundaryWrapper>
            <Suspense fallback={<DashboardSkeleton section="stats" />}>
              <StatsOverview
                stats={data.stats}
                accountsCount={data.accounts.length}
              />
            </Suspense>
          </ErrorBoundaryWrapper>

          {/* Quick Actions */}
          <ErrorBoundaryWrapper>
            <Suspense fallback={<DashboardSkeleton section="actions" />}>
              <QuickActions />
            </Suspense>
          </ErrorBoundaryWrapper>

          {/* Main Content Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Reviews Widget */}
            <ErrorBoundaryWrapper>
              <Suspense fallback={<DashboardSkeleton section="widget" count={5} />}>
                <ReviewsWidget reviews={data.reviews.slice(0, 5)} />
              </Suspense>
            </ErrorBoundaryWrapper>

            {/* Locations Widget */}
            <ErrorBoundaryWrapper>
              <Suspense fallback={<DashboardSkeleton section="widget" count={5} />}>
                <LocationsWidget locations={data.locations} />
              </Suspense>
            </ErrorBoundaryWrapper>

            {/* Recent Activity */}
            <ErrorBoundaryWrapper>
              <Suspense fallback={<DashboardSkeleton section="widget" count={5} />}>
                <RecentActivity activities={data.activities} />
              </Suspense>
            </ErrorBoundaryWrapper>
          </div>

          {/* Analytics Charts Section */}
          <ErrorBoundaryWrapper>
            <Suspense fallback={<DashboardChartsSkeleton />}>
              <DashboardCharts 
                reviews={data.reviews} 
                activities={data.activities}
              />
            </Suspense>
          </ErrorBoundaryWrapper>
        </div>
      )}
    </DashboardClientWrapper>
  )
}

