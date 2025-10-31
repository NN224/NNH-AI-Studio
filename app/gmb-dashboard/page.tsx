"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { MapPin, MessageSquare, Star, TrendingUp, AlertCircle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import { toast } from "sonner"

// Dashboard Components
import { StatCard } from "@/components/dashboard/stat-card"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { PerformanceChart } from "@/components/dashboard/performance-chart"
import { GMBDashboardSidebar } from "@/components/dashboard/gmb-sidebar"
import { GMBPostsSection } from "@/components/dashboard/gmb-posts-section"

// Tab Components
import { LocationsList } from "@/components/locations/locations-list"
import { ReviewsList } from "@/components/reviews/reviews-list"
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard"
import { GMBSettings } from "@/components/settings/gmb-settings"

interface DashboardStats {
  totalLocations: number
  totalReviews: number
  averageRating: string
  responseRate: number
}

interface User {
  id: string
  email?: string
}

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground text-center max-w-md">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Try Again
            </button>
          </div>
        )
      )
    }

    return this.props.children
  }
}

export default function GMBDashboard() {
  const supabase = createClient()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("dashboard")
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalLocations: 0,
    totalReviews: 0,
    averageRating: "0.0",
    responseRate: 0,
  })
  const [error, setError] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  // Check for mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Handle URL parameters for tab navigation and messages
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const tabParam = params.get('tab')
      const errorParam = params.get('error')
      const connectedParam = params.get('connected')
      
      if (tabParam && ['dashboard', 'locations', 'reviews', 'posts', 'analytics', 'settings'].includes(tabParam)) {
        setActiveTab(tabParam)
      }
      
      // Show error message if present
      if (errorParam) {
        toast.error(decodeURIComponent(errorParam))
        // Clean up URL
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('error')
        newUrl.searchParams.delete('tab')
        window.history.replaceState({}, '', newUrl.toString())
      }
      
      // Show success message if connected
      if (connectedParam === 'true') {
        toast.success('تم الاتصال بـ Google My Business بنجاح!')
        // Clean up URL
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('connected')
        if (tabParam) {
          // Keep tab if specified
        } else {
          newUrl.searchParams.delete('tab')
        }
        window.history.replaceState({}, '', newUrl.toString())
        // Refresh dashboard data
        window.location.reload()
      }
    }
  }, [])

  // Fetch user and dashboard stats
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Check authentication
        const {
          data: { user: authUser },
          error: authError
        } = await supabase.auth.getUser()
        
        if (authError || !authUser) {
          console.error("Authentication error:", authError)
          router.push("/auth/login")
          return
        }
        
        setUser(authUser)
        
        // Fetch dashboard stats with proper error handling
        // Only show data from active GMB accounts
        try {
          // First, get active GMB account IDs
          const { data: activeAccounts } = await supabase
            .from("gmb_accounts")
            .select("id")
            .eq("user_id", authUser.id)
            .eq("is_active", true)

          const activeAccountIds = activeAccounts?.map(acc => acc.id) || []

          // If no active accounts, show zeros
          if (activeAccountIds.length === 0) {
            setStats({
              totalLocations: 0,
              totalReviews: 0,
              averageRating: "0.0",
              responseRate: 0,
            })
            return
          }

          const [locationsRes, reviewsRes] = await Promise.allSettled([
            supabase
              .from("gmb_locations")
              .select("id")
              .eq("user_id", authUser.id)
              .in("gmb_account_id", activeAccountIds),
            supabase
              .from("gmb_reviews")
              .select("rating, reply_text, location_id")
              .eq("user_id", authUser.id),
          ])

          // Filter reviews by active locations
          let activeLocationIds: string[] = []
          if (locationsRes.status === 'fulfilled' && !locationsRes.value.error) {
            activeLocationIds = (locationsRes.value.data || []).map(loc => loc.id)
          }
          
          let locations: any[] = []
          let reviews: any[] = []
          
          if (locationsRes.status === 'fulfilled' && !locationsRes.value.error) {
            locations = locationsRes.value.data || []
          } else if (locationsRes.status === 'rejected') {
            console.error("Failed to fetch locations:", locationsRes.reason)
          }
          
          if (reviewsRes.status === 'fulfilled' && !reviewsRes.value.error) {
            // Filter reviews to only include those from active locations
            reviews = (reviewsRes.value.data || []).filter(r => 
              r.location_id && activeLocationIds.includes(r.location_id)
            )
          } else if (reviewsRes.status === 'rejected') {
            console.error("Failed to fetch reviews:", reviewsRes.reason)
          }
          
          // Calculate statistics safely
          const totalReviews = reviews.length
          const repliedReviews = reviews.filter(r => r.reply_text).length
          const avgRating = totalReviews > 0
            ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews).toFixed(1)
            : "0.0"
          const responseRate = totalReviews > 0
            ? Math.round((repliedReviews / totalReviews) * 100)
            : 0
          
          setStats({
            totalLocations: locations.length,
            totalReviews,
            averageRating: avgRating,
            responseRate,
          })
        } catch (error) {
          console.error("Error fetching dashboard stats:", error)
          // Don't set error state here, just log it
          // The dashboard can still function with default stats
        }
      } catch (error) {
        console.error("Unexpected error:", error)
        setError("An unexpected error occurred")
      } finally {
        setLoading(false)
      }
    }
    
    fetchDashboardData()
  }, [router, supabase])

  // Show loading state
  if (loading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        {/* Loading Sidebar */}
        <div className="w-64 bg-card/80 backdrop-blur-xl border-r border-primary/30">
          <LoadingSkeleton className="h-full" />
        </div>
        
        {/* Loading Main Content */}
        <div className="flex-1 p-8">
          <div className="space-y-6">
            <LoadingSkeleton className="h-12 w-64" />
            <div className="grid gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <LoadingSkeleton key={i} className="h-32" />
              ))}
            </div>
            <LoadingSkeleton className="h-96" />
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="text-center p-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Dashboard</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Sidebar */}
      <GMBDashboardSidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} />
      
      {/* Main Content */}
      <main className={`flex-1 ${isMobile ? 'ml-0' : 'ml-20 lg:ml-60'} transition-all duration-300`}>
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {/* Page Title */}
          <div className="mb-8 animate-in slide-in-from-top">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              <span className="text-primary">GMB</span> Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage your Google Business Profile locations and engagement
            </p>
          </div>
          
          {/* Tab Content */}
          <ErrorBoundary>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              {/* Hidden Tab List (controlled by sidebar) */}
              <TabsList className="hidden">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="locations">Locations</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
                <TabsTrigger value="posts">Posts</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              
              {/* Dashboard Tab */}
              <TabsContent value="dashboard" className="space-y-6 animate-in fade-in-50">
                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    title="Total Locations"
                    value={stats.totalLocations.toString()}
                    change="+2 this month"
                    changeType="positive"
                    index={0}
                    icon={MapPin}
                  />
                  <StatCard
                    title="Total Reviews"
                    value={stats.totalReviews.toString()}
                    change="+15 this week"
                    changeType="positive"
                    index={1}
                    icon={MessageSquare}
                  />
                  <StatCard
                    title="Average Rating"
                    value={stats.averageRating}
                    change="+0.2 from last month"
                    changeType="positive"
                    index={2}
                    icon={Star}
                  />
                  <StatCard
                    title="Response Rate"
                    value={`${stats.responseRate}%`}
                    change="+5% this month"
                    changeType="positive"
                    index={3}
                    icon={TrendingUp}
                  />
                </div>
                
                {/* Charts and Activity */}
                <div className="grid gap-6 md:grid-cols-2">
                  <ErrorBoundary
                    fallback={
                      <div className="p-8 text-center text-muted-foreground">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                        <p>Failed to load performance chart</p>
                      </div>
                    }
                  >
                    <PerformanceChart />
                  </ErrorBoundary>
                  <ErrorBoundary
                    fallback={
                      <div className="p-8 text-center text-muted-foreground">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                        <p>Failed to load activity feed</p>
                      </div>
                    }
                  >
                    <ActivityFeed />
                  </ErrorBoundary>
                </div>
              </TabsContent>
              
              {/* Locations Tab */}
              <TabsContent value="locations" className="space-y-6 animate-in fade-in-50">
                <ErrorBoundary
                  fallback={
                    <div className="p-8 text-center text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                      <p>Failed to load locations</p>
                    </div>
                  }
                >
                  <LocationsList />
                </ErrorBoundary>
              </TabsContent>
              
              {/* Reviews Tab */}
              <TabsContent value="reviews" className="space-y-6 animate-in fade-in-50">
                <ErrorBoundary
                  fallback={
                    <div className="p-8 text-center text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                      <p>Failed to load reviews</p>
                    </div>
                  }
                >
                  <ReviewsList />
                </ErrorBoundary>
              </TabsContent>
              
              {/* Posts Tab */}
              <TabsContent value="posts" className="space-y-6 animate-in fade-in-50">
                <ErrorBoundary
                  fallback={
                    <div className="p-8 text-center text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                      <p>Failed to load posts section</p>
                    </div>
                  }
                >
                  <GMBPostsSection />
                </ErrorBoundary>
              </TabsContent>
              
              {/* Analytics Tab */}
              <TabsContent value="analytics" className="space-y-6 animate-in fade-in-50">
                <ErrorBoundary
                  fallback={
                    <div className="p-8 text-center text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                      <p>Failed to load analytics</p>
                    </div>
                  }
                >
                  <AnalyticsDashboard />
                </ErrorBoundary>
              </TabsContent>
              
              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-6 animate-in fade-in-50">
                <ErrorBoundary
                  fallback={
                    <div className="p-8 text-center text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                      <p>Failed to load settings</p>
                    </div>
                  }
                >
                  <GMBSettings />
                </ErrorBoundary>
              </TabsContent>
            </Tabs>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  )
}