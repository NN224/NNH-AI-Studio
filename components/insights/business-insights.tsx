"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Lightbulb, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Target, BarChart3, Sparkles } from "lucide-react"
import { motion } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { 
  calculateEngagementRate, 
  calculateCTR, 
  getDateRange, 
  comparePeriods,
  getImpressionsBreakdown,
  getDeviceSplit,
  getSourceSplit,
  calculateBookingsRate
} from "@/lib/utils/performance-calculations"

interface Insight {
  id: string
  type: "positive" | "warning" | "opportunity"
  category: string
  title: string
  description: string
  impact: "high" | "medium" | "low"
  metrics?: {
    current: number
    target: number
    unit?: string
  }
}

export function BusinessInsights() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchInsights()
  }, [])

  const fetchInsights = async () => {
    setLoading(true)
    try {
      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser()
      
      // Handle session expiration
      if (authError) {
        if (authError.code === 'session_expired' || authError.message?.includes('expired')) {
          toast.error('Your session has expired. Please log in again.')
          window.location.href = '/auth/login'
          return
        }
        console.error('Auth error:', authError)
        return
      }
      
      if (!user) return

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
        .select("id, category, rating, review_count, address, location_name, response_rate")
        .eq("user_id", user.id)
        .in("gmb_account_id", accountIds)

      // Get reviews data  
      const locationIds = locations?.map((l: any) => l.id) || []
      const { data: reviews } =
        locationIds.length > 0
          ? await supabase
              .from("gmb_reviews")
              .select("rating, comment, ai_sentiment, review_reply, created_at")
              .eq("user_id", user.id)
              .in("location_id", locationIds)
          : { data: null }

      // Generate insights
      const generatedInsights: Insight[] = []

      if (locations && locations.length > 0) {
        const avgRating = locations.reduce((sum, loc) => sum + (loc.rating || 0), 0) / locations.length
        const totalReviews = locations.reduce((sum, loc) => sum + (loc.review_count || 0), 0)
        const avgResponseRate = locations.reduce((sum, loc) => sum + (loc.response_rate || 0), 0) / locations.length

        // Rating insight
        if (avgRating >= 4.5) {
          generatedInsights.push({
            id: "rating-excellent",
            type: "positive",
            category: "Reputation",
            title: "Excellent Average Rating",
            description: `Your average rating of ${avgRating.toFixed(1)} stars is above industry standards. This builds trust and attracts new customers.`,
            impact: "high",
            metrics: {
              current: avgRating,
              target: 5.0,
              unit: "stars",
            },
          })
        } else if (avgRating < 4.0) {
          generatedInsights.push({
            id: "rating-improve",
            type: "warning",
            category: "Reputation",
            title: "Rating Improvement Opportunity",
            description: `Your average rating of ${avgRating.toFixed(1)} stars is below optimal. Focus on addressing customer concerns to improve.`,
            impact: "high",
            metrics: {
              current: avgRating,
              target: 4.5,
              unit: "stars",
            },
          })
        }

        // Review volume insight
        if (totalReviews < 20) {
          generatedInsights.push({
            id: "review-volume",
            type: "opportunity",
            category: "SEO & Visibility",
            title: "Increase Review Volume",
            description: `With ${totalReviews} reviews, you're missing out on local SEO benefits. More reviews improve search rankings and customer trust.`,
            impact: "high",
            metrics: {
              current: totalReviews,
              target: 50,
            },
          })
        }

        // Response rate insight
        if (avgResponseRate < 80) {
          generatedInsights.push({
            id: "response-rate",
            type: "opportunity",
            category: "Engagement",
            title: "Improve Review Response Rate",
            description: `Your response rate is ${avgResponseRate.toFixed(0)}%. Aim for 100% to show customers you value their feedback.`,
            impact: "medium",
            metrics: {
              current: avgResponseRate,
              target: 100,
              unit: "%",
            },
          })
        }
      }

      // Review sentiment insights
      if (reviews && reviews.length > 0) {
        const negativeReviews = reviews.filter((r: any) => r.rating && r.rating <= 2).length
        const negativePercent = ((negativeReviews / reviews.length) * 100).toFixed(1)

        if (parseFloat(negativePercent) > 10) {
          generatedInsights.push({
            id: "negative-sentiment",
            type: "warning",
            category: "Customer Satisfaction",
            title: "High Negative Review Rate",
            description: `${negativePercent}% of your reviews are 2 stars or below. This indicates areas for improvement in customer experience.`,
            impact: "high",
          })
        }

        // Recent activity
        const recentReviews = reviews.filter((r: any) => {
          if (!r.created_at) return false
          const reviewDate = new Date(r.created_at)
          const daysDiff = (Date.now() - reviewDate.getTime()) / (1000 * 60 * 60 * 24)
          return daysDiff <= 30
        }).length

        if (recentReviews >= 5) {
          generatedInsights.push({
            id: "active-engagement",
            type: "positive",
            category: "Engagement",
            title: "Strong Recent Activity",
            description: `You've received ${recentReviews} reviews in the last 30 days. This shows active customer engagement.`,
            impact: "medium",
          })
        }
      }

      // Profile completeness
      const completeProfiles = locations?.filter(
        (l: any) => l.address && l.category && (l.rating || 0) > 0
      ).length || 0
      const completenessPercent = locations ? parseFloat(((completeProfiles / locations.length) * 100).toFixed(0)) : 0

      if (completenessPercent < 100) {
        generatedInsights.push({
          id: "profile-completeness",
          type: "opportunity",
          category: "Optimization",
          title: "Profile Completeness",
          description: `${completenessPercent}% of your profiles are complete. Complete profiles rank better in local search.`,
          impact: "medium",
          metrics: {
            current: completenessPercent,
            target: 100,
            unit: "%",
          },
        })
      }

      // Performance-based insights from Performance API
      const { data: performanceMetrics } = locationIds.length > 0
        ? await supabase
            .from("gmb_performance_metrics")
            .select("metric_type, metric_value, metric_date")
            .eq("user_id", user.id)
            .in("location_id", locationIds)
        : { data: [] }

      if (performanceMetrics && performanceMetrics.length > 0) {
        // Get last 30 days metrics
        const { start, end } = getDateRange(30)
        const { start: prevStart, end: prevEnd } = getDateRange(60)
        
        const currentMetrics = performanceMetrics.filter((m: any) => {
          const date = new Date(m.metric_date)
          return date >= start && date <= end
        })

        const previousMetrics = performanceMetrics.filter((m: any) => {
          const date = new Date(m.metric_date)
          return date >= prevStart && date < start
        })

        if (currentMetrics.length > 0) {
          // Engagement Rate insight
          const engagementRate = calculateEngagementRate(currentMetrics, start, end)
          if (engagementRate > 0) {
            const industryAverage = 5 // Typical engagement rate
            if (engagementRate < industryAverage) {
              generatedInsights.push({
                id: "engagement-rate",
                type: "opportunity",
                category: "Performance",
                title: "Improve Engagement Rate",
                description: `Your engagement rate is ${engagementRate.toFixed(1)}%. Industry average is ${industryAverage}%. Focus on improving click-through rates and conversations.`,
                impact: "high",
                metrics: {
                  current: engagementRate,
                  target: industryAverage,
                  unit: "%",
                },
              })
            } else if (engagementRate >= industryAverage * 1.5) {
              generatedInsights.push({
                id: "engagement-rate-excellent",
                type: "positive",
                category: "Performance",
                title: "Excellent Engagement Rate",
                description: `Your engagement rate of ${engagementRate.toFixed(1)}% is well above industry average. Keep up the great work!`,
                impact: "high",
              })
            }
          }

          // CTR insight
          const ctr = calculateCTR(currentMetrics, start, end)
          if (ctr > 0) {
            const industryCTR = 3 // Typical CTR
            if (ctr < industryCTR) {
              generatedInsights.push({
                id: "ctr-low",
                type: "warning",
                category: "Performance",
                title: "Low Click-Through Rate",
                description: `Your CTR is ${ctr.toFixed(2)}%. Industry average is ${industryCTR}%. Consider optimizing your business profile and photos to increase clicks.`,
                impact: "high",
                metrics: {
                  current: ctr,
                  target: industryCTR,
                  unit: "%",
                },
              })
            }
          }

          // Impressions growth insight
          const impressionsComparison = comparePeriods(
            currentMetrics,
            previousMetrics,
            'BUSINESS_IMPRESSIONS_DESKTOP_MAPS'
          )
          
          if (impressionsComparison.changePercent < -10) {
            generatedInsights.push({
              id: "impressions-declining",
              type: "warning",
              category: "Visibility",
              title: "Impressions Declining",
              description: `Your impressions decreased by ${Math.abs(impressionsComparison.changePercent).toFixed(1)}% compared to last month. Review your SEO strategy and profile optimization.`,
              impact: "high",
            })
          } else if (impressionsComparison.changePercent > 20) {
            generatedInsights.push({
              id: "impressions-growing",
              type: "positive",
              category: "Visibility",
              title: "Strong Impressions Growth",
              description: `Your impressions increased by ${impressionsComparison.changePercent.toFixed(1)}% this month! Your visibility is improving.`,
              impact: "medium",
            })
          }

          // Device split insight
          const deviceSplit = getDeviceSplit(currentMetrics, start, end)
          if (deviceSplit.mobilePercent > 70) {
            generatedInsights.push({
              id: "mobile-dominant",
              type: "positive",
              category: "Performance",
              title: "Mobile-First Audience",
              description: `${deviceSplit.mobilePercent.toFixed(1)}% of your impressions come from mobile devices. Ensure your business profile and website are mobile-optimized.`,
              impact: "medium",
            })
          } else if (deviceSplit.desktopPercent > 70) {
            generatedInsights.push({
              id: "desktop-dominant",
              type: "opportunity",
              category: "Performance",
              title: "Desktop-Dominant Traffic",
              description: `${deviceSplit.desktopPercent.toFixed(1)}% of your impressions come from desktop. Consider mobile optimization to reach more customers.`,
              impact: "medium",
            })
          }

          // Source split insight (Maps vs Search)
          const sourceSplit = getSourceSplit(currentMetrics, start, end)
          if (sourceSplit.mapsPercent > 60) {
            generatedInsights.push({
              id: "maps-dominant",
              type: "positive",
              category: "Visibility",
              title: "Strong Maps Presence",
              description: `${sourceSplit.mapsPercent.toFixed(1)}% of impressions come from Google Maps. Customers are actively searching for your location.`,
              impact: "medium",
            })
          } else if (sourceSplit.searchPercent > 60) {
            generatedInsights.push({
              id: "search-dominant",
              type: "opportunity",
              category: "Visibility",
              title: "Search-Heavy Traffic",
              description: `${sourceSplit.searchPercent.toFixed(1)}% of impressions come from Search. Consider improving your Maps presence with photos and accurate location details.`,
              impact: "medium",
            })
          }

          // Bookings insight
          const bookingsComparison = comparePeriods(
            currentMetrics,
            previousMetrics,
            'BUSINESS_BOOKINGS'
          )
          
          if (bookingsComparison.current > 0) {
            if (bookingsComparison.changePercent > 20) {
              generatedInsights.push({
                id: "bookings-growing",
                type: "positive",
                category: "Performance",
                title: "Bookings Growing",
                description: `Your bookings increased by ${bookingsComparison.changePercent.toFixed(1)}% this month. Great job with your booking strategy!`,
                impact: "high",
              })
            } else if (bookingsComparison.changePercent < -10) {
              generatedInsights.push({
                id: "bookings-declining",
                type: "warning",
                category: "Performance",
                title: "Bookings Declining",
                description: `Your bookings decreased by ${Math.abs(bookingsComparison.changePercent).toFixed(1)}%. Review your booking process and availability.`,
                impact: "high",
              })
            }

            // Bookings rate insight
            const bookingsRate = calculateBookingsRate(currentMetrics, start, end)
            if (bookingsRate > 0 && bookingsRate < 1) {
              generatedInsights.push({
                id: "bookings-rate-low",
                type: "opportunity",
                category: "Performance",
                title: "Improve Bookings Conversion",
                description: `Your booking rate is ${bookingsRate.toFixed(2)}%. Optimize your booking process and make it more prominent in your profile.`,
                impact: "high",
                metrics: {
                  current: bookingsRate,
                  target: 2,
                  unit: "%",
                },
              })
            }
          }

          // Food orders insight
          const foodOrdersComparison = comparePeriods(
            currentMetrics,
            previousMetrics,
            'BUSINESS_FOOD_ORDERS'
          )
          
          if (foodOrdersComparison.current > 0) {
            if (foodOrdersComparison.changePercent > 15) {
              generatedInsights.push({
                id: "food-orders-growing",
                type: "positive",
                category: "Performance",
                title: "Food Orders Growing",
                description: `Your food orders increased by ${foodOrdersComparison.changePercent.toFixed(1)}% this month. Keep promoting your menu!`,
                impact: "medium",
              })
            }
          }
        }
      }

      setInsights(generatedInsights)
    } catch (error) {
      console.error("Error fetching insights:", error)
      toast.error("Failed to load insights")
    } finally {
      setLoading(false)
    }
  }

  const getInsightIcon = (type: Insight["type"]) => {
    switch (type) {
      case "positive":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case "warning":
        return <AlertCircle className="h-5 w-5 text-orange-500" />
      case "opportunity":
        return <Target className="h-5 w-5 text-blue-500" />
    }
  }

  const getInsightColor = (type: Insight["type"]) => {
    switch (type) {
      case "positive":
        return "bg-green-500/10 border-green-500/30"
      case "warning":
        return "bg-orange-500/10 border-orange-500/30"
      case "opportunity":
        return "bg-blue-500/10 border-blue-500/30"
    }
  }

  const getImpactBadge = (impact: Insight["impact"]) => {
    const colors = {
      high: "bg-red-500/20 text-red-500 border-red-500/30",
      medium: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
      low: "bg-blue-500/20 text-blue-500 border-blue-500/30",
    }
    return <Badge variant="outline" className={colors[impact]}>{impact.toUpperCase()}</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
          <Lightbulb className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Business Insights</h2>
          <p className="text-muted-foreground">AI-powered analysis of your Google Business Profile performance</p>
        </div>
      </div>

      {insights.length === 0 ? (
        <Card className="border-primary/30">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Connect your GMB account to see insights</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {insights.map((insight, index) => (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`border ${getInsightColor(insight.type)}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getInsightIcon(insight.type)}
                      <CardTitle className="text-lg">{insight.title}</CardTitle>
                    </div>
                    {getImpactBadge(insight.impact)}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary">{insight.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground/80 mb-4">{insight.description}</p>
                  {insight.metrics && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-semibold">
                          {insight.metrics.current.toFixed(1)}
                          {insight.metrics.unit || ""} / {insight.metrics.target}
                          {insight.metrics.unit || ""}
                        </span>
                      </div>
                      <Progress
                        value={(insight.metrics.current / insight.metrics.target) * 100}
                        className="h-2"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

