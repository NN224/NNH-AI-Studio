import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Building2, MessageSquare, BarChart3, Sparkles, Target, Zap, Play } from 'lucide-react'

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-12">
        <div className="mb-8">
          <Link href="/home" className="text-muted-foreground hover:text-primary inline-flex items-center gap-2 mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <h1 className="text-4xl font-bold mb-4">
            <span className="gradient-text">Features</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Everything you need to manage and grow your Google My Business and YouTube presence
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Building2,
              title: 'Multi-Location Management',
              description: 'Manage unlimited GMB locations from a single dashboard. Update hours, photos, and posts across all locations instantly.',
            },
            {
              icon: MessageSquare,
              title: 'AI Review Responses',
              description: 'Generate professional review responses in seconds with AI. Maintain your brand voice while saving hours of work.',
            },
            {
              icon: BarChart3,
              title: 'Advanced Analytics',
              description: 'Track performance metrics, customer insights, and engagement trends with beautiful, actionable dashboards.',
            },
            {
              icon: Play,
              title: 'YouTube Integration',
              description: 'Monitor channel performance, track video analytics, and manage your YouTube presence alongside GMB.',
            },
            {
              icon: Sparkles,
              title: 'AI Content Generation',
              description: 'Create engaging posts, descriptions, and responses with our AI writing assistant for both GMB and YouTube.',
            },
            {
              icon: Target,
              title: 'Growth Insights',
              description: 'Get AI-powered recommendations to improve your rankings, engagement, and overall online visibility.',
            },
            {
              icon: Zap,
              title: 'Automation Tools',
              description: 'Automate repetitive tasks like post scheduling, review monitoring, and performance reporting.',
            },
          ].map((feature, index) => (
            <Card key={index} className="border border-primary/20 glass hover-lift group cursor-pointer">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-all">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <CardDescription className="text-sm">{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Button asChild size="lg" className="gap-2 gradient-orange">
            <Link href="/home">
              Get Started
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

