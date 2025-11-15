'use client'

import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Activity, 
  Clock,
  AlertCircle
} from 'lucide-react'

interface ActivityLog {
  id: string
  activity_type: string
  activity_message: string
  metadata: Record<string, any>
  actionable: boolean
  created_at: string
}

interface RecentActivityProps {
  activities: ActivityLog[]
}

function getActivityIcon(activityType: string) {
  // You can expand this to return different icons based on activity type
  const iconMap: Record<string, any> = {
    sync: Clock,
    review: AlertCircle,
    default: Activity,
  }
  
  const IconComponent = iconMap[activityType] || iconMap.default
  return IconComponent
}

function ActivityItem({ activity }: { activity: ActivityLog }) {
  const Icon = getActivityIcon(activity.activity_type)
  
  return (
    <div className="flex gap-3 border-b last:border-0 pb-3 last:pb-0">
      <div className="rounded-full bg-muted p-2 h-fit">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 space-y-1 min-w-0">
        <p className="text-sm leading-tight">
          {activity.activity_message}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(activity.created_at), {
            addSuffix: true,
          })}
        </p>
      </div>
    </div>
  )
}

export function RecentActivity({ activities }: RecentActivityProps) {
  if (activities.length === 0) {
    return (
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center py-8">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Activity className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            No recent activity
          </p>
          <p className="text-xs text-muted-foreground text-center mt-1">
            Your activity will appear here
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        {activities.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </CardContent>
    </Card>
  )
}

