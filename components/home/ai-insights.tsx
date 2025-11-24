'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  Target,
  ArrowRight,
  Brain,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link } from '@/lib/navigation'
import { motion } from 'framer-motion'

interface Insight {
  id: string
  type: 'recommendation' | 'alert' | 'tip' | 'success'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  actionText?: string
  actionUrl?: string
  impact?: string
}

interface AIInsightsProps {
  insights: Insight[]
}

export function AIInsights({ insights }: AIInsightsProps) {
  const t = useTranslations('home.aiInsights')

  const getInsightIcon = (type: Insight['type']) => {
    switch (type) {
      case 'recommendation':
        return Lightbulb
      case 'alert':
        return AlertCircle
      case 'tip':
        return Target
      case 'success':
        return CheckCircle2
      default:
        return Sparkles
    }
  }

  const getInsightStyle = (type: Insight['type'], priority: Insight['priority']) => {
    if (type === 'alert' && priority === 'high') {
      return {
        border: 'border-red-500/50',
        bg: 'bg-red-500/5',
        icon: 'text-red-500',
        iconBg: 'bg-red-500/10',
        badge: 'bg-red-500/20 text-red-700 dark:text-red-300',
      }
    }

    if (type === 'recommendation' && priority === 'high') {
      return {
        border: 'border-primary/50',
        bg: 'bg-primary/5',
        icon: 'text-primary',
        iconBg: 'bg-primary/10',
        badge: 'bg-primary/20 text-primary',
      }
    }

    if (type === 'success') {
      return {
        border: 'border-green-500/50',
        bg: 'bg-green-500/5',
        icon: 'text-green-500',
        iconBg: 'bg-green-500/10',
        badge: 'bg-green-500/20 text-green-700 dark:text-green-300',
      }
    }

    return {
      border: 'border-border/50',
      bg: 'bg-accent/50',
      icon: 'text-muted-foreground',
      iconBg: 'bg-muted/50',
      badge: 'bg-muted text-muted-foreground',
    }
  }

  const getPriorityLabel = (priority: Insight['priority']) => {
    switch (priority) {
      case 'high':
        return t('priority.high')
      case 'medium':
        return t('priority.medium')
      case 'low':
        return t('priority.low')
      default:
        return ''
    }
  }

  if (insights.length === 0) {
    return (
      <Card className="border-border/40">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{t('title')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm text-muted-foreground text-center">{t('empty')}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="ai-insights"
    >
      <Card className="border-border/40 relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-orange-500/5 to-transparent opacity-50" />

        <CardHeader className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.div
                className="p-2 rounded-lg bg-primary/10"
                animate={{
                  boxShadow: [
                    '0 0 0 0 rgba(249, 115, 22, 0)',
                    '0 0 0 8px rgba(249, 115, 22, 0.1)',
                    '0 0 0 0 rgba(249, 115, 22, 0)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Brain className="h-5 w-5 text-primary" />
              </motion.div>
              <div>
                <CardTitle className="text-lg">{t('title')}</CardTitle>
                <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
              </div>
            </div>
            <Badge variant="secondary" className="gap-1">
              <TrendingUp className="h-3 w-3" />
              {insights.length} {t('insights')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 relative z-10">
          {insights.map((insight, index) => {
            const Icon = getInsightIcon(insight.type)
            const style = getInsightStyle(insight.type, insight.priority)
            const isHighPriority = insight.priority === 'high'

            return (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ scale: 1.02, x: 5 }}
              >
                <div
                  className={`insight-card p-4 rounded-lg border ${style.border} ${style.bg} hover:shadow-md transition-all group relative overflow-hidden`}
                >
                  {/* Pulse effect for high priority */}
                  {isHighPriority && (
                    <motion.div
                      className="absolute inset-0 border-2 border-orange-500/20 rounded-lg"
                      animate={{
                        opacity: [0.5, 1, 0.5],
                        scale: [1, 1.02, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                  )}
                  <div className="flex gap-3">
                    {/* Icon */}
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-lg ${style.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform`}
                    >
                      <Icon className={`h-5 w-5 ${style.icon}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-semibold text-sm">{insight.title}</h4>
                        {insight.priority !== 'low' && (
                          <Badge className={`${style.badge} text-xs flex-shrink-0`}>
                            {getPriorityLabel(insight.priority)}
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>

                      {/* Impact Badge */}
                      {insight.impact && (
                        <div className="flex items-center gap-2 mb-3">
                          <TrendingUp className="h-3 w-3 text-green-500" />
                          <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                            {t('impact')}: {insight.impact}
                          </span>
                        </div>
                      )}

                      {/* Action Button */}
                      {insight.actionText && insight.actionUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs mt-2 hover:bg-primary/10"
                          asChild
                        >
                          <Link href={insight.actionUrl}>
                            {insight.actionText}
                            <ArrowRight className="ml-1 h-3 w-3" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}

          {/* View All Button */}
          <div className="pt-4 border-t border-border/50">
            <Button variant="outline" className="w-full gap-2" asChild>
              <Link href="/ai-command-center">
                <Sparkles className="h-4 w-4" />
                {t('viewAll')}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
