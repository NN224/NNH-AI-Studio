'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  RefreshCcw, 
  Bot, 
  BarChart3, 
  MessageSquare,
  Zap
} from 'lucide-react'

const actions = [
  {
    icon: RefreshCcw,
    label: 'Sync GMB Data',
    description: 'Update locations, reviews, and posts',
    href: '/dashboard/sync',
    variant: 'default' as const,
    color: 'bg-blue-500',
  },
  {
    icon: Bot,
    label: 'AI Autopilot',
    description: 'Automate review responses',
    href: '/dashboard/autopilot',
    variant: 'outline' as const,
    color: 'bg-purple-500',
  },
  {
    icon: BarChart3,
    label: 'View Analytics',
    description: 'Insights and performance metrics',
    href: '/dashboard/analytics',
    variant: 'outline' as const,
    color: 'bg-green-500',
  },
  {
    icon: MessageSquare,
    label: 'Manage Reviews',
    description: 'Reply to customer feedback',
    href: '/dashboard/reviews',
    variant: 'outline' as const,
    color: 'bg-orange-500',
  },
]

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {actions.map((action) => (
            <Button
              key={action.href}
              variant={action.variant}
              className="h-auto flex flex-col items-start p-4 gap-2"
              asChild
            >
              <Link href={action.href}>
                <div className="flex items-center gap-2 w-full">
                  <div className={`rounded-lg p-2 ${action.color} bg-opacity-10`}>
                    <action.icon className={`h-4 w-4 ${action.color.replace('bg-', 'text-')}`} />
                  </div>
                  <span className="font-semibold text-sm">{action.label}</span>
                </div>
                <p className="text-xs text-muted-foreground text-left">
                  {action.description}
                </p>
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

