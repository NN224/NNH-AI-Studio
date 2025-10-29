import { StatCard } from "@/components/dashboard/stat-card"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { PerformanceChart } from "@/components/dashboard/performance-chart"
import { MapPin, MessageSquare, Star, TrendingUp, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="bg-card border-red-500/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-500">
              <AlertCircle className="w-6 h-6" />
              <p>Authentication required. Please log in.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Fetch real stats from database with error handling
  const { data: locations, error: locationsError } = await supabase
    .from("gmb_locations")
    .select("*")
    .eq("user_id", user.id)

  const { data: reviews, error: reviewsError } = await supabase
    .from("gmb_reviews")
    .select("*")
    .eq("user_id", user.id)

  // Handle database errors
  if (locationsError || reviewsError) {
    console.error("Dashboard data fetch error:", { locationsError, reviewsError })
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back! Here&apos;s your GMB overview.</p>
        </div>
        <Card className="bg-card border-red-500/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-500">
              <AlertCircle className="w-6 h-6" />
              <div>
                <p className="font-semibold">Failed to load dashboard data</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {locationsError?.message || reviewsError?.message || "Please try refreshing the page"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalLocations = locations?.length || 0
  const totalReviews = reviews?.length || 0
  const averageRating =
    reviews && reviews.length > 0 
      ? (reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length).toFixed(1) 
      : "0.0"

  const respondedReviews = reviews?.filter((r) => r.status === "responded").length || 0
  const responseRate = totalReviews > 0 ? Math.round((respondedReviews / totalReviews) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back! Here&apos;s your GMB overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Locations"
          value={totalLocations}
          change="+2 this month"
          changeType="positive"
          icon={MapPin}
          index={0}
        />
        <StatCard
          title="Total Reviews"
          value={totalReviews}
          change="+12 this week"
          changeType="positive"
          icon={MessageSquare}
          index={1}
        />
        <StatCard
          title="Average Rating"
          value={averageRating}
          change="+0.2 from last month"
          changeType="positive"
          icon={Star}
          index={2}
        />
        <StatCard
          title="Response Rate"
          value={`${responseRate}%`}
          change="+5% this month"
          changeType="positive"
          icon={TrendingUp}
          index={3}
        />
      </div>

      {/* Charts and Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PerformanceChart />
        <ActivityFeed />
      </div>
    </div>
  )
}
