'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { format, subDays, eachDayOfInterval } from 'date-fns'

interface Review {
  created_at: string
  rating: number
}

interface ReviewsTrendChartProps {
  reviews: Review[]
}

interface ChartData {
  date: string
  reviews: number
  avgRating: number
}

function generateLast30DaysData(reviews: Review[]): ChartData[] {
  const today = new Date()
  const thirtyDaysAgo = subDays(today, 29)
  
  const days = eachDayOfInterval({ start: thirtyDaysAgo, end: today })
  
  const dataMap = new Map<string, { count: number; totalRating: number }>()
  
  // Initialize all days with zero
  days.forEach(day => {
    const dateKey = format(day, 'yyyy-MM-dd')
    dataMap.set(dateKey, { count: 0, totalRating: 0 })
  })
  
  // Count reviews per day
  reviews.forEach(review => {
    const reviewDate = format(new Date(review.created_at), 'yyyy-MM-dd')
    const data = dataMap.get(reviewDate)
    if (data) {
      data.count++
      data.totalRating += review.rating
    }
  })
  
  // Convert to chart data
  return days.map(day => {
    const dateKey = format(day, 'yyyy-MM-dd')
    const data = dataMap.get(dateKey)!
    return {
      date: format(day, 'MMM dd'),
      reviews: data.count,
      avgRating: data.count > 0 ? Number((data.totalRating / data.count).toFixed(1)) : 0,
    }
  })
}

function calculateTrend(data: ChartData[]) {
  if (data.length < 2) return { trend: 0, isPositive: true }
  
  const lastWeek = data.slice(-7)
  const previousWeek = data.slice(-14, -7)
  
  const lastWeekAvg = lastWeek.reduce((sum, d) => sum + d.reviews, 0) / 7
  const previousWeekAvg = previousWeek.reduce((sum, d) => sum + d.reviews, 0) / 7
  
  const trend = previousWeekAvg > 0 
    ? ((lastWeekAvg - previousWeekAvg) / previousWeekAvg) * 100 
    : 0
  
  return {
    trend: Math.abs(trend),
    isPositive: trend >= 0,
  }
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3">
        <p className="font-medium mb-1">{label}</p>
        <p className="text-sm text-blue-600">
          Reviews: <span className="font-semibold">{payload[0].value}</span>
        </p>
        <p className="text-sm text-green-600">
          Avg Rating: <span className="font-semibold">{payload[1].value}</span>
        </p>
      </div>
    )
  }
  return null
}

export function ReviewsTrendChart({ reviews }: ReviewsTrendChartProps) {
  const chartData = generateLast30DaysData(reviews)
  const { trend, isPositive } = calculateTrend(chartData)
  const totalReviews = reviews.length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Reviews Trend</CardTitle>
            <CardDescription>Last 30 days performance</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isPositive ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600" />
            )}
            <div className="text-right">
              <div className={`text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? '+' : '-'}{trend.toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">vs last week</div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Total Reviews</p>
            <p className="text-2xl font-bold">{totalReviews}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Daily Average</p>
            <p className="text-2xl font-bold">
              {(totalReviews / 30).toFixed(1)}
            </p>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              interval="preserveStartEnd"
            />
            <YAxis 
              yAxisId="left"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis 
              yAxisId="right" 
              orientation="right"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              domain={[0, 5]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="reviews"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              name="Reviews Count"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="avgRating"
              stroke="hsl(142, 76%, 36%)"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              name="Avg Rating"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

