'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AnimatedCard, StaggerContainer, StaggerItem } from './animated-wrapper'
import { 
  Building2, 
  MapPin, 
  Star, 
  MessageSquare 
} from 'lucide-react'

interface DashboardStats {
  user_id: string
  total_locations: number
  avg_rating: number
  total_reviews: number
  response_rate: number
  pending_reviews: number
  recent_reviews: number
  pending_questions: number
  recent_questions: number
  calculated_at: string
}

interface StatsOverviewProps {
  stats: DashboardStats | null
  accountsCount: number
}

export function StatsOverview({ stats, accountsCount }: StatsOverviewProps) {
  const statsCards = [
    {
      title: 'Active Accounts',
      value: accountsCount,
      icon: Building2,
      description: 'Connected Google accounts',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Total Locations',
      value: stats?.total_locations || 0,
      icon: MapPin,
      description: 'Active business locations',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Average Rating',
      value: stats?.avg_rating ? Number(stats.avg_rating).toFixed(1) : '0.0',
      icon: Star,
      description: 'Across all locations',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      suffix: '⭐',
    },
    {
      title: 'Response Rate',
      value: stats?.response_rate ? `${Math.round(stats.response_rate)}%` : '0%',
      icon: MessageSquare,
      description: 'Reviews replied to',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      badge: stats?.pending_reviews ? {
        label: `${stats.pending_reviews} pending`,
        variant: 'destructive' as const,
      } : undefined,
    },
  ]

  return (
    <StaggerContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statsCards.map((stat, index) => (
        <StaggerItem key={index}>
          <AnimatedCard delay={index * 0.1}>
            <Card className="h-full transition-shadow hover:shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`rounded-lg p-2 ${stat.bgColor} transition-transform hover:scale-110`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold">
                    {stat.value}
                    {stat.suffix && <span className="ml-1 text-xl">{stat.suffix}</span>}
                  </div>
                  {stat.badge && (
                    <Badge variant={stat.badge.variant} className="text-xs">
                      {stat.badge.label}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          </AnimatedCard>
        </StaggerItem>
      ))}
    </StaggerContainer>
  )
}

