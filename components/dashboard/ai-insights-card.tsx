'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, TrendingUp, AlertCircle, CheckCircle2, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface AIInsight {
  type: 'positive' | 'warning' | 'info' | 'action';
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface AIInsightsCardProps {
  stats: {
    totalReviews: number;
    averageRating: number;
    responseRate: number;
    pendingReviews: number;
    unansweredQuestions: number;
    ratingTrend: number;
    reviewsTrend: number;
  };
  loading?: boolean;
  locale?: string;
}

export function AIInsightsCard({ stats, loading = false, locale = 'en' }: AIInsightsCardProps) {
  const isArabic = locale === 'ar';

  // Generate AI insights based on stats
  const generateInsights = (): AIInsight[] => {
    const insights: AIInsight[] = [];

    // 1. Rating Trend Insight
    if (stats.ratingTrend > 5) {
      insights.push({
        type: 'positive',
        title: isArabic ? 'تحسن ملحوظ في التقييم' : 'Rating Trending Up',
        description: isArabic
          ? `تقييمك ارتفع بنسبة ${stats.ratingTrend.toFixed(1)}%! استمر في تقديم خدمة ممتازة.`
          : `Your rating increased by ${stats.ratingTrend.toFixed(1)}%! Keep up the great service.`,
        icon: <TrendingUp className="w-4 h-4" />
      });
    } else if (stats.ratingTrend < -5) {
      insights.push({
        type: 'warning',
        title: isArabic ? 'انخفاض في التقييم' : 'Rating Declining',
        description: isArabic
          ? `تقييمك انخفض بنسبة ${Math.abs(stats.ratingTrend).toFixed(1)}%. راجع المراجعات السلبية وحسّن خدمتك.`
          : `Rating dropped by ${Math.abs(stats.ratingTrend).toFixed(1)}%. Review negative feedback and improve service.`,
        icon: <AlertCircle className="w-4 h-4" />
      });
    }

    // 2. Response Rate Insight
    if (stats.responseRate >= 90) {
      insights.push({
        type: 'positive',
        title: isArabic ? 'معدل استجابة ممتاز' : 'Excellent Response Rate',
        description: isArabic
          ? `معدل الاستجابة ${stats.responseRate.toFixed(0)}% - أنت تتفاعل بشكل رائع مع عملائك!`
          : `${stats.responseRate.toFixed(0)}% response rate - You're engaging well with customers!`,
        icon: <CheckCircle2 className="w-4 h-4" />
      });
    } else if (stats.responseRate < 50 && stats.pendingReviews > 5) {
      insights.push({
        type: 'action',
        title: isArabic ? 'حسّن معدل الاستجابة' : 'Improve Response Rate',
        description: isArabic
          ? `${stats.pendingReviews} مراجعة بدون رد. الرد السريع يزيد من ثقة العملاء بنسبة 70%.`
          : `${stats.pendingReviews} reviews unanswered. Quick replies increase customer trust by 70%.`,
        icon: <Lightbulb className="w-4 h-4" />
      });
    }

    // 3. Reviews Growth Insight
    if (stats.reviewsTrend > 20) {
      insights.push({
        type: 'positive',
        title: isArabic ? 'نمو قوي في المراجعات' : 'Strong Review Growth',
        description: isArabic
          ? `المراجعات زادت بنسبة ${stats.reviewsTrend.toFixed(0)}%! عملاؤك يتفاعلون أكثر.`
          : `Reviews increased by ${stats.reviewsTrend.toFixed(0)}%! Customers are engaging more.`,
        icon: <TrendingUp className="w-4 h-4" />
      });
    } else if (stats.reviewsTrend < -20 && stats.totalReviews > 20) {
      insights.push({
        type: 'info',
        title: isArabic ? 'انخفاض في المراجعات' : 'Review Activity Slowing',
        description: isArabic
          ? 'شجع عملاءك على ترك مراجعات بعد كل خدمة لزيادة الظهور.'
          : 'Encourage customers to leave reviews after service to boost visibility.',
        icon: <Lightbulb className="w-4 h-4" />
      });
    }

    // 4. Questions Insight
    if (stats.unansweredQuestions > 0) {
      insights.push({
        type: 'action',
        title: isArabic ? 'أسئلة تنتظر الإجابة' : 'Questions Need Answers',
        description: isArabic
          ? `${stats.unansweredQuestions} ${stats.unansweredQuestions === 1 ? 'سؤال ينتظر' : 'أسئلة تنتظر'} الإجابة. الإجابة السريعة تزيد التحويلات بنسبة 45%.`
          : `${stats.unansweredQuestions} ${stats.unansweredQuestions === 1 ? 'question awaits' : 'questions await'} your response. Quick answers boost conversions by 45%.`,
        icon: <AlertCircle className="w-4 h-4" />
      });
    }

    // 5. High Performance Insight
    if (stats.averageRating >= 4.5 && stats.responseRate >= 80) {
      insights.push({
        type: 'positive',
        title: isArabic ? 'أداء استثنائي' : 'Outstanding Performance',
        description: isArabic
          ? 'تقييمك العالي ومعدل استجابتك الممتاز يضعانك ضمن أفضل 10% من الأعمال!'
          : 'Your high rating and response rate put you in the top 10% of businesses!',
        icon: <Sparkles className="w-4 h-4" />
      });
    }

    // Default insight if no specific ones
    if (insights.length === 0) {
      insights.push({
        type: 'info',
        title: isArabic ? 'استمر في التحسين' : 'Keep Improving',
        description: isArabic
          ? 'حافظ على جودة خدمتك وتفاعلك مع العملاء لتحقيق نمو مستدام.'
          : 'Maintain service quality and customer engagement for sustainable growth.',
        icon: <Lightbulb className="w-4 h-4" />
      });
    }

    return insights.slice(0, 3); // عرض أقصى 3 insights
  };

  const insights = generateInsights();

  const typeConfig = {
    positive: {
      bgColor: 'bg-success/10',
      borderColor: 'border-success/30',
      textColor: 'text-success',
      iconBg: 'bg-success/20'
    },
    warning: {
      bgColor: 'bg-warning/10',
      borderColor: 'border-warning/30',
      textColor: 'text-warning',
      iconBg: 'bg-warning/20'
    },
    info: {
      bgColor: 'bg-info/10',
      borderColor: 'border-info/30',
      textColor: 'text-info',
      iconBg: 'bg-info/20'
    },
    action: {
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/30',
      textColor: 'text-primary',
      iconBg: 'bg-primary/20'
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {isArabic ? 'رؤى الذكاء الاصطناعي' : 'AI Insights'}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[250px] p-6">
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="mt-4 space-y-3">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          {isArabic ? 'رؤى الذكاء الاصطناعي' : 'AI Insights'}
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {isArabic 
            ? 'توصيات ذكية مبنية على تحليل بياناتك'
            : 'Smart recommendations based on your data analysis'
          }
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight, index) => {
          const config = typeConfig[insight.type];
          
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "p-4 rounded-lg border-2",
                config.bgColor,
                config.borderColor
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "p-2 rounded-lg flex-shrink-0",
                  config.iconBg,
                  config.textColor
                )}>
                  {insight.icon}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className={cn("font-semibold text-sm mb-1", config.textColor)}>
                    {insight.title}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {insight.description}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}

        <div className="mt-4 pt-3 border-t border-muted flex items-center justify-center">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            {isArabic 
              ? 'يتم التحديث تلقائياً بناءً على أحدث البيانات'
              : 'Auto-updated based on latest data'
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
