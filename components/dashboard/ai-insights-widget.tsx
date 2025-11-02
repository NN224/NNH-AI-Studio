"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Lightbulb, TrendingUp, AlertCircle, ChevronRight, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

interface QuickInsight {
  id: string
  type: "insight" | "recommendation" | "warning"
  title: string
  message: string
  priority: "high" | "medium" | "low"
}

export function AIInsightsWidget() {
  const [insights, setInsights] = useState<QuickInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState<string[]>([])
  const supabase = createClient()

  useEffect(() => {
    fetchQuickInsights()
  }, [])

  const fetchQuickInsights = async () => {
    setLoading(true)
    try {
      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser()
      
      // Handle session expiration
      if (authError) {
        if (authError.code === 'session_expired' || authError.message?.includes('expired')) {
          console.log('Session expired in AI insights widget')
          setLoading(false)
          return
        }
        console.error('Auth error:', authError)
        setLoading(false)
        return
      }
      
      if (!user) {
        setLoading(false)
        return
      }

      // Get active GMB accounts
      const { data: accounts } = await supabase
        .from("gmb_accounts")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)

      if (!accounts || accounts.length === 0) {
        setLoading(false)
        return
      }

      const accountIds = accounts.map((a) => a.id)

      // Get locations data (include id field)
      const { data: locations } = await supabase
        .from("gmb_locations")
        .select("id")
        .eq("user_id", user.id)
        .in("gmb_account_id", accountIds)

      // Get reviews data to calculate stats
      const locationIds = locations?.map((l: any) => l.id) || []
      const { data: reviews } =
        locationIds.length > 0
          ? await supabase
              .from("gmb_reviews")
              .select("rating, review_reply, location_id")
              .eq("user_id", user.id)
              .in("location_id", locationIds)
          : { data: null }

      const quickInsights: QuickInsight[] = []

      // Calculate stats from reviews (more accurate than stored fields)
      if (reviews && reviews.length > 0) {
        const totalReviews = reviews.length
        const respondedReviews = reviews.filter((r: any) => r.review_reply).length
        const avgRating = reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / totalReviews
        const avgResponseRate = totalReviews > 0 ? (respondedReviews / totalReviews) * 100 : 0

        // Rating insight
        if (avgRating < 4.0 && totalReviews >= 3) {
          quickInsights.push({
            id: "rating-low",
            type: "warning",
            title: "Rating Below Optimal",
            message: `Your average rating is ${avgRating.toFixed(1)}. Focus on improving customer satisfaction.`,
            priority: "high",
          })
        }

        // Response rate
        if (avgResponseRate < 80 && totalReviews > 0) {
          quickInsights.push({
            id: "response-rate",
            type: "recommendation",
            title: "Improve Response Rate",
            message: `Your response rate is ${avgResponseRate.toFixed(0)}%. Aim for 100% to show engagement.`,
            priority: "medium",
          })
        }

        // Unresponded reviews
        const unresponded = totalReviews - respondedReviews
        if (unresponded > 0) {
          quickInsights.push({
            id: "unresponded-reviews",
            type: "recommendation",
            title: "Unanswered Reviews",
            message: `You have ${unresponded} review${unresponded > 1 ? "s" : ""} waiting for a response.`,
            priority: "high",
          })
        }
      } else if (locations && locations.length > 0 && (!reviews || reviews.length === 0)) {
        // No reviews yet
        quickInsights.push({
          id: "no-reviews",
          type: "insight",
          title: "No Reviews Yet",
          message: "Start engaging with customers to get your first reviews.",
          priority: "low",
        })
      }

      setInsights(quickInsights.slice(0, 3)) // Show top 3 insights
    } catch (error) {
      console.error("Error fetching insights:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = (id: string) => {
    setDismissed((prev) => [...prev, id])
  }

  const visibleInsights = insights.filter((i) => !dismissed.includes(i.id))

  if (loading || visibleInsights.length === 0) {
    return null
  }

  const getInsightIcon = (type: QuickInsight["type"]) => {
    switch (type) {
      case "insight":
        return <Lightbulb className="h-4 w-4 text-primary" />
      case "recommendation":
        return <TrendingUp className="h-4 w-4 text-blue-500" />
      case "warning":
        return <AlertCircle className="h-4 w-4 text-orange-500" />
    }
  }

  const getInsightColor = (type: QuickInsight["type"]) => {
    switch (type) {
      case "insight":
        return "bg-primary/10 border-primary/30"
      case "recommendation":
        return "bg-blue-500/10 border-blue-500/30"
      case "warning":
        return "bg-orange-500/10 border-orange-500/30"
    }
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/20">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">AI Insights</CardTitle>
              <CardDescription className="text-xs">Personalized recommendations for your business</CardDescription>
            </div>
          </div>
          <Link href="/gmb-dashboard?tab=analytics">
            <Button variant="ghost" size="sm" className="text-xs">
              View All
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <AnimatePresence>
            {visibleInsights.map((insight, index) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className={`p-3 rounded-lg border ${getInsightColor(insight.type)} relative group`}>
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">{getInsightIcon(insight.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold mb-1">{insight.title}</h4>
                          <p className="text-xs text-foreground/70">{insight.message}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDismiss(insight.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      {insight.priority === "high" && (
                        <Badge variant="outline" className="mt-2 text-xs bg-red-500/20 text-red-500 border-red-500/30">
                          High Priority
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  )
}

