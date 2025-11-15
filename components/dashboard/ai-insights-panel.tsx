'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Target,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DashboardStats {
  totalReviews: number
  averageRating: number
  responseRate: number
  pendingReviews: number
  unansweredQuestions: number
  ratingTrend: number
  reviewsTrend: number
}

export interface AIInsight {
  id: string
  type: 'trend' | 'anomaly' | 'recommendation' | 'prediction' | 'competitor'
  severity: 'low' | 'medium' | 'high'
  title: string
  description: string
  action?: {
    label: string
    link: string
  }
  confidence: number
  timestamp: Date
}

interface AIInsightsPanelProps {
  stats: DashboardStats
  loading?: boolean
  locale?: 'ar' | 'en'
}

export function AIInsightsPanel({ stats, loading = false, locale = 'en' }: AIInsightsPanelProps) {
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [generating, setGenerating] = useState(false)

  // Generate AI insights based on stats
  const generateInsights = useMemo(() => {
    const newInsights: AIInsight[] = []

    // 1. Rating Trend Analysis
    if (stats.ratingTrend < -5) {
      newInsights.push({
        id: 'rating-decline',
        type: 'anomaly',
        severity: 'high',
        title: locale === 'ar' ? 'انخفاض في التقييم' : 'Rating Decline Detected',
        description:
          locale === 'ar'
            ? `انخفض متوسط التقييم بنسبة ${Math.abs(stats.ratingTrend).toFixed(1)}% في الفترة الأخيرة. ينصح بمراجعة المراجعات السلبية الأخيرة.`
            : `Your average rating has declined by ${Math.abs(stats.ratingTrend).toFixed(1)}% recently. Consider reviewing recent negative feedback.`,
        action: {
          label: locale === 'ar' ? 'مراجعة التقييمات' : 'Review Ratings',
          link: '/dashboard/reviews?filter=negative',
        },
        confidence: 0.85,
        timestamp: new Date(),
      })
    } else if (stats.ratingTrend > 5) {
      newInsights.push({
        id: 'rating-improvement',
        type: 'trend',
        severity: 'low',
        title: locale === 'ar' ? 'تحسن في التقييم' : 'Rating Improvement',
        description:
          locale === 'ar'
            ? `ارتفع متوسط التقييم بنسبة ${stats.ratingTrend.toFixed(1)}%! استمر في تقديم خدمة ممتازة.`
            : `Your average rating has improved by ${stats.ratingTrend.toFixed(1)}%! Keep up the great work.`,
        confidence: 0.9,
        timestamp: new Date(),
      })
    }

    // 2. Response Rate Analysis
    if (stats.responseRate < 70) {
      newInsights.push({
        id: 'low-response-rate',
        type: 'recommendation',
        severity: 'medium',
        title: locale === 'ar' ? 'معدل استجابة منخفض' : 'Low Response Rate',
        description:
          locale === 'ar'
            ? `معدل استجابتك ${stats.responseRate.toFixed(0)}%. الرد على المراجعات يحسن ترتيبك في البحث.`
            : `Your response rate is ${stats.responseRate.toFixed(0)}%. Responding to reviews improves your search ranking.`,
        action: {
          label: locale === 'ar' ? 'الرد على المراجعات' : 'Reply to Reviews',
          link: '/dashboard/reviews?filter=pending',
        },
        confidence: 0.95,
        timestamp: new Date(),
      })
    }

    // 3. Pending Reviews Alert
    if (stats.pendingReviews > 10) {
      newInsights.push({
        id: 'pending-reviews',
        type: 'anomaly',
        severity: 'high',
        title: locale === 'ar' ? 'مراجعات معلقة كثيرة' : 'High Pending Reviews',
        description:
          locale === 'ar'
            ? `لديك ${stats.pendingReviews} مراجعة معلقة. الرد السريع يحسن رضا العملاء.`
            : `You have ${stats.pendingReviews} pending reviews. Quick responses improve customer satisfaction.`,
        action: {
          label: locale === 'ar' ? 'الرد الآن' : 'Reply Now',
          link: '/dashboard/reviews?filter=pending',
        },
        confidence: 1.0,
        timestamp: new Date(),
      })
    }

    // 4. Review Volume Prediction
    const predictedReviews = Math.round(stats.totalReviews * (1 + stats.reviewsTrend / 100))
    newInsights.push({
      id: 'review-prediction',
      type: 'prediction',
      severity: 'low',
      title: locale === 'ar' ? 'توقع عدد المراجعات' : 'Review Volume Prediction',
      description:
        locale === 'ar'
          ? `بناءً على الاتجاه الحالي، من المتوقع الحصول على ${predictedReviews} مراجعة الشهر القادم.`
          : `Based on current trends, you're expected to receive ${predictedReviews} reviews next month.`,
      confidence: 0.75,
      timestamp: new Date(),
    })

    // 5. Unanswered Questions Alert
    if (stats.unansweredQuestions > 5) {
      newInsights.push({
        id: 'unanswered-questions',
        type: 'recommendation',
        severity: 'medium',
        title: locale === 'ar' ? 'أسئلة غير مجاب عليها' : 'Unanswered Questions',
        description:
          locale === 'ar'
            ? `لديك ${stats.unansweredQuestions} أسئلة غير مجاب عليها. الإجابة عليها تحسن ثقة العملاء.`
            : `You have ${stats.unansweredQuestions} unanswered questions. Answering them builds customer trust.`,
        action: {
          label: locale === 'ar' ? 'الإجابة الآن' : 'Answer Now',
          link: '/dashboard/questions?filter=unanswered',
        },
        confidence: 0.9,
        timestamp: new Date(),
      })
    }

    // 6. Performance Recommendation
    if (stats.averageRating >= 4.5 && stats.responseRate >= 80) {
      newInsights.push({
        id: 'excellent-performance',
        type: 'trend',
        severity: 'low',
        title: locale === 'ar' ? 'أداء ممتاز' : 'Excellent Performance',
        description:
          locale === 'ar'
            ? 'تقييمك ممتاز ومعدل استجابتك عالي! فكر في طلب المزيد من المراجعات من العملاء الراضين.'
            : 'Your rating is excellent and response rate is high! Consider asking satisfied customers for more reviews.',
        action: {
          label: locale === 'ar' ? 'طلب مراجعات' : 'Request Reviews',
          link: '/dashboard/settings?tab=automation',
        },
        confidence: 0.8,
        timestamp: new Date(),
      })
    }

    // 7. Competitor Comparison (Mock)
    newInsights.push({
      id: 'competitor-comparison',
      type: 'competitor',
      severity: 'low',
      title: locale === 'ar' ? 'مقارنة بالمنافسين' : 'Competitor Comparison',
      description:
        locale === 'ar'
          ? `تقييمك أعلى من 65% من المنافسين في منطقتك. استمر في التميز!`
          : `Your rating is higher than 65% of competitors in your area. Keep up the great work!`,
      confidence: 0.7,
      timestamp: new Date(),
    })

    return newInsights
  }, [stats, locale])

  useEffect(() => {
    setInsights(generateInsights)
  }, [generateInsights])

  const handleRefresh = async () => {
    setGenerating(true)
    // Simulate AI generation delay
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setInsights(generateInsights)
    setGenerating(false)
  }

  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'trend':
        return <TrendingUp className="h-4 w-4" />
      case 'anomaly':
        return <AlertTriangle className="h-4 w-4" />
      case 'recommendation':
        return <Lightbulb className="h-4 w-4" />
      case 'prediction':
        return <Target className="h-4 w-4" />
      case 'competitor':
        return <TrendingDown className="h-4 w-4" />
      default:
        return <Brain className="h-4 w-4" />
    }
  }

  const getSeverityColor = (severity: AIInsight['severity']) => {
    switch (severity) {
      case 'high':
        return 'text-red-500 bg-red-50 dark:bg-red-950'
      case 'medium':
        return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950'
      case 'low':
        return 'text-green-500 bg-green-50 dark:bg-green-950'
      default:
        return 'text-gray-500 bg-gray-50 dark:bg-gray-950'
    }
  }

  const t = {
    title: locale === 'ar' ? 'رؤى الذكاء الاصطناعي' : 'AI Insights',
    description:
      locale === 'ar'
        ? 'تحليلات وتوصيات مدعومة بالذكاء الاصطناعي'
        : 'AI-powered analytics and recommendations',
    refresh: locale === 'ar' ? 'تحديث' : 'Refresh',
    generating: locale === 'ar' ? 'جاري التوليد...' : 'Generating...',
    confidence: locale === 'ar' ? 'الثقة' : 'Confidence',
    noInsights: locale === 'ar' ? 'لا توجد رؤى متاحة' : 'No insights available',
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            {t.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              {t.title}
              <Sparkles className="h-4 w-4 text-yellow-500" />
            </CardTitle>
            <CardDescription>{t.description}</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={generating}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', generating && 'animate-spin')} />
            {generating ? t.generating : t.refresh}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          {insights.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Brain className="h-12 w-12 mb-4" />
              <p>{t.noInsights}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className={cn(
                    'p-4 rounded-lg border transition-all hover:shadow-md',
                    getSeverityColor(insight.severity)
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">{getInsightIcon(insight.type)}</div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm">{insight.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {t.confidence}: {(insight.confidence * 100).toFixed(0)}%
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{insight.description}</p>
                      {insight.action && (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-primary"
                          onClick={() => {
                            window.location.href = insight.action!.link
                          }}
                        >
                          {insight.action.label} →
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

