'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Star, MessageSquare, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { motion } from 'framer-motion';

interface PerformanceData {
  month: string;
  reviews: number;
  rating: number;
  questions: number;
}

interface PerformanceComparisonChartProps {
  currentMonthData: {
    reviews: number;
    rating: number;
    questions: number;
  };
  previousMonthData: {
    reviews: number;
    rating: number;
    questions: number;
  };
  loading?: boolean;
  locale?: string;
}

export function PerformanceComparisonChart({
  currentMonthData,
  previousMonthData,
  loading = false,
  locale = 'en'
}: PerformanceComparisonChartProps) {
  const isArabic = locale === 'ar';

  // تحضير البيانات للمخطط
  const chartData: PerformanceData[] = [
    {
      month: isArabic ? 'الفترة السابقة' : 'Previous Period',
      reviews: previousMonthData.reviews,
      rating: previousMonthData.rating * 20, // تحويل من 5 إلى 100 للتناسق
      questions: previousMonthData.questions,
    },
    {
      month: isArabic ? 'هذه الفترة' : 'This Period',
      reviews: currentMonthData.reviews,
      rating: currentMonthData.rating * 20,
      questions: currentMonthData.questions,
    },
  ];

  // حساب التغيرات النسبية
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const reviewsChange = calculateChange(currentMonthData.reviews, previousMonthData.reviews);
  const ratingChange = calculateChange(currentMonthData.rating, previousMonthData.rating);
  const questionsChange = calculateChange(currentMonthData.questions, previousMonthData.questions);

  const metrics = [
    {
      label: isArabic ? 'المراجعات' : 'Reviews',
      icon: MessageSquare,
      current: currentMonthData.reviews,
      change: reviewsChange,
      color: 'text-info',
      bgColor: 'bg-info/10'
    },
    {
      label: isArabic ? 'التقييم' : 'Rating',
      icon: Star,
      current: currentMonthData.rating.toFixed(1),
      change: ratingChange,
      color: 'text-warning',
      bgColor: 'bg-warning/10'
    },
    {
      label: isArabic ? 'الأسئلة' : 'Questions',
      icon: HelpCircle,
      current: currentMonthData.questions,
      change: questionsChange,
      color: 'text-purple-600',
      bgColor: 'bg-purple-500/10'
    },
  ];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{isArabic ? 'مقارنة الأداء' : 'Performance Comparison'}</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">
            {isArabic ? 'جاري التحميل...' : 'Loading...'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          {isArabic ? 'مقارنة الأداء' : 'Performance Comparison'}
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {isArabic 
            ? 'مقارنة البيانات بين الشهر الحالي والشهر السابق'
            : 'Compare this month vs last month performance'
          }
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* المقاييس السريعة */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            const isPositive = metric.change >= 0;
            
            return (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn("p-3 rounded-lg", metric.bgColor)}
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className={cn("w-4 h-4", metric.color)} />
                  {isPositive ? (
                    <TrendingUp className="w-4 h-4 text-success" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-destructive" />
                  )}
                </div>
                <div className="text-2xl font-bold">{metric.current}</div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-muted-foreground">{metric.label}</span>
                  <span className={cn(
                    "text-xs font-medium",
                    isPositive ? "text-green-600" : "text-red-600"
                  )}>
                    {isPositive ? '+' : ''}{metric.change.toFixed(1)}%
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* المخطط البياني */}
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorReviews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorRating" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorQuestions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
              <XAxis 
                dataKey="month" 
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                stroke="#4b5563"
              />
              <YAxis 
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                stroke="#4b5563"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#f9fafb'
                }}
                labelStyle={{ color: '#f9fafb', fontWeight: 'bold' }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
              />
              <Area
                type="monotone"
                dataKey="reviews"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorReviews)"
                name={isArabic ? 'المراجعات' : 'Reviews'}
              />
              <Area
                type="monotone"
                dataKey="rating"
                stroke="#eab308"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRating)"
                name={isArabic ? 'التقييم (من 100)' : 'Rating (out of 100)'}
              />
              <Area
                type="monotone"
                dataKey="questions"
                stroke="#a855f7"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorQuestions)"
                name={isArabic ? 'الأسئلة' : 'Questions'}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
