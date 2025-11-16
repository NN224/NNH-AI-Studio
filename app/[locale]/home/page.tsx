import { redirect } from 'next/navigation'
import { Link } from '@/lib/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  ArrowRight, Building2, BarChart3, MessageSquare, LogOut, 
  Star, TrendingUp, Zap, Shield, Clock, Users,
  Sparkles, Target, Award, CheckCircle2, Headphones, Globe, Play
} from 'lucide-react'
import Image from 'next/image'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'NNH - AI Studio | Google My Business Management Platform',
  description: 'Empower your business with AI-powered Google My Business management. Manage locations, reviews, and insights with advanced analytics and automation.',
  keywords: 'Google My Business, GMB, AI, Business Management, Reviews, Analytics, NNH, Local SEO',
  openGraph: {
    title: 'NNH - AI Studio | Google My Business Management',
    description: 'AI-powered platform for managing your Google My Business presence',
    type: 'website',
    images: ['/nnh-logo.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NNH - AI Studio | Google My Business Management',
    description: 'AI-powered platform for managing your Google My Business presence',
    images: ['/nnh-logo.png'],
  },
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/auth/login')
  }

  const userId = user!.id
  const userEmail = user?.email || ''

  // Get user profile (platform identity for Home only)
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, avatar_url')
    .eq('id', userId)
    .maybeSingle()

  // Fetch real stats from database
  const { count: locationsCount } = await supabase
    .from('gmb_locations')
    .select('*', { count: 'exact', head: true })
  .eq('user_id', userId)

  const { count: reviewsCount } = await supabase
    .from('gmb_reviews')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  // Calculate average rating efficiently with fallback
  let averageRating = '0.0'
  try {
    const { data: rpcData } = await supabase
  .rpc('calculate_average_rating', { p_user_id: userId })
      .single()
    
    if (rpcData && typeof rpcData === 'object' && 'avg' in rpcData) {
      averageRating = (rpcData.avg as number).toFixed(1)
    }
  } catch (error) {
    // Fallback: calculate from limited reviews if RPC doesn't exist
    const { data: reviews } = await supabase
      .from('gmb_reviews')
      .select('star_rating')
  .eq('user_id', userId)
      .limit(1000)
    
    if (reviews && reviews.length > 0) {
      const avg = reviews.reduce((sum, r) => sum + (r.star_rating || 0), 0) / reviews.length
      averageRating = avg.toFixed(1)
    }
  }

  const { count: accountsCount } = await supabase
    .from('gmb_accounts')
    .select('*', { count: 'exact', head: true })
  .eq('user_id', userId)

  // Fetch YouTube stats
  const { data: youtubeToken } = await supabase
    .from('oauth_tokens')
    .select('metadata')
  .eq('user_id', userId)
    .eq('provider', 'youtube')
    .maybeSingle()

  const youtubeStats = youtubeToken?.metadata as any
  const youtubeSubs = youtubeStats?.statistics?.subscriberCount ? Number(youtubeStats.statistics.subscriberCount) : 0
  const youtubeViews = youtubeStats?.statistics?.viewCount ? Number(youtubeStats.statistics.viewCount) : 0
  const youtubeVideos = youtubeStats?.statistics?.videoCount ? Number(youtubeStats.statistics.videoCount) : 0
  const hasYouTube = !!youtubeToken

  return (
    <div className="min-h-screen bg-background">
      {/* Premium Animated Background with Orange Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Animated gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-primary/20 to-accent/10 rounded-full blur-3xl animate-blob" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-accent/20 to-primary/10 rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl animate-blob animation-delay-4000" />
        
        {/* Mesh gradient overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,107,53,0.05),transparent_50%)]" />
      </div>

      {/* Header */}
      <header className="relative border-b border-primary/10 glass-strong">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative w-12 h-12 rounded-full overflow-hidden border border-primary/20 bg-muted">
                {profile?.avatar_url ? (
                  <Image src={profile.avatar_url} alt="Avatar" fill sizes="48px" className="object-cover" />
                ) : (
                  <Image src="/nnh-logo.png" alt="NNH Logo" fill sizes="48px" className="object-contain p-1.5" />
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text">
                  {profile?.full_name || userEmail}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Welcome back to NNH - AI Studio
                </p>
              </div>
            </div>
            <form action="/auth/signout" method="post">
              <Button 
                variant="ghost" 
                type="submit"
                className="gap-2 hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative">
        {/* Hero Section */}
        <section className="container mx-auto px-6 py-16">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">AI-Powered Business Management</span>
            </div>
            
            <h2 className="text-5xl md:text-6xl font-bold tracking-tight">
              <span className="block mb-2 text-foreground">
                Manage Your Business
              </span>
              <span className="gradient-text">
                Smarter, Faster, Better
              </span>
            </h2>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Harness the power of AI to manage your Google My Business presence, YouTube channel, respond to reviews, and grow your local reach—all from one intelligent dashboard.
            </p>

            <div className="flex gap-4 justify-center pt-4">
              <Link href="/youtube-dashboard">
                <Button 
                  size="lg" 
                  className="gap-2 gradient-orange hover:opacity-90 transition-all duration-300 hover:scale-105 shadow-lg shadow-primary/20 hover:shadow-primary/40"
                >
                  <Play className="w-5 h-5" />
                  YouTube Dashboard
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button 
                  size="lg" 
                  variant="outline"
                  className="gap-2 border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-all"
                >
                  <Building2 className="w-5 h-5" />
                  GMB Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Quick Stats Dashboard */}
        <section className="container mx-auto px-6 py-12">
          {/* Show empty state if no accounts connected */}
          {accountsCount === 0 && !hasYouTube && (
            <Card className="border border-primary/30 glass-strong mb-6">
              <CardContent className="p-8 text-center">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">Get Started with NNH AI Studio</h3>
                  <p className="text-muted-foreground">
                    Connect your Google My Business account or YouTube channel to start managing your online presence.
                  </p>
                  <div className="flex gap-3 justify-center pt-4">
                    <Link href="/settings">
                      <Button className="gap-2 gradient-orange hover:opacity-90">
                        <Building2 className="w-4 h-4" />
                        Connect GMB
                      </Button>
                    </Link>
                    <Link href="/youtube-dashboard">
                      <Button variant="outline" className="gap-2 border-primary/30 hover:bg-primary/10">
                        <Play className="w-4 h-4" />
                        Connect YouTube
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              {
                icon: Building2,
                label: 'Total Locations',
                value: locationsCount || 0,
                suffix: '+',
                color: 'text-primary',
                bgColor: 'bg-primary/10'
              },
              {
                icon: MessageSquare,
                label: 'Total Reviews',
                value: reviewsCount || 0,
                suffix: '+',
                color: 'text-accent',
                bgColor: 'bg-accent/10'
              },
              {
                icon: Star,
                label: 'Average Rating',
                value: averageRating,
                suffix: '/5.0',
                color: 'text-yellow-500',
                bgColor: 'bg-yellow-500/10'
              },
              {
                icon: TrendingUp,
                label: 'Active Accounts',
                value: accountsCount || 0,
                suffix: '',
                color: 'text-green-500',
                bgColor: 'bg-green-500/10'
              },
              ...(hasYouTube ? [{
                icon: Play,
                label: 'YouTube Subscribers',
                value: youtubeSubs.toLocaleString(),
                suffix: '',
                color: 'text-red-500',
                bgColor: 'bg-red-500/10'
              }] : [])
            ].map((stat, index) => (
              <Card 
                key={index}
                className="border border-primary/20 glass hover-lift group cursor-pointer relative overflow-hidden"
              >
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-accent/0 group-hover:from-primary/10 group-hover:to-accent/5 transition-all duration-300" />
                
                <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                  <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    {stat.label}
                  </CardTitle>
                  <div className={`p-2.5 rounded-xl ${stat.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="text-3xl font-bold group-hover:scale-105 transition-transform">
                    {stat.value}
                    <span className="text-lg text-muted-foreground ml-1">{stat.suffix}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Features Showcase */}
        <section className="container mx-auto px-6 py-12">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4">
              <span className="gradient-text">Powerful Features</span> at Your Fingertips
            </h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage and grow your Google My Business presence
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Building2,
                title: 'Multi-Location Management',
                description: 'Manage all your business locations from one centralized dashboard with real-time sync',
                gradient: 'from-primary/20 to-primary/5'
              },
              {
                icon: MessageSquare,
                title: 'AI Review Management',
                description: 'Respond to customer reviews instantly with AI-powered suggestions and sentiment analysis',
                gradient: 'from-accent/20 to-accent/5'
              },
              {
                icon: BarChart3,
                title: 'Advanced Analytics',
                description: 'Track performance metrics with detailed insights, charts, and actionable reports',
                gradient: 'from-primary/20 to-accent/5'
              },
              {
                icon: Sparkles,
                title: 'AI Content Generation',
                description: 'Create engaging posts, descriptions, and responses with our AI writing assistant',
                gradient: 'from-purple-500/20 to-purple-500/5'
              },
              {
                icon: Target,
                title: 'Sentiment Analysis',
                description: 'Understand customer sentiment with AI-powered analysis of reviews and feedback',
                gradient: 'from-blue-500/20 to-blue-500/5'
              },
              {
                icon: Zap,
                title: 'Auto-Responses',
                description: 'Set up automated review responses with customizable templates and AI assistance',
                gradient: 'from-green-500/20 to-green-500/5'
              },
              {
                icon: Play,
                title: 'YouTube Management',
                description: 'Manage your YouTube channel with analytics, video insights, comments, and AI content generation',
                gradient: 'from-red-500/20 to-red-500/5'
              }
            ].map((feature, index) => (
              <Card 
                key={index}
                className="border border-primary/20 glass hover-lift group cursor-pointer relative overflow-hidden"
              >
                {/* Animated gradient background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                
                <CardHeader className="space-y-4 relative z-10">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center group-hover:scale-110 group-hover:shadow-lg transition-all duration-300`}>
                    <feature.icon className="w-7 h-7 text-primary group-hover:text-accent transition-colors" />
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-lg group-hover:gradient-text transition-all">{feature.title}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed group-hover:text-muted-foreground/90">
                      {feature.description}
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        {/* AI Assistant Preview */}
        <section className="container mx-auto px-6 py-12">
          <Card className="border border-primary/30 glass-strong relative overflow-hidden">
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 opacity-50" />
            
            <CardHeader className="text-center pb-8 relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30 mx-auto mb-4 hover:bg-primary/30 transition-colors">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">AI-Powered Assistant</span>
              </div>
              <CardTitle className="text-3xl font-bold mb-4">
                Your <span className="gradient-text">Intelligent Business</span> Assistant
              </CardTitle>
              <CardDescription className="text-base max-w-2xl mx-auto">
                Let AI handle the heavy lifting while you focus on growing your business
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  {
                    icon: MessageSquare,
                    title: 'Smart Review Responses',
                    description: 'Generate professional, personalized responses to customer reviews in seconds'
                  },
                  {
                    icon: Sparkles,
                    title: 'Content Creation',
                    description: 'Create engaging posts, updates, and descriptions that resonate with your audience'
                  },
                  {
                    icon: Target,
                    title: 'Sentiment Insights',
                    description: 'Understand customer emotions and trends to improve your service'
                  },
                  {
                    icon: Award,
                    title: 'Performance Tips',
                    description: 'Get AI-powered recommendations to boost your local SEO and visibility'
                  }
                ].map((item, index) => (
                  <div key={index} className="flex gap-4 group cursor-pointer">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 group-hover:scale-110 transition-all">
                      <item.icon className="w-6 h-6 text-primary group-hover:text-accent transition-colors" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1 group-hover:text-primary transition-colors">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-center mt-8">
                <Link href="/ai-studio">
                  <Button 
                    size="lg"
                    className="gap-2 gradient-orange hover:opacity-90 shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all hover:scale-105"
                  >
                    Try AI Studio
                    <Sparkles className="w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Why Choose NNH */}
        <section className="container mx-auto px-6 py-12">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4">
              Why Choose <span className="gradient-text">NNH - AI Studio</span>?
            </h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The most comprehensive Google My Business management platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Globe,
                title: 'Local SEO Expert',
                description: 'Optimize your local presence with AI-powered SEO recommendations and insights'
              },
              {
                icon: Zap,
                title: 'Lightning Fast',
                description: 'Real-time synchronization with Google My Business for instant updates and notifications'
              },
              {
                icon: Shield,
                title: 'Enterprise Security',
                description: 'Bank-level encryption and security to protect your business data'
              },
              {
                icon: Headphones,
                title: '24/7 Support',
                description: 'Round-the-clock customer support to help you succeed'
              },
              {
                icon: Users,
                title: 'Multi-User Access',
                description: 'Collaborate with your team with role-based permissions and access control'
              },
              {
                icon: CheckCircle2,
                title: 'Always Updated',
                description: 'Automatic updates with the latest Google My Business features and improvements'
              }
            ].map((item, index) => (
              <Card 
                key={index}
                className="border border-primary/20 glass hover-lift group cursor-pointer"
              >
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 group-hover:scale-110 transition-all">
                    <item.icon className="w-6 h-6 text-primary group-hover:text-accent transition-colors" />
                  </div>
                  <CardTitle className="text-lg mb-2 group-hover:gradient-text transition-all">{item.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {item.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="container mx-auto px-6 py-12">
          <Card className="border border-primary/30 glass-strong">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">
                <span className="gradient-text">Quick Actions</span>
              </CardTitle>
              <CardDescription>Jump to the most common tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { icon: Building2, label: 'GMB Dashboard', href: '/dashboard' },
                  { icon: BarChart3, label: 'View Analytics', href: '/analytics' },
                  { icon: MessageSquare, label: 'Manage Reviews', href: '/reviews' },
                  { icon: Play, label: 'YouTube Dashboard', href: '/youtube-dashboard' },
                  { icon: Sparkles, label: 'GMB Posts', href: '/posts' }
                ].map((action, index) => (
                  <Link key={index} href={action.href}>
                    <Button 
                      variant="outline"
                      className="w-full h-auto py-6 flex-col gap-3 border-primary/20 hover:bg-primary/10 hover:border-primary/40 hover:scale-105 transition-all group"
                    >
                      <action.icon className="w-7 h-7 text-primary group-hover:text-accent transition-colors" />
                      <span className="text-sm font-medium">{action.label}</span>
                    </Button>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <footer className="border-t border-primary/10 glass-strong mt-12">
          <div className="container mx-auto px-6 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Image
                    src="/nnh-logo.png"
                    alt="NNH Logo"
                    width={40}
                    height={40}
                  />
                  <div>
                    <h4 className="font-bold text-lg gradient-text">
                      NNH - AI Studio
                    </h4>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Empowering businesses with AI-powered Google My Business and YouTube management.
                </p>
              </div>

              <div>
                <h5 className="font-semibold mb-4">Product</h5>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link href="/features" className="hover:text-primary transition-colors">Features</Link></li>
                  <li><Link href="/pricing" className="hover:text-primary transition-colors">Pricing</Link></li>
                  <li><Link href="/analytics" className="hover:text-primary transition-colors">Analytics</Link></li>
                  <li><Link href="/youtube-dashboard" className="hover:text-primary transition-colors">YouTube Dashboard</Link></li>
                </ul>
              </div>

              <div>
                <h5 className="font-semibold mb-4">Company</h5>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link href="/about" className="hover:text-primary transition-colors">About</Link></li>
                  <li><Link href="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
                  <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
                  <li><Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
                </ul>
              </div>

              <div>
                <h5 className="font-semibold mb-4">Support</h5>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link href="/dashboard" className="hover:text-primary transition-colors">GMB Dashboard</Link></li>
                  <li><Link href="/settings" className="hover:text-primary transition-colors">Settings</Link></li>
                  <li><Link href="/contact" className="hover:text-primary transition-colors">Contact Support</Link></li>
                </ul>
              </div>
            </div>

            <div className="border-t border-primary/10 mt-8 pt-8 text-center text-sm text-muted-foreground">
              <p>&copy; {new Date().getFullYear()} <span className="text-primary font-medium">NNH - AI Studio</span>. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
