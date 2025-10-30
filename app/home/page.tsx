import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowRight, Building2, BarChart3, MessageSquare, LogOut } from 'lucide-react'
import Image from 'next/image'

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

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-primary/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob" />
        <div className="absolute top-0 -right-4 w-96 h-96 bg-accent/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000" />
      </div>

      {/* Header */}
      <header className="relative border-b border-white/10 bg-card/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image
                src="/nnh-logo.png"
                alt="NNH Logo"
                width={48}
                height={48}
                className="animate-fade-in"
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
      <main className="relative container mx-auto px-6 py-16">
        <div className="max-w-5xl mx-auto space-y-12">
          {/* Welcome Section */}
          <div className="text-center space-y-6 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm">
              <Building2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Google My Business Management</span>
            </div>
            
            <h2 className="text-5xl md:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-white via-white to-primary/80 bg-clip-text text-transparent">
                Manage Your Business
              </span>
              <br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                with AI Power
              </span>
            </h2>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Connect your Google My Business account to start managing locations, reviews, and insights with AI-powered automation.
            </p>
          </div>

          {/* CTA Card */}
          <Card className="border border-primary/20 bg-card/80 backdrop-blur-xl shadow-2xl hover:shadow-primary/20 transition-all duration-300 group relative overflow-hidden">
            {/* Decorative gradient border */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ padding: '1px' }}>
              <div className="w-full h-full bg-card/95 backdrop-blur-xl" />
            </div>
            
            <CardHeader className="relative text-center pb-4 pt-8">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-white to-primary/80 bg-clip-text text-transparent">
                Ready to Get Started?
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground mt-2">
                Access your dashboard to connect your Google My Business account and unlock AI-powered features
              </CardDescription>
            </CardHeader>
            <CardContent className="relative flex justify-center pb-10">
              <Link href="/accounts">
                <Button 
                  size="lg" 
                  className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg hover:shadow-primary/50"
                >
                  Go to Dashboard
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 pt-4">
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
              }
            ].map((feature, index) => (
              <Card 
                key={index}
                className="border border-white/10 bg-card/80 backdrop-blur-xl hover:bg-card/90 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/10 group cursor-pointer"
                style={{ animationDelay: `${index * 100}ms` }}
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
        </div>
      </main>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
      `}</style>
    </div>
  )
}
