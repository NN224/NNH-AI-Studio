'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { MessageSquare } from 'lucide-react'
import { format, subDays, eachWeekOfInterval, startOfWeek, endOfWeek } from 'date-fns'

interface Review {
  created_at: string
  has_reply?: boolean
  review_reply?: string
  replied_at?: string
}

interface ResponseRateChartProps {
  reviews: Review[]
}

interface ChartData {
  week: string
  responseRate: number
  responded: number
  total: number
}

function generateWeeklyResponseData(reviews: Review[]): ChartData[] {
  const today = new Date()
  const twelveWeeksAgo = subDays(today, 84) // ~12 weeks
  
  const weeks = eachWeekOfInterval(
    { start: twelveWeeksAgo, end: today },
    { weekStartsOn: 1 } // Monday
  )
  
  return weeks.map(weekStart => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
    
    const weekReviews = reviews.filter(review => {
      const reviewDate = new Date(review.created_at)
      return reviewDate >= weekStart && reviewDate <= weekEnd
    })
    
    const responded = weekReviews.filter(r => r.has_reply || r.review_reply).length
    const total = weekReviews.length
    const responseRate = total > 0 ? (responded / total) * 100 : 0
    
    return {
      week: format(weekStart, 'MMM dd'),
      responseRate: Number(responseRate.toFixed(1)),
      responded,
      total,
    }
  })
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3">
        <p className="font-medium mb-2">Week of {label}</p>
        <p className="text-sm text-primary">
          Response Rate: <span className="font-semibold">{data.responseRate}%</span>
        </p>
        <p className="text-sm text-muted-foreground">
          {data.responded} of {data.total} reviews responded
        </p>
      </div>
    )
  }
  return null
}

export function ResponseRateChart({ reviews }: ResponseRateChartProps) {
  const chartData = generateWeeklyResponseData(reviews)
  
  // Calculate overall response rate
  const totalReviews = reviews.length
  const respondedReviews = reviews.filter(r => r.has_reply || r.review_reply).length
  const overallRate = totalReviews > 0 
    ? ((respondedReviews / totalReviews) * 100).toFixed(1)
    : '0.0'
  
  // Calculate trend
  const recentWeeks = chartData.slice(-4)
  const olderWeeks = chartData.slice(-8, -4)
  
  const recentAvg = recentWeeks.reduce((sum, w) => sum + w.responseRate, 0) / recentWeeks.length
  const olderAvg = olderWeeks.reduce((sum, w) => sum + w.responseRate, 0) / olderWeeks.length
  
  const trend = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0
  const isImproving = trend >= 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Response Rate Over Time</CardTitle>
            <CardDescription>Weekly response performance</CardDescription>
          </div>
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Overall Rate</p>
            <p className="text-2xl font-bold">{overallRate}%</p>
          </div>
          <div>
            <p className="text-muted-foreground">Responded</p>
            <p className="text-2xl font-bold">{respondedReviews}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Trend</p>
            <p className={`text-2xl font-bold ${isImproving ? 'text-green-600' : 'text-red-600'}`}>
              {isImproving ? '+' : ''}{trend.toFixed(1)}%
            </p>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorResponseRate" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="week" 
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="responseRate"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorResponseRate)"
            />
          </AreaChart>
        </ResponsiveContainer>

        <div className="mt-4 p-3 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">
            💡 <span className="font-medium">Tip:</span> Maintaining a response rate above 80% 
            helps improve your business reputation and customer satisfaction.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

