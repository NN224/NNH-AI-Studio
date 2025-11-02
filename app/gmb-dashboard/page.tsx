"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { MapPin, MessageSquare, Star, TrendingUp, AlertCircle, Unlink, Link2, AlertTriangle, RefreshCw, Clock, CheckCircle2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

// Dashboard Components
import { StatCard } from "@/components/dashboard/stat-card"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { PerformanceChart } from "@/components/dashboard/performance-chart"
import { GMBDashboardSidebar } from "@/components/dashboard/gmb-sidebar"
import { GMBPostsSection } from "@/components/dashboard/gmb-posts-section"
import { AIInsightsWidget } from "@/components/dashboard/ai-insights-widget"

// Tab Components
import { LocationsList } from "@/components/locations/locations-list"
import { ReviewsList } from "@/components/reviews/reviews-list"
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard"
import { GMBSettings } from "@/components/settings/gmb-settings"
import { AIAssistant } from "@/components/ai/ai-assistant"
import { BusinessInsights } from "@/components/insights/business-insights"
import { BusinessRecommendations } from "@/components/recommendations/business-recommendations"

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
  const [gmbConnected, setGmbConnected] = useState(false)
  const [gmbAccountId, setGmbAccountId] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [syncSchedule, setSyncSchedule] = useState<string>('manual')
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [syncing, setSyncing] = useState(false)

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
      
      if (tabParam && ['dashboard', 'locations', 'reviews', 'posts', 'ai-assistant', 'recommendations', 'analytics', 'settings'].includes(tabParam)) {
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
        
        // Check GMB connection status
        const { data: gmbAccounts } = await supabase
          .from("gmb_accounts")
          .select("id, is_active, settings, last_sync")
          .eq("user_id", authUser.id)
        
        const activeAccount = gmbAccounts?.find(acc => acc.is_active)
        const hasActiveAccount = !!activeAccount
        setGmbConnected(hasActiveAccount)
        if (activeAccount) {
          setGmbAccountId(activeAccount.id)
          
          // Load sync settings
          if (activeAccount.settings) {
            const schedule = activeAccount.settings.syncSchedule || 'manual'
            setSyncSchedule(schedule)
          }
          
          // Load last sync time
          if (activeAccount.last_sync) {
            setLastSyncTime(new Date(activeAccount.last_sync))
          }
        }
        
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

          // First get active location IDs
          const { data: activeLocationsData } = await supabase
            .from("gmb_locations")
            .select("id")
            .eq("user_id", authUser.id)
            .in("gmb_account_id", activeAccountIds)

          const activeLocationIds = activeLocationsData?.map(loc => loc.id) || []

          const [locationsRes, reviewsRes] = await Promise.allSettled([
            Promise.resolve({ data: activeLocationsData || [], error: null }),
            activeLocationIds.length > 0
              ? supabase
                  .from("gmb_reviews")
                  .select("rating, reply_text, location_id")
                  .eq("user_id", authUser.id)
                  .in("location_id", activeLocationIds)
              : Promise.resolve({ data: [], error: null }),
          ])
          
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

  // Handle GMB disconnect
  const handleDisconnectGMB = async () => {
    if (!confirm('هل أنت متأكد أنك تريد قطع الاتصال بـ Google My Business؟ ستتوقف المزامنة ولكن لن يتم حذف البيانات الحالية.')) {
      return
    }

    setDisconnecting(true)
    try {
      const response = await fetch('/api/gmb/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disconnect')
      }

      toast.success('تم قطع الاتصال بـ Google My Business بنجاح')
      setGmbConnected(false)
      // Refresh dashboard data
      window.location.reload()
    } catch (error: any) {
      console.error('Error disconnecting GMB:', error)
      toast.error(error.message || 'حدث خطأ أثناء قطع الاتصال')
    } finally {
      setDisconnecting(false)
    }
  }

  // Handle GMB sync
  const handleSyncGMB = async () => {
    if (!gmbAccountId) {
      toast.error('No GMB account found to sync')
      return
    }

    setSyncing(true)
    try {
      const response = await fetch('/api/gmb/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          accountId: gmbAccountId, 
          syncType: 'full' 
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        
        if (data.error === 'invalid_grant') {
          toast.error('Google authorization expired. Please reconnect your account.')
          return
        }
        
        throw new Error(data.error || 'Failed to sync data')
      }

      const data = await response.json()
      
      toast.success(
        `تم المزامنة بنجاح! تم جلب ${data.counts?.locations || 0} موقع، ${data.counts?.reviews || 0} مراجعة`
      )
      
      // Update last sync time
      setLastSyncTime(new Date())
      
      // Refresh dashboard data without full page reload
      router.refresh()
    } catch (error: any) {
      console.error('Error syncing GMB:', error)
      toast.error(error.message || 'حدث خطأ أثناء المزامنة')
    } finally {
      setSyncing(false)
    }
  }

  // Handle GMB connect
  const handleConnectGMB = async () => {
    try {
      const response = await fetch('/api/gmb/create-auth-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create auth URL')
      }

      // Redirect to Google OAuth
      window.location.href = data.authUrl || data.url
    } catch (error: any) {
      console.error('Error connecting GMB:', error)
      toast.error(error.message || 'حدث خطأ أثناء الاتصال')
    }
  }

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
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                  <span className="text-primary">GMB</span> Dashboard
                </h1>
                <p className="text-muted-foreground">
                  Manage your Google Business Profile locations and engagement
                </p>
              </div>
              
              {/* Connection Status, Sync & Disconnect Buttons */}
              {gmbConnected ? (
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-medium text-green-500">Connected</span>
                  </div>
                  
                  {/* Sync Status Indicator */}
                  {syncSchedule !== 'manual' && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-primary">Auto-Sync: {syncSchedule}</span>
                        {lastSyncTime && (
                          <span className="text-xs text-muted-foreground">
                            Last: {lastSyncTime.toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-primary/10 hover:bg-primary/20 text-primary border-primary/30"
                    onClick={handleSyncGMB}
                    disabled={syncing}
                  >
                    {syncing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Sync Data
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/30"
                    onClick={handleDisconnectGMB}
                    disabled={disconnecting}
                  >
                    {disconnecting ? (
                      <>
                        <AlertCircle className="h-4 w-4 mr-2 animate-spin" />
                        Disconnecting...
                      </>
                    ) : (
                      <>
                        <Unlink className="h-4 w-4 mr-2" />
                        Disconnect
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white"
                  onClick={handleConnectGMB}
                >
                  <Link2 className="h-4 w-4 mr-2" />
                  Connect GMB
                </Button>
              )}
            </div>
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
                <TabsTrigger value="ai-assistant">AI Assistant</TabsTrigger>
                <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                <TabsTrigger value="analytics">Analytics & Insights</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              
              {/* Dashboard Tab */}
              <TabsContent value="dashboard" className="space-y-6 animate-in fade-in-50">
                {/* Connection Status Alert */}
                {!gmbConnected && (
                  <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-1">Google My Business غير متصل</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        قم بالاتصال بحساب Google My Business الخاص بك لمزامنة المواقع والمراجعات تلقائياً.
                      </p>
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white"
                        onClick={handleConnectGMB}
                      >
                        <Link2 className="h-4 w-4 mr-2" />
                        Connect Google My Business
                      </Button>
                    </div>
                  </div>
                )}
                
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
                
                {/* AI Insights Widget */}
                <ErrorBoundary
                  fallback={
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      Failed to load AI insights
                    </div>
                  }
                >
                  <AIInsightsWidget />
                </ErrorBoundary>
                
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
              
              {/* AI Assistant Tab */}
              <TabsContent value="ai-assistant" className="space-y-6 animate-in fade-in-50">
                <ErrorBoundary
                  fallback={
                    <div className="p-8 text-center text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                      <p>Failed to load AI Assistant</p>
                    </div>
                  }
                >
                  <AIAssistant />
                </ErrorBoundary>
              </TabsContent>
              
              {/* Recommendations Tab */}
              <TabsContent value="recommendations" className="space-y-6 animate-in fade-in-50">
                <ErrorBoundary
                  fallback={
                    <div className="p-8 text-center text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                      <p>Failed to load recommendations</p>
                    </div>
                  }
                >
                  <BusinessRecommendations />
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