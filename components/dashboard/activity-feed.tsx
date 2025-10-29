"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, MessageSquare, MapPin, Star, Zap } from "lucide-react"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { ActivityLog } from "@/lib/types/database"
import { Skeleton } from "@/components/ui/skeleton"

const activityIcons = {
  review: MessageSquare,
  location: MapPin,
  rating: Star,
  ai: Zap,
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from("activity_logs")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10)

        if (error) {
          console.error("Failed to fetch activities:", error)
          setActivities([])
        } else if (data) {
          setActivities(data)
        }
      } catch (err) {
        console.error("Activity feed error:", err)
        setActivities([])
      } finally {
        setLoading(false)
      }
    }

    fetchActivities()

    // Subscribe to real-time updates with error handling
    const channel = supabase
      .channel("activity_logs")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_logs",
        },
        (payload) => {
          setActivities((prev) => [payload.new as ActivityLog, ...prev].slice(0, 10))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const getActivityIcon = (type: string) => {
    const IconComponent = activityIcons[type as keyof typeof activityIcons] || MessageSquare
    return IconComponent
  }

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date()
    const then = new Date(timestamp)
    const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000)

    if (diffInSeconds < 60) return "Just now"
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
  }

  if (loading) {
    return (
      <Card className="bg-card border-primary/30">
        <CardHeader>
          <CardTitle className="text-foreground">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-primary/30">
      <CardHeader>
        <CardTitle className="text-foreground">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No recent activity</p>
            <p className="text-sm mt-2">Your activity will appear here</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {activities.map((activity) => {
              const Icon = getActivityIcon(activity.activity_type)
              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-4 p-4 rounded-lg bg-secondary border border-primary/20 hover:border-primary/40 transition-all duration-200"
                >
                  <div className="relative">
                    <div className="absolute inset-0 animate-ping rounded-full bg-primary/30 opacity-0 group-hover:opacity-100" />
                    <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{activity.activity_message}</p>
                    <p className="text-xs text-muted-foreground">{formatRelativeTime(activity.created_at)}</p>
                  </div>

                  {activity.actionable && (
                    <Button size="sm" variant="ghost" className="shrink-0 text-primary hover:text-accent">
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </CardContent>
    </Card>
  )
}
