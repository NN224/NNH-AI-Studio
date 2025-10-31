"use client"

import { StatCard } from "@/components/dashboard/stat-card"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { PerformanceChart } from "@/components/dashboard/performance-chart"
import { LocationsList } from "@/components/locations/locations-list"
import { ReviewsList } from "@/components/reviews/reviews-list"
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard"
import { GMBSettings } from "@/components/settings/gmb-settings"
import { MapPin, MessageSquare, Star, TrendingUp, AlertCircle, Users, Home, LogOut, BarChart3, Settings, Menu, Sparkles, Bell, Check, CheckCheck, Trash2, Info, CheckCircle, AlertTriangle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import Link from "next/link"
import Image from "next/image"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
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
  
  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationsLoading, setNotificationsLoading] = useState(true)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  
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

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications?limit=10')
      const data = await res.json()
      if (res.ok) {
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (e) {
      console.error('Failed to fetch notifications:', e)
    } finally {
      setNotificationsLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchNotifications()
      const interval = setInterval(fetchNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  const markNotificationAsRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id })
      })
      fetchNotifications()
    } catch (e) {
      console.error('Failed to mark as read:', e)
    }
  }

  const markAllNotificationsAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true })
      })
      fetchNotifications()
    } catch (e) {
      console.error('Failed to mark all as read:', e)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      await fetch(`/api/notifications?id=${id}`, { method: 'DELETE' })
      fetchNotifications()
    } catch (e) {
      console.error('Failed to delete notification:', e)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'review': return <AlertCircle className="w-4 h-4 text-blue-500" />
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      default: return <Info className="w-4 h-4 text-primary" />
    }
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
              <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 h-5 w-5 rounded-full bg-primary text-[10px] font-bold text-white flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 md:w-96 p-0" align="end">
                  <div className="border-b border-primary/20 p-4 flex items-center justify-between">
                    <h3 className="font-semibold">Notifications</h3>
                    {unreadCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={markAllNotificationsAsRead} className="text-xs">
                        <CheckCheck className="w-3 h-3 mr-1" />
                        Mark all read
                      </Button>
                    )}
                  </div>
                  <ScrollArea className="h-[400px]">
                    {notificationsLoading ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                        <p className="text-sm text-muted-foreground">No notifications yet</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-primary/10">
                        {notifications.map((notif: any) => (
                          <div
                            key={notif.id}
                            className={cn(
                              "p-4 hover:bg-primary/5 transition-colors",
                              !notif.read && "bg-primary/5"
                            )}
                          >
                            <div className="flex gap-3">
                              <div className="mt-1">{getNotificationIcon(notif.type)}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">{notif.title}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{notif.message}</p>
                                    <p className="text-xs text-muted-foreground/70 mt-1">
                                      {new Date(notif.created_at).toLocaleString()}
                                    </p>
                                  </div>
                                  <div className="flex gap-1">
                                    {!notif.read && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => markNotificationAsRead(notif.id)}
                                      >
                                        <Check className="w-3 h-3" />
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => deleteNotification(notif.id)}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                                {notif.link && (
                                  <Link href={notif.link} className="text-xs text-primary hover:underline mt-1 inline-block">
                                    View details →
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </PopoverContent>
              </Popover>
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