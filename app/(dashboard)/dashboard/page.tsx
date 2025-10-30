"use client"

import { StatCard } from "@/components/dashboard/stat-card"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { PerformanceChart } from "@/components/dashboard/performance-chart"
import { MapPin, MessageSquare, Star, TrendingUp, AlertCircle, Users } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

interface DashboardStats {
  totalLocations: number
  totalReviews: number
  averageRating: string
  responseRate: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true)
        setError(null)

        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setError("Authentication required. Please log in.")
          return
        }

        const { data: locations, error: locationsError } = await supabase
          .from("gmb_locations")
          .select("*")
          .eq("user_id", user.id)

        const { data: reviews, error: reviewsError } = await supabase
          .from("gmb_reviews")
          .select("*")
          .eq("user_id", user.id)

        if (locationsError || reviewsError) {
          throw new Error(locationsError?.message || reviewsError?.message || "Failed to fetch data")
        }

        const totalLocations = locations?.length || 0
        const totalReviews = reviews?.length || 0
        const averageRating =
          reviews && reviews.length > 0
            ? (reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length).toFixed(1)
            : "0.0"

        const respondedReviews = reviews?.filter((r) => r.status === "responded").length || 0
        const responseRate = totalReviews > 0 ? Math.round((respondedReviews / totalReviews) * 100) : 0

        setStats({
          totalLocations,
          totalReviews,
          averageRating,
          responseRate,
        })
      } catch (err) {
        console.error("Dashboard data fetch error:", err)
        setError(err instanceof Error ? err.message : "Failed to load dashboard data")
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (error) {
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
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back! Here&apos;s your GMB overview.</p>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-card border-primary/30">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Locations"
            value={stats?.totalLocations || 0}
            change="+2 this month"
            changeType="positive"
            icon={MapPin}
            index={0}
          />
          <StatCard
            title="Total Reviews"
            value={stats?.totalReviews || 0}
            change="+12 this week"
            changeType="positive"
            icon={MessageSquare}
            index={1}
          />
          <StatCard
            title="Average Rating"
            value={stats?.averageRating || "0.0"}
            change="+0.2 from last month"
            changeType="positive"
            icon={Star}
            index={2}
          />
          <StatCard
            title="Response Rate"
            value={`${stats?.responseRate || 0}%`}
            change="+5% this month"
            changeType="positive"
            icon={TrendingUp}
            index={3}
          />
        </div>
      )}

      {/* Empty State - No GMB Account Connected */}
      {!loading && stats?.totalLocations === 0 && (
        <Card className="bg-card border-primary/30">
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-foreground">No Google My Business Account Connected</h3>
                <p className="text-muted-foreground max-w-md">
                  Connect your Google My Business account to start managing your locations, reviews, and content.
                </p>
              </div>
              <Button size="lg" className="mt-4" asChild>
                <Link href="/accounts">
                  <Users className="mr-2 h-5 w-5" />
                  Connect Account
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts and Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PerformanceChart />
        <ActivityFeed />
      </div>
    </div>
  )
}
