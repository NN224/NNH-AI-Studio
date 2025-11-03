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
import { WelcomeHero } from "@/components/dashboard/welcome-hero"
import { SmartChecklist } from "@/components/dashboard/smart-checklist"
import { AICopilotEnhanced } from "@/components/dashboard/ai-copilot-enhanced"
import { PerformanceSnapshot } from "@/components/dashboard/performance-snapshot"
import { AchievementBadges } from "@/components/dashboard/achievement-badges"
import { LastSyncInfo } from "@/components/dashboard/last-sync-info"

// Tab Components
import { LocationsList } from "@/components/locations/locations-list"
import { ReviewsList } from "@/components/reviews/reviews-list"
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard"
import { GMBSettings } from "@/components/settings/gmb-settings"
import { QuestionsList } from "@/components/questions/questions-list"
import { MediaGallery } from "@/components/media/media-gallery"

// Server Actions
import { getOnboardingTasks, getProfileStrength } from "@/server/actions/onboarding"
import { getWeeklyPerformance } from "@/server/actions/performance"
import { getUserAchievements } from "@/server/actions/achievements"

interface DashboardStats {
  totalLocations: number
  totalReviews: number
  newReviews: number // Reviews from last 30 days
  averageRating: string
  responseRate: number
  locationsChange?: number
  reviewsChange?: number
  ratingChange?: number
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
    newReviews: 0,
    averageRating: "0.0",
    responseRate: 0,
    locationsChange: undefined,
    reviewsChange: undefined,
    ratingChange: undefined,
  })
  const [error, setError] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [gmbConnected, setGmbConnected] = useState(false)
  const [gmbAccountId, setGmbAccountId] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [syncSchedule, setSyncSchedule] = useState<string>('manual')
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [syncing, setSyncing] = useState(false)
  
  const [onboardingTasks, setOnboardingTasks] = useState<any[]>([])
  const [profileStrength, setProfileStrength] = useState(0)
  const [tasksRemaining, setTasksRemaining] = useState(0)
  const [estimatedMinutes, setEstimatedMinutes] = useState(0)
  const [weeklyPerformance, setWeeklyPerformance] = useState<any[]>([])
  const [aiInsight, setAiInsight] = useState<string | null>(null)
  const [achievements, setAchievements] = useState<any[]>([])
  const [streak, setStreak] = useState(0)
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([])
  
  // Data used for AI recommendations
  const [currentReviews, setCurrentReviews] = useState<any[]>([])
  const [currentPosts, setCurrentPosts] = useState<any[]>([])
  const [currentLocations, setCurrentLocations] = useState<any[]>([])

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
      
      // Priority: URL parameter > localStorage > default "dashboard"
      let tabToSet = 'dashboard'
      
      // Check URL parameter first
      if (tabParam && ['dashboard', 'locations', 'reviews', 'media', 'questions', 'posts', 'analytics', 'settings'].includes(tabParam)) {
        tabToSet = tabParam
        // Save to localStorage
        localStorage.setItem('gmb-active-tab', tabToSet)
      } else {
        // Try to load from localStorage
        const savedTab = localStorage.getItem('gmb-active-tab')
        if (savedTab && ['dashboard', 'locations', 'reviews', 'media', 'questions', 'posts', 'analytics', 'settings'].includes(savedTab)) {
          tabToSet = savedTab
        }
      }
      
      setActiveTab(tabToSet)
      
      // Show error message if present
      if (errorParam) {
        toast.error(decodeURIComponent(errorParam))
        // Clean up URL - remove error but keep tab
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('error')
        // Keep tab in URL if it was specified, but remove it after showing
        if (!tabParam) {
          newUrl.searchParams.delete('tab')
        }
        window.history.replaceState({}, '', newUrl.toString())
      }
      
      // Show success message if connected
      if (connectedParam === 'true') {
        toast.success('Google My Business connected successfully!')
        // Clean up URL - remove connected param, but keep tab only if it was explicitly set
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('connected')
        // If tab was from URL (OAuth callback), remove it after showing success
        // This prevents it from persisting on reload
        if (tabParam === 'settings') {
          // Remove settings tab from URL after OAuth callback to prevent it from sticking
          newUrl.searchParams.delete('tab')
          // Set activeTab back to dashboard (or last saved tab)
          const savedTab = localStorage.getItem('gmb-active-tab')
          if (savedTab && savedTab !== 'settings' && ['dashboard', 'locations', 'reviews', 'media', 'questions', 'posts', 'analytics'].includes(savedTab)) {
            setActiveTab(savedTab)
          } else {
            setActiveTab('dashboard')
            localStorage.setItem('gmb-active-tab', 'dashboard')
          }
        }
        window.history.replaceState({}, '', newUrl.toString())
        // Refresh dashboard data
        router.refresh()
      }
      
      // Clean up tab from URL if it's still there (one-time cleanup)
      const remainingTab = new URLSearchParams(window.location.search).get('tab')
      if (remainingTab && remainingTab === 'settings' && !errorParam && !connectedParam) {
        // Remove settings tab from URL on initial load if no special params
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('tab')
        window.history.replaceState({}, '', newUrl.toString())
        // Use saved tab or default to dashboard
        const savedTab = localStorage.getItem('gmb-active-tab')
        if (savedTab && savedTab !== 'settings' && ['dashboard', 'locations', 'reviews', 'media', 'questions', 'posts', 'analytics'].includes(savedTab)) {
          setActiveTab(savedTab)
        } else {
          setActiveTab('dashboard')
          localStorage.setItem('gmb-active-tab', 'dashboard')
        }
      }
    }
  }, [])
  
  // Save activeTab to localStorage whenever it changes (user navigation)
  useEffect(() => {
    if (typeof window !== 'undefined' && activeTab) {
      localStorage.setItem('gmb-active-tab', activeTab)
    }
  }, [activeTab])

  // Fetch user and dashboard stats
  useEffect(() => {
    const fetchDashboardData = async () => {
      // Declare data variables at function scope so they're accessible across try-catch blocks
      let locations: any[] = []
      let allReviews: any[] = []
      let reviews: any[] = []
      let previousReviews: any[] = []
      let previousLocationIds: string[] = []
      let posts: any[] = []
      
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
              newReviews: 0,
              averageRating: "0.0",
              responseRate: 0,
              locationsChange: undefined,
              reviewsChange: undefined,
              ratingChange: undefined,
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

          // Get previous period data for comparison (last 30 days vs previous 30 days)
          const now = new Date()
          const thirtyDaysAgo = new Date(now)
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
          const sixtyDaysAgo = new Date(now)
          sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

          // Fetch all reviews once and filter by date in JavaScript to handle null review_date values
          // This reduces database queries and improves performance
          const [locationsRes, allReviewsRes, postsRes] = await Promise.allSettled([
            Promise.resolve({ data: activeLocationsData || [], error: null }),
            activeLocationIds.length > 0
              ? supabase
                  .from("gmb_reviews")
                  .select("rating, review_reply, location_id, review_date, created_at")
                  .eq("user_id", authUser.id)
                  .in("location_id", activeLocationIds)
              : Promise.resolve({ data: [], error: null }),
            supabase
              .from("gmb_posts")
              .select("id")
              .eq("user_id", authUser.id)
          ])
          
          if (locationsRes.status === 'fulfilled' && !locationsRes.value.error) {
            locations = locationsRes.value.data || []
            setCurrentLocations(locations)
          } else if (locationsRes.status === 'rejected') {
            console.error("Failed to fetch locations:", locationsRes.reason)
          }
          
          if (allReviewsRes.status === 'fulfilled' && !allReviewsRes.value.error) {
            // Filter reviews to only include those from active locations
            allReviews = (allReviewsRes.value.data || []).filter(r => 
              r.location_id && activeLocationIds.includes(r.location_id)
            )
            
            console.log(`[Dashboard] Found ${allReviews.length} total reviews from ${activeLocationIds.length} active locations`)
            
            // For main stats, use ALL reviews (not filtered by date)
            // This ensures Average Rating, Total Reviews, and Response Rate show all data
            reviews = allReviews
            setCurrentReviews(reviews)
            
            // Previous period: 30-60 days ago (for comparison only)
            previousReviews = allReviews.filter(r => {
              const reviewDate = r.review_date ? new Date(r.review_date) : new Date(r.created_at)
              return reviewDate >= sixtyDaysAgo && reviewDate < thirtyDaysAgo
            })
            
            // Calculate "New Reviews" (reviews from last 30 days)
            const newReviewsCount = allReviews.filter(r => {
              const reviewDate = r.review_date ? new Date(r.review_date) : new Date(r.created_at)
              return reviewDate >= thirtyDaysAgo && reviewDate <= now
            }).length
            
            console.log(`[Dashboard] Stats - Total: ${allReviews.length}, New (30d): ${newReviewsCount}`)
          } else if (allReviewsRes.status === 'rejected') {
            console.error("Failed to fetch reviews:", allReviewsRes.reason)
          }
          
          if (postsRes.status === 'fulfilled' && !postsRes.value.error) {
            posts = postsRes.value.data || []
            setCurrentPosts(posts)
          } else if (postsRes.status === 'rejected') {
            console.error("Failed to fetch posts:", postsRes.reason)
          }

          // Calculate previous location IDs from previous reviews (already fetched in allReviewsRes)
          if (allReviewsRes.status === 'fulfilled' && !allReviewsRes.value.error) {
            const previousPeriodData = previousReviews.filter((r: any) => r.location_id && activeLocationIds.includes(r.location_id))
            
            const previousLocationIdsSet = new Set(
              previousPeriodData.map((r: any) => r.location_id).filter((id: any): id is string => typeof id === 'string')
            )
            previousLocationIds = Array.from(previousLocationIdsSet)
          }
          
          // Calculate statistics safely with proper error handling
          const totalReviews = reviews.length
          const previousTotalReviews = previousReviews.length
          const repliedReviews = reviews.filter(r => r.review_reply && r.review_reply.trim().length > 0).length
          
          // Calculate "New Reviews" (reviews from last 30 days) - already calculated above but ensure it's available
          let newReviewsCount = 0
          if (allReviewsRes.status === 'fulfilled' && allReviewsRes.value.data) {
            newReviewsCount = allReviews.filter(r => {
              const reviewDate = r.review_date ? new Date(r.review_date) : new Date(r.created_at)
              return reviewDate >= thirtyDaysAgo && reviewDate <= now
            }).length
          }
          
          // Calculate average rating with division by zero protection
          let avgRating = "0.0"
          if (totalReviews > 0) {
            const ratingSum = reviews.reduce((sum, r) => sum + (r.rating || 0), 0)
            avgRating = (ratingSum / totalReviews).toFixed(1)
          }
          
          // Calculate previous average rating with division by zero protection
          let previousAvgRating = 0
          if (previousReviews.length > 0) {
            const previousRatingSum = previousReviews.reduce((sum, r) => sum + (r.rating || 0), 0)
            previousAvgRating = previousRatingSum / previousReviews.length
          }
          
          // Calculate response rate with division by zero protection
          const responseRate = totalReviews > 0
            ? Math.round((repliedReviews / totalReviews) * 100)
            : 0

          // Calculate previous locations count from unique locations in previous period
          const previousLocationsCount = previousLocationIds.length
          const currentLocationsCount = locations.length

          // Calculate change percentages only if we have previous data
          let locationsChangePercent: number | undefined
          if (previousLocationsCount > 0 && currentLocationsCount !== previousLocationsCount) {
            locationsChangePercent = Math.round(((currentLocationsCount - previousLocationsCount) / previousLocationsCount) * 100)
          }

          let reviewsChangePercent: number | undefined
          if (previousTotalReviews > 0 && totalReviews !== previousTotalReviews) {
            reviewsChangePercent = Math.round(((totalReviews - previousTotalReviews) / previousTotalReviews) * 100)
          }

          // Calculate rating change in percentage points (not percentage)
          let ratingChangePercent: number | undefined
          const currentRating = parseFloat(avgRating)
          if (previousAvgRating > 0 || currentRating > 0) {
            // Calculate change in rating points (e.g., 4.5 to 4.7 = +0.2 points)
            const ratingChange = currentRating - previousAvgRating
            // Convert to percentage change (0.2 points out of 5 = 4% change)
            if (previousAvgRating > 0) {
              ratingChangePercent = Math.round((ratingChange / previousAvgRating) * 100 * 10) / 10
            } else if (currentRating > 0 && previousAvgRating === 0) {
              // If we went from 0 to something, show positive change
              ratingChangePercent = 100
            }
          }

          setStats({
            totalLocations: locations.length,
            totalReviews,
            newReviews: newReviewsCount,
            averageRating: avgRating,
            responseRate,
            locationsChange: locationsChangePercent,
            reviewsChange: reviewsChangePercent,
            ratingChange: ratingChangePercent,
          })
        } catch (error) {
          console.error("Error fetching dashboard stats:", error)
          // Don't set error state here, just log it
          // The dashboard can still function with default stats
        }
        
        // Fetch onboarding data
        try {
          const [profileData, tasks, performanceData, achievementsData] = await Promise.all([
            getProfileStrength(),
            getOnboardingTasks(),
            getWeeklyPerformance(),
            getUserAchievements()
          ])
          
          setProfileStrength(profileData.strength)
          setTasksRemaining(profileData.totalTasks - profileData.tasksCompleted)
          setEstimatedMinutes(profileData.estimatedMinutes)
          setOnboardingTasks(tasks)
          
          setWeeklyPerformance(performanceData.data)
          setAiInsight(performanceData.aiInsight)
          
          setAchievements(achievementsData.achievements)
          setStreak(achievementsData.streak)
          
          // Generate AI recommendations based on freshly fetched data
          // Note: Use local variables (not state) because setState is async
          const recommendations: any[] = []
          
          const urgentReviews = reviews.filter((r: any) => {
            return (!r.review_reply || r.review_reply.trim() === '') && 
                   r.rating <= 2 && 
                   Date.now() - new Date(r.created_at).getTime() < 86400000
          })
          
          if (urgentReviews.length > 0) {
            recommendations.push({
              id: 'urgent-reviews',
              priority: 'high',
              type: 'review',
              message: `${urgentReviews.length} urgent low-rated review${urgentReviews.length > 1 ? 's' : ''} need${urgentReviews.length === 1 ? 's' : ''} your attention (< 24h old)`,
              actionLabel: 'Reply Now',
              actionUrl: '/gmb-dashboard?tab=reviews'
            })
          }
          
          const unansweredReviews = reviews.filter((r: any) => !r.review_reply || r.review_reply.trim() === '')
          if (unansweredReviews.length >= 5) {
            recommendations.push({
              id: 'draft-replies',
              priority: 'medium',
              type: 'review',
              message: `${unansweredReviews.length} unanswered reviews. Want AI to draft replies?`,
              actionLabel: 'Draft Replies',
              actionUrl: '/gmb-dashboard?tab=reviews'
            })
          }
          
          if (posts.length === 0 && locations.length > 0) {
            recommendations.push({
              id: 'first-post',
              priority: 'medium',
              type: 'post',
              message: 'Create your first post to boost visibility by 40%',
              actionLabel: 'AI Generate',
              actionUrl: '/gmb-dashboard?tab=posts'
            })
          }
          
          setAiRecommendations(recommendations)
        } catch (error) {
          console.error("Error fetching onboarding data:", error)
        }
      } catch (error) {
        console.error("Unexpected error:", error)
        setError("An unexpected error occurred")
      } finally {
        setLoading(false)
      }
    }
    
    fetchDashboardData()
  }, [router])

  // Handle GMB disconnect
  const handleDisconnectGMB = async () => {
    if (!confirm('Are you sure you want to disconnect Google My Business? Sync will stop but current data will not be deleted.')) {
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

      toast.success('Google My Business disconnected successfully')
      setGmbConnected(false)
      // Refresh dashboard data
      window.location.reload()
    } catch (error: any) {
      console.error('Error disconnecting GMB:', error)
      toast.error(error.message || 'Failed to disconnect')
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
        `Sync successful! Fetched ${data.counts?.locations || 0} locations, ${data.counts?.reviews || 0} reviews, ${data.counts?.questions || 0} questions`
      )
      
      // Update last sync time
      setLastSyncTime(new Date())
      
      // Dispatch custom event to refresh all components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gmb-sync-complete', {
          detail: { counts: data.counts }
        }))
      }
      
      // Refresh router cache - components will auto-refresh via event listener
      router.refresh()
    } catch (error: any) {
      console.error('Error syncing GMB:', error)
      toast.error(error.message || 'Failed to sync data')
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
      toast.error(error.message || 'Failed to connect')
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
                <TabsTrigger value="dashboard">Overview</TabsTrigger>
                <TabsTrigger value="locations">Locations</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
                <TabsTrigger value="media">Media</TabsTrigger>
                <TabsTrigger value="questions">Q&A</TabsTrigger>
                <TabsTrigger value="posts">Posts</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              
              {/* Dashboard Tab */}
              <TabsContent value="dashboard" className="space-y-6 animate-in fade-in-50">
                {/* Connection Status Alert */}
                {!gmbConnected && (
                  <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-1">Google My Business Not Connected</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Connect your Google My Business account to automatically sync locations, reviews, and performance insights. 
                        Data will update regularly to keep your dashboard current.
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
                
                {/* Welcome Hero */}
                <WelcomeHero
                  userName={user?.email?.split('@')[0]}
                  profileStrength={profileStrength}
                  tasksRemaining={tasksRemaining}
                  estimatedMinutes={estimatedMinutes}
                />
                
                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    title="Total Locations"
                    value={stats.totalLocations.toString()}
                    change={typeof stats.locationsChange === 'number'
                      ? `${stats.locationsChange > 0 ? '+' : ''}${stats.locationsChange}% vs last 30 days`
                      : undefined
                    }
                    changeType={typeof stats.locationsChange === 'number'
                      ? stats.locationsChange > 0
                        ? "positive"
                        : stats.locationsChange < 0
                        ? "negative"
                        : "neutral"
                      : "neutral"
                    }
                    index={0}
                    icon={MapPin}
                    showEmptyState={!gmbConnected}
                    emptyMessage={!gmbConnected ? "Connect GMB to sync locations" : undefined}
                  />
                  <StatCard
                    title="Average Rating"
                    value={stats.averageRating}
                    change={typeof stats.ratingChange === 'number'
                      ? `${stats.ratingChange > 0 ? '+' : ''}${stats.ratingChange}% vs last 30 days`
                      : undefined
                    }
                    changeType={typeof stats.ratingChange === 'number'
                      ? stats.ratingChange > 0
                        ? "positive"
                        : stats.ratingChange < 0
                        ? "negative"
                        : "neutral"
                      : "neutral"
                    }
                    index={1}
                    icon={Star}
                    showEmptyState={stats.totalReviews === 0}
                    emptyMessage={stats.totalReviews === 0 ? "No reviews yet" : undefined}
                  />
                  <StatCard
                    title="New Reviews"
                    value={stats.newReviews.toString()}
                    change={typeof stats.reviewsChange === 'number'
                      ? `${stats.reviewsChange > 0 ? '+' : ''}${stats.reviewsChange}% this month`
                      : stats.totalReviews > 0
                        ? `${stats.totalReviews} total reviews`
                        : undefined
                    }
                    changeType={typeof stats.reviewsChange === 'number'
                      ? stats.reviewsChange > 0
                        ? "positive"
                        : stats.reviewsChange < 0
                        ? "negative"
                        : "neutral"
                      : "neutral"
                    }
                    index={2}
                    icon={MessageSquare}
                    showEmptyState={stats.totalReviews === 0}
                    emptyMessage={stats.totalReviews === 0 ? "No reviews in last 30 days" : undefined}
                  />
                  <StatCard
                    title="Response Rate"
                    value={`${stats.responseRate}%`}
                    change={stats.responseRate > 0 ? `${stats.responseRate}% responded` : undefined}
                    changeType={stats.responseRate >= 80 ? "positive" : stats.responseRate >= 50 ? "neutral" : "negative"}
                    index={3}
                    icon={TrendingUp}
                    showEmptyState={stats.totalReviews === 0}
                    emptyMessage={stats.totalReviews === 0 ? "No reviews to respond to" : undefined}
                  />
                </div>
                
                {/* Last Sync Info */}
                <LastSyncInfo
                  lastSyncTime={lastSyncTime}
                  isSyncing={syncing}
                  onSync={handleSyncGMB}
                  syncSchedule={syncSchedule}
                />
                
                {/* Main Dashboard Grid */}
                <div className="grid gap-6 lg:grid-cols-3">
                  {/* Left Column - Checklist + Achievements */}
                  <div className="space-y-6">
                    <SmartChecklist
                      tasks={onboardingTasks}
                      onTaskAction={(taskId) => {
                        const task = onboardingTasks.find(t => t.id === taskId)
                        if (task?.actionUrl) {
                          router.push(task.actionUrl)
                        }
                      }}
                    />
                    
                    <AchievementBadges
                      achievements={achievements}
                      streak={streak}
                    />
                  </div>
                  
                  {/* Middle Column - AI Copilot */}
                  <div>
                    <AICopilotEnhanced
                      recommendations={aiRecommendations}
                      mainMessage={
                        aiRecommendations.length > 0
                          ? undefined
                          : "Great job! Everything looks good. I'll notify you when there's something that needs attention."
                      }
                      onMainAction={() => router.push('/gmb-dashboard?tab=reviews')}
                    />
                  </div>
                  
                  {/* Right Column - Performance Snapshot */}
                  <div>
                    <PerformanceSnapshot
                      data={weeklyPerformance}
                      aiInsight={aiInsight || undefined}
                    />
                  </div>
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

              {/* Media Tab */}
              <TabsContent value="media" className="space-y-6 animate-in fade-in-50">
                <ErrorBoundary
                  fallback={
                    <div className="p-8 text-center text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                      <p>Failed to load media</p>
                    </div>
                  }
                >
                  <MediaGallery />
                </ErrorBoundary>
              </TabsContent>
              
              {/* Questions & Answers Tab */}
              <TabsContent value="questions" className="space-y-6 animate-in fade-in-50">
                <ErrorBoundary
                  fallback={
                    <div className="p-8 text-center text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                      <p>Failed to load questions</p>
                    </div>
                  }
                >
                  <QuestionsList />
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