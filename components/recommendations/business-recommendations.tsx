'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Link } from '@/lib/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { MapPin, MessageSquare, Sparkles, Target, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface Recommendation {
  id: string
  type: 'post' | 'review' | 'profile' | 'engagement'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  action: string
  actionLink?: string
  category?: string
}

export function BusinessRecommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  if (!supabase) {
    throw new Error('Failed to initialize Supabase client')
  }

  useEffect(() => {
    fetchRecommendations()
  }, [])

  const fetchRecommendations = async () => {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Get active GMB accounts
      const { data: accounts } = await supabase
        .from('gmb_accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (!accounts || accounts.length === 0) {
        setLoading(false)
        return
      }

      const accountIds = accounts.map((a) => a.id)

      // Get locations data
      const { data: locations, error: locationsError } = await supabase
        .from('gmb_locations')
        .select('id, category, rating, review_count, location_name')
        .eq('user_id', user.id)
        .in('gmb_account_id', accountIds)

      if (locationsError) {
        console.error('Error fetching locations:', locationsError)
        setRecommendations([])
        setLoading(false)
        return
      }

      // Get posts data
      const locationIds = locations?.map((l: { id: string }) => l.id).filter(Boolean) || []
      const { data: posts, error: postsError } =
        locationIds.length > 0
          ? await supabase
              .from('gmb_posts')
              .select('created_at, post_type')
              .eq('user_id', user.id)
              .in('location_id', locationIds)
          : { data: null, error: null }

      if (postsError) {
        console.error('Error fetching posts:', postsError)
      }

      // Get reviews data
      const { data: reviews, error: reviewsError } =
        locationIds.length > 0
          ? await supabase
              .from('gmb_reviews')
              .select('rating, reply_text, review_reply, created_at')
              .eq('user_id', user.id)
              .in('location_id', locationIds)
          : { data: null, error: null }

      if (reviewsError) {
        console.error('Error fetching reviews:', reviewsError)
      }

      // Get performance metrics (last 30 days vs previous 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const sixtyDaysAgo = new Date()
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

      const { data: currentMetrics, error: currentMetricsError } =
        locationIds.length > 0
          ? await supabase
              .from('gmb_performance_metrics')
              .select('metric_type, metric_value, location_id')
              .eq('user_id', user.id)
              .in('location_id', locationIds)
              .gte('metric_date', thirtyDaysAgo.toISOString().split('T')[0])
          : { data: null, error: null }

      const { data: previousMetrics, error: previousMetricsError } =
        locationIds.length > 0
          ? await supabase
              .from('gmb_performance_metrics')
              .select('metric_type, metric_value, location_id')
              .eq('user_id', user.id)
              .in('location_id', locationIds)
              .gte('metric_date', sixtyDaysAgo.toISOString().split('T')[0])
              .lt('metric_date', thirtyDaysAgo.toISOString().split('T')[0])
          : { data: null, error: null }

      if (currentMetricsError) {
        console.error('Error fetching current metrics:', currentMetricsError)
      }
      if (previousMetricsError) {
        console.error('Error fetching previous metrics:', previousMetricsError)
      }

      // Get search keywords
      const { data: searchKeywords, error: keywordsError } =
        locationIds.length > 0
          ? await supabase
              .from('gmb_search_keywords')
              .select('search_keyword, impressions_count')
              .eq('user_id', user.id)
              .in('location_id', locationIds)
              .order('impressions_count', { ascending: false })
              .limit(20)
          : { data: null, error: null }

      if (keywordsError) {
        console.error('Error fetching search keywords:', keywordsError)
      }

      const generatedRecommendations: Recommendation[] = []

      // Post recommendations
      if (posts && Array.isArray(posts)) {
        const recentPosts = posts.filter((p: { created_at?: string }) => {
          if (!p || !p.created_at) return false
          const postDate = new Date(p.created_at)
          if (isNaN(postDate.getTime())) return false
          const daysDiff = (Date.now() - postDate.getTime()) / (1000 * 60 * 60 * 24)
          return daysDiff <= 30
        }).length

        if (recentPosts === 0) {
          generatedRecommendations.push({
            id: 'create-post',
            type: 'post',
            priority: 'high',
            title: 'Create Your First Post',
            description:
              'Posts help keep your business visible and engage with customers. Share updates, offers, or events.',
            action: 'Create Post',
            actionLink: '/posts',
            category: 'Content',
          })
        } else if (recentPosts < 2) {
          generatedRecommendations.push({
            id: 'increase-posts',
            type: 'post',
            priority: 'medium',
            title: 'Post More Regularly',
            description: `You've posted ${recentPosts} times in the last 30 days. Regular posts (weekly) improve visibility and engagement.`,
            action: 'Create Post',
            actionLink: '/posts',
            category: 'Content',
          })
        }
      }

      // Review response recommendations
      if (reviews && Array.isArray(reviews) && reviews.length > 0) {
        // Check for unresponded reviews using both reply_text and review_reply for compatibility
        const unrespondedReviews = reviews.filter(
          (r: { reply_text?: string; review_reply?: string }) => {
            return !(r.reply_text || r.review_reply)
          },
        ).length

        if (unrespondedReviews > 0) {
          generatedRecommendations.push({
            id: 'respond-reviews',
            type: 'review',
            priority: 'high',
            title: 'Respond to Unanswered Reviews',
            description: `You have ${unrespondedReviews} review${unrespondedReviews > 1 ? 's' : ''} without responses. Quick responses show you care and improve ratings.`,
            action: 'View Reviews',
            actionLink: '/reviews',
            category: 'Engagement',
          })
        }

        // Negative review responses
        const negativeUnresponded = reviews.filter(
          (r: { rating?: number; reply_text?: string; review_reply?: string }) => {
            const rating = r.rating || 0
            return rating <= 2 && !(r.reply_text || r.review_reply)
          },
        ).length
        if (negativeUnresponded > 0) {
          generatedRecommendations.push({
            id: 'respond-negative',
            type: 'review',
            priority: 'high',
            title: 'Address Negative Reviews',
            description: `${negativeUnresponded} negative review${negativeUnresponded > 1 ? 's' : ''} need your attention. Professional responses can turn unhappy customers around.`,
            action: 'Respond Now',
            actionLink: '/reviews',
            category: 'Reputation',
          })
        }
      }

      // Profile optimization
      if (locations && Array.isArray(locations) && locations.length > 0) {
        const categories = new Set(
          locations.map((l: { category?: string }) => l?.category).filter(Boolean),
        )
        const hasMultipleCategories = categories.size > 1

        if (hasMultipleCategories) {
          generatedRecommendations.push({
            id: 'optimize-categories',
            type: 'profile',
            priority: 'medium',
            title: 'Optimize Business Categories',
            description:
              'Ensure each location has the most relevant primary category to improve search visibility.',
            action: 'Update Categories',
            actionLink: '/locations',
            category: 'SEO',
          })
        }

        // Check for locations with low review counts
        const lowReviewLocations = locations.filter((l: { review_count?: number }) => {
          return (l.review_count || 0) < 5
        }).length
        if (lowReviewLocations > 0) {
          generatedRecommendations.push({
            id: 'encourage-reviews',
            type: 'engagement',
            priority: 'medium',
            title: 'Encourage More Reviews',
            description: `${lowReviewLocations} location${lowReviewLocations > 1 ? 's have' : ' has'} fewer than 5 reviews. More reviews improve local SEO and trust.`,
            action: 'Learn How',
            category: 'Growth',
          })
        }
      }

      // Performance metrics recommendations
      if (
        currentMetrics &&
        Array.isArray(currentMetrics) &&
        previousMetrics &&
        Array.isArray(previousMetrics)
      ) {
        // Calculate total impressions
        type MetricRecord = { metric_type?: string; metric_value?: number; location_id?: string }
        const currentImpressions = currentMetrics
          .filter(
            (m: MetricRecord) =>
              m && (m.metric_type === 'QUERIES_DIRECT' || m.metric_type === 'QUERIES_INDIRECT'),
          )
          .reduce((sum: number, m: MetricRecord) => sum + (Number(m.metric_value) || 0), 0)

        const previousImpressions = previousMetrics
          .filter(
            (m: MetricRecord) =>
              m && (m.metric_type === 'QUERIES_DIRECT' || m.metric_type === 'QUERIES_INDIRECT'),
          )
          .reduce((sum: number, m: MetricRecord) => sum + (Number(m.metric_value) || 0), 0)

        if (previousImpressions > 0 && currentImpressions < previousImpressions * 0.8) {
          const declinePercent = ((1 - currentImpressions / previousImpressions) * 100).toFixed(0)
          generatedRecommendations.push({
            id: 'impressions-decline',
            type: 'engagement',
            priority: 'high',
            title: 'Impressions Declining',
            description: `Your impressions dropped by ${declinePercent}% compared to last month. Consider posting more frequently and optimizing your profile.`,
            action: 'View Analytics',
            actionLink: '/analytics',
            category: 'Performance',
          })
        }

        // Calculate clicks
        const currentClicks = currentMetrics
          .filter(
            (m: MetricRecord) =>
              m &&
              (m.metric_type === 'ACTIONS_WEBSITE' ||
                m.metric_type === 'ACTIONS_PHONE' ||
                m.metric_type === 'ACTIONS_DRIVING_DIRECTIONS'),
          )
          .reduce((sum: number, m: MetricRecord) => sum + (Number(m.metric_value) || 0), 0)

        const previousClicks = previousMetrics
          .filter(
            (m: MetricRecord) =>
              m &&
              (m.metric_type === 'ACTIONS_WEBSITE' ||
                m.metric_type === 'ACTIONS_PHONE' ||
                m.metric_type === 'ACTIONS_DRIVING_DIRECTIONS'),
          )
          .reduce((sum: number, m: MetricRecord) => sum + (Number(m.metric_value) || 0), 0)

        if (previousClicks > 0 && currentClicks < previousClicks * 0.7) {
          generatedRecommendations.push({
            id: 'clicks-decline',
            type: 'engagement',
            priority: 'high',
            title: 'Click-Through Rate Dropping',
            description:
              'Your click-through rate has decreased. Ensure your business profile is complete and engaging.',
            action: 'Optimize Profile',
            actionLink: '/locations',
            category: 'Performance',
          })
        }

        // Check for low conversion rate (clicks vs impressions)
        if (currentImpressions > 0 && currentClicks > 0) {
          const conversionRate = (currentClicks / currentImpressions) * 100
          if (conversionRate < 2) {
            generatedRecommendations.push({
              id: 'low-conversion',
              type: 'engagement',
              priority: 'medium',
              title: 'Improve Conversion Rate',
              description: `Your conversion rate is ${conversionRate.toFixed(1)}%. Optimize your profile, add more photos, and ensure your hours and contact info are up to date.`,
              action: 'Update Profile',
              actionLink: '/locations',
              category: 'Performance',
            })
          }
        }
      }

      // Search keywords recommendations
      if (searchKeywords && Array.isArray(searchKeywords) && searchKeywords.length > 0) {
        const topKeywords = searchKeywords.slice(0, 5)
        type KeywordRecord = { impressions_count?: number; search_keyword?: string }
        const hasLowImpressions = topKeywords.some((k: KeywordRecord) => {
          return k && (Number(k.impressions_count) || 0) < 10
        })

        if (hasLowImpressions) {
          const keywordNames = topKeywords
            .filter((k: KeywordRecord) => k && k.search_keyword)
            .slice(0, 3)
            .map((k: KeywordRecord) => k.search_keyword)
            .join(', ')

          if (keywordNames) {
            generatedRecommendations.push({
              id: 'optimize-seo',
              type: 'profile',
              priority: 'medium',
              title: 'Optimize for Search Keywords',
              description: `Your top search keywords have low impressions. Consider optimizing your business profile with relevant keywords and creating content around these terms: ${keywordNames}.`,
              action: 'View Keywords',
              actionLink: '/analytics',
              category: 'SEO',
            })
          }
        }

        // Check if there are keyword opportunities
        if (topKeywords.length < 5) {
          generatedRecommendations.push({
            id: 'expand-keywords',
            type: 'profile',
            priority: 'low',
            title: 'Expand Your SEO Strategy',
            description:
              'You have limited search keyword visibility. Create posts and update your profile with industry-specific terms to improve discoverability.',
            action: 'Learn More',
            category: 'SEO',
          })
        }
      }

      // Location comparison recommendations
      if (
        locations &&
        Array.isArray(locations) &&
        locations.length > 1 &&
        currentMetrics &&
        Array.isArray(currentMetrics) &&
        currentMetrics.length > 0
      ) {
        // Group metrics by location
        const locationMetrics: Record<string, number> = {}
        type MetricItem = { metric_type?: string; metric_value?: number; location_id?: string }
        currentMetrics.forEach((m: MetricItem) => {
          if (
            m &&
            m.location_id &&
            (m.metric_type === 'QUERIES_DIRECT' || m.metric_type === 'QUERIES_INDIRECT')
          ) {
            const locationId = m.location_id
            locationMetrics[locationId] =
              (locationMetrics[locationId] || 0) + (Number(m.metric_value) || 0)
          }
        })

        if (Object.keys(locationMetrics).length > 1) {
          const sortedLocations = Object.entries(locationMetrics).sort(([, a], [, b]) => b - a)
          const highest = sortedLocations[0]
          const lowest = sortedLocations[sortedLocations.length - 1]

          if (highest[1] > 0 && lowest[1] < highest[1] * 0.3) {
            const lowLocation = locations.find(
              (l: { id: string; location_name?: string }) => l && l.id === lowest[0],
            )
            if (lowLocation && lowLocation.location_name) {
              generatedRecommendations.push({
                id: 'location-performance',
                type: 'profile',
                priority: 'medium',
                title: 'Location Performance Gap',
                description: `${lowLocation.location_name} has significantly lower impressions than your best-performing location. Consider optimizing its profile or location-specific content.`,
                action: 'View Location',
                actionLink: `/locations`,
                category: 'Performance',
              })
            }
          }
        }
      }

      // Seasonal recommendations
      const currentMonth = new Date().getMonth()
      const isHolidaySeason = currentMonth === 11 || currentMonth === 0 // December or January
      if (isHolidaySeason) {
        generatedRecommendations.push({
          id: 'holiday-content',
          type: 'post',
          priority: 'low',
          title: 'Create Holiday-Themed Posts',
          description:
            'Holiday posts attract more attention and engagement. Share special offers or seasonal greetings.',
          action: 'Create Post',
          actionLink: '/posts',
          category: 'Content',
        })
      }

      setRecommendations(generatedRecommendations.slice(0, 10)) // Limit to 10 recommendations
    } catch (error) {
      console.error('Error fetching recommendations:', error)
      toast.error('Failed to load recommendations')
    } finally {
      setLoading(false)
    }
  }

  const getRecommendationIcon = (type: Recommendation['type']) => {
    switch (type) {
      case 'post':
        return <Sparkles className="h-5 w-5 text-purple-500" />
      case 'review':
        return <MessageSquare className="h-5 w-5 text-blue-500" />
      case 'profile':
        return <MapPin className="h-5 w-5 text-green-500" />
      case 'engagement':
        return <TrendingUp className="h-5 w-5 text-orange-500" />
    }
  }

  const getPriorityBadge = (priority: Recommendation['priority']) => {
    const colors = {
      high: 'bg-red-500/20 text-red-500 border-red-500/30',
      medium: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
      low: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
    }
    return (
      <Badge variant="outline" className={colors[priority]}>
        {priority.toUpperCase()}
      </Badge>
    )
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
          <Target className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">AI Recommendations</h2>
          <p className="text-muted-foreground">
            Actionable suggestions to improve your business presence
          </p>
        </div>
      </div>

      {recommendations.length === 0 ? (
        <Card className="border-primary/30">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Connect your GMB account to get personalized recommendations</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {recommendations.map((rec, index) => (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="border-primary/30 hover:border-primary/50 transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getRecommendationIcon(rec.type)}
                      <CardTitle className="text-lg">{rec.title}</CardTitle>
                    </div>
                    {getPriorityBadge(rec.priority)}
                  </div>
                  {rec.category && (
                    <Badge variant="secondary" className="mt-2 w-fit">
                      {rec.category}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4">{rec.description}</CardDescription>
                  {rec.actionLink ? (
                    <Link href={rec.actionLink}>
                      <Button size="sm" className="w-full">
                        {rec.action}
                      </Button>
                    </Link>
                  ) : (
                    <Button size="sm" variant="outline" className="w-full">
                      {rec.action}
                    </Button>
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
