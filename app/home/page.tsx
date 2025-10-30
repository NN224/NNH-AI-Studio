import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { 
  ArrowRight, Building2, BarChart3, MessageSquare, LogOut, 
  Star, TrendingUp, Zap, Shield, Clock, Users,
  Sparkles, Target, Award, CheckCircle2, Headphones, Globe
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
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) {
    redirect('/auth/login')
  }
  
  const user = session.user

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('user_id', user.id)
    .single()

  // Fetch real stats from database
  const { count: locationsCount } = await supabase
    .from('gmb_locations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const { count: reviewsCount } = await supabase
    .from('gmb_reviews')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  // Calculate average rating efficiently with fallback
  let averageRating = '0.0'
  try {
    const { data: rpcData } = await supabase
      .rpc('calculate_average_rating', { p_user_id: user.id })
      .single()
    
    if (rpcData && typeof rpcData === 'object' && 'avg' in rpcData) {
      averageRating = (rpcData.avg as number).toFixed(1)
    }
  } catch (error) {
    // Fallback: calculate from limited reviews if RPC doesn't exist
    const { data: reviews } = await supabase
      .from('gmb_reviews')
      .select('star_rating')
      .eq('user_id', user.id)
      .limit(1000)
    
    if (reviews && reviews.length > 0) {
      const avg = reviews.reduce((sum, r) => sum + (r.star_rating || 0), 0) / reviews.length
      averageRating = avg.toFixed(1)
    }
  }

  const { count: accountsCount } = await supabase
    .from('gmb_accounts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Premium Static Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative border-b border-white/10 bg-black/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image
                src="/nnh-logo.png"
                alt="NNH Logo"
                width={48}
                height={48}
              />
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  NNH - AI Studio
                </h1>
                <p className="text-sm text-muted-foreground">
                  Welcome back, {profile?.full_name || user.email}
                </p>
              </div>
            </div>
            <form action="/auth/signout" method="post">
              <Button 
                variant="ghost" 
                type="submit"
                className="gap-2 hover:bg-white/10 transition-colors"
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
              <span className="bg-gradient-to-r from-white via-white to-primary/80 bg-clip-text text-transparent">
                Manage Your Business
              </span>
              <br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Smarter, Faster, Better
              </span>
            </h2>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Harness the power of AI to manage your Google My Business presence, respond to reviews, and grow your local reach—all from one intelligent dashboard.
            </p>

            <div className="flex gap-4 justify-center pt-4">
              <Link href="/accounts">
                <Button 
                  size="lg" 
                  className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all duration-300 hover:scale-105"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link href="/analytics">
                <Button 
                  size="lg" 
                  variant="outline"
                  className="gap-2 border-primary/20 hover:bg-primary/10"
                >
                  <BarChart3 className="w-5 h-5" />
                  View Analytics
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Quick Stats Dashboard */}
        <section className="container mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              }
            ].map((stat, index) => (
              <Card 
                key={index}
                className="border border-white/10 bg-card/50 backdrop-blur-xl hover:bg-card/70 transition-all duration-300 hover:scale-105"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
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
            <h3 className="text-3xl font-bold mb-4">Powerful Features at Your Fingertips</h3>
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
              }
            ].map((feature, index) => (
              <Card 
                key={index}
                className="border border-white/10 bg-card/50 backdrop-blur-xl hover:bg-card/70 transition-all duration-300 hover:scale-105 group cursor-pointer"
              >
                <CardHeader className="space-y-4">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-7 h-7 text-primary group-hover:text-accent transition-colors" />
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed">
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
          <Card className="border border-primary/20 bg-gradient-to-br from-primary/10 via-card/50 to-accent/10 backdrop-blur-xl">
            <CardHeader className="text-center pb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30 mx-auto mb-4">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">AI-Powered Assistant</span>
              </div>
              <CardTitle className="text-3xl font-bold mb-4">
                Your Intelligent Business Assistant
              </CardTitle>
              <CardDescription className="text-base max-w-2xl mx-auto">
                Let AI handle the heavy lifting while you focus on growing your business
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                  <div key={index} className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                      <item.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-center mt-8">
                <Link href="/ai-studio">
                  <Button 
                    size="lg"
                    className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90"
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
            <h3 className="text-3xl font-bold mb-4">Why Choose NNH - AI Studio?</h3>
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
                className="border border-white/10 bg-card/50 backdrop-blur-xl hover:bg-card/70 transition-all duration-300 hover:scale-105"
              >
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <item.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg mb-2">{item.title}</CardTitle>
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
          <Card className="border border-white/10 bg-card/50 backdrop-blur-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Quick Actions</CardTitle>
              <CardDescription>Jump to the most common tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: Building2, label: 'Connect Account', href: '/accounts' },
                  { icon: BarChart3, label: 'View Analytics', href: '/analytics' },
                  { icon: MessageSquare, label: 'Manage Reviews', href: '/reviews' },
                  { icon: Sparkles, label: 'AI Studio', href: '/ai-studio' }
                ].map((action, index) => (
                  <Link key={index} href={action.href}>
                    <Button 
                      variant="outline"
                      className="w-full h-auto py-6 flex-col gap-2 border-white/10 hover:bg-primary/10 hover:border-primary/20"
                    >
                      <action.icon className="w-6 h-6 text-primary" />
                      <span className="text-sm">{action.label}</span>
                    </Button>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 bg-black/50 backdrop-blur-xl mt-12">
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
                    <h4 className="font-bold text-lg bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      NNH - AI Studio
                    </h4>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Empowering businesses with AI-powered Google My Business management.
                </p>
              </div>

              <div>
                <h5 className="font-semibold mb-4">Product</h5>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link href="/features" className="hover:text-primary transition-colors">Features</Link></li>
                  <li><Link href="/pricing" className="hover:text-primary transition-colors">Pricing</Link></li>
                  <li><Link href="/analytics" className="hover:text-primary transition-colors">Analytics</Link></li>
                  <li><Link href="/ai-studio" className="hover:text-primary transition-colors">AI Studio</Link></li>
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
                  <li><Link href="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link></li>
                  <li><Link href="/accounts" className="hover:text-primary transition-colors">My Accounts</Link></li>
                  <li><Link href="/settings" className="hover:text-primary transition-colors">Settings</Link></li>
                  <li><Link href="/contact" className="hover:text-primary transition-colors">Contact Support</Link></li>
                </ul>
              </div>
            </div>

            <div className="border-t border-white/10 mt-8 pt-8 text-center text-sm text-muted-foreground">
              <p>&copy; {new Date().getFullYear()} NNH - AI Studio. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
