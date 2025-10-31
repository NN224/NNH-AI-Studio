"use client"

import { StatCard } from "@/components/dashboard/stat-card"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { PerformanceChart } from "@/components/dashboard/performance-chart"
import { LocationsList } from "@/components/locations/locations-list"
import { ReviewsList } from "@/components/reviews/reviews-list"
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard"
import { GMBSettings } from "@/components/settings/gmb-settings"
import { MapPin, MessageSquare, Star, TrendingUp, AlertCircle, Users, Home, LogOut, BarChart3, Settings, Menu, Sparkles } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import Link from "next/link"
import Image from "next/image"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface DashboardStats {
  totalLocations: number
  totalReviews: number
  averageRating: string
  responseRate: number
}

const navItems = [
  { name: "Dashboard", id: "dashboard", icon: BarChart3 },
  { name: "Locations", id: "locations", icon: MapPin },
  { name: "Reviews", id: "reviews", icon: MessageSquare },
  { name: "Posts", id: "posts", icon: Sparkles },
  { name: "Analytics", id: "analytics", icon: TrendingUp },
  { name: "Settings", id: "settings", icon: Settings },
]

export default function GMBDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("dashboard")
  
  const supabase = createClient()
  const router = useRouter()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const getInitials = (email?: string) => {
    if (!email) return "U"
    return email.charAt(0).toUpperCase()
  }

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true)
        setError(null)

        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()

        if (!authUser) {
          router.push("/auth/login")
          return
        }

        setUser(authUser)

        const { data: locations, error: locationsError } = await supabase
          .from("gmb_locations")
          .select("*")
          .eq("user_id", authUser.id)

        const { data: reviews, error: reviewsError } = await supabase
          .from("gmb_reviews")
          .select("*")
          .eq("user_id", authUser.id)

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

  const renderDashboardContent = () => {
    if (error) {
      return (
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
      )
    }

    return (
      <>
        {/* Stats Grid */}
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <LoadingSkeleton type="stat" count={4} />
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
      </>
    )
  }

  // Mobile Navigation Menu
  const MobileNav = () => (
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden text-muted-foreground hover:text-foreground">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 bg-card border-primary/30">
        <SheetHeader className="border-b border-primary/30 pb-4 mb-4">
          <SheetTitle className="flex items-center gap-3">
            <Image src="/nnh-logo.png" alt="NNH Logo" width={32} height={32} />
            <span className="text-lg font-bold gradient-text">GMB Dashboard</span>
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col space-y-2">
          <Link href="/home" onClick={() => setMobileMenuOpen(false)}>
            <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-primary/10">
              <Home className="h-5 w-5" />
              Home
            </Button>
          </Link>
          {navItems.map((item) => (
            <Button
              key={item.name}
              variant="ghost"
              onClick={() => {
                setActiveTab(item.id)
                setMobileMenuOpen(false)
              }}
              className={cn(
                "w-full justify-start gap-3",
                activeTab === item.id ? "bg-primary/20 text-primary" : "hover:bg-primary/10"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Button>
          ))}
          <Link href="/youtube-dashboard" onClick={() => setMobileMenuOpen(false)}>
            <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-primary/10">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              YouTube Dashboard
            </Button>
          </Link>
          <div className="pt-4 mt-4 border-t border-primary/30">
            <Button
              onClick={handleSignOut}
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </Button>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-primary/30 bg-card/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Left side - Logo and Title */}
            <div className="flex items-center gap-4">
              <MobileNav />
              <Link href="/home" className="flex items-center gap-3">
                <Image 
                  src="/nnh-logo.png" 
                  alt="NNH Logo" 
                  width={40} 
                  height={40}
                  className="object-contain"
                />
                <div className="hidden sm:block">
                  <h1 className="text-lg font-bold gradient-text">NNH - AI Studio</h1>
                  <p className="text-xs text-muted-foreground">Google My Business Dashboard</p>
                </div>
              </Link>
            </div>

            {/* Center - Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-2">
              {navItems.map((item) => (
                <Button
                  key={item.name}
                  variant="ghost"
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "gap-2",
                    activeTab === item.id
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-primary/10"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Button>
              ))}
            </nav>

            {/* Right side - User Menu */}
            <div className="flex items-center gap-3">
              <Link href="/home" className="hidden sm:block">
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                  <Home className="h-4 w-4" />
                  Home
                </Button>
              </Link>
              <Link href="/youtube-dashboard" className="hidden sm:block">
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  YouTube
                </Button>
              </Link>
              <div className="hidden sm:flex items-center gap-2">
                <Avatar className="h-8 w-8 border-2 border-primary/30">
                  <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                    {getInitials(user?.email)}
                  </AvatarFallback>
                </Avatar>
                <Button
                  onClick={handleSignOut}
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden md:inline">Sign Out</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 py-6">
        {/* Render content based on active tab */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Page Header */}
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground mt-1">Welcome back! Here's your GMB overview.</p>
            </div>
            {/* Dashboard Content */}
            {renderDashboardContent()}
          </div>
        )}

        {activeTab === "locations" && <LocationsList />}
        
        {activeTab === "reviews" && <ReviewsList />}
        
        {activeTab === "posts" && (
          <Card className="bg-card border-primary/30 glass">
            <CardContent className="p-12">
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-foreground">GMB Posts</h3>
                  <p className="text-muted-foreground max-w-md">
                    Create and publish posts to your Google Business Profile locations with AI assistance.
                  </p>
                </div>
                <Button asChild size="lg" className="mt-4 gradient-orange">
                  <Link href="/gmb-posts">
                    <Sparkles className="mr-2 h-5 w-5" />
                    Go to Posts Page
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {activeTab === "analytics" && <AnalyticsDashboard />}
        
        {activeTab === "settings" && <GMBSettings />}
      </main>
    </div>
  )
}