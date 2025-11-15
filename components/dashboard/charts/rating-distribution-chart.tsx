'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Star } from 'lucide-react'

interface Review {
  rating: number
}

interface RatingDistributionChartProps {
  reviews: Review[]
}

interface ChartData {
  name: string
  value: number
  percentage: number
}

const COLORS = {
  5: 'hsl(142, 76%, 36%)', // Green
  4: 'hsl(142, 76%, 50%)', // Light Green
  3: 'hsl(48, 96%, 53%)',  // Yellow
  2: 'hsl(25, 95%, 53%)',  // Orange
  1: 'hsl(0, 84%, 60%)',   // Red
}

function generateRatingDistribution(reviews: Review[]): ChartData[] {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  
  reviews.forEach(review => {
    if (review.rating >= 1 && review.rating <= 5) {
      distribution[review.rating as keyof typeof distribution]++
    }
  })
  
  const total = reviews.length || 1
  
  return [5, 4, 3, 2, 1].map(rating => ({
    name: `${rating} Star${rating !== 1 ? 's' : ''}`,
    value: distribution[rating as keyof typeof distribution],
    percentage: Number(((distribution[rating as keyof typeof distribution] / total) * 100).toFixed(1)),
  }))
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3">
        <p className="font-medium mb-1">{data.name}</p>
        <p className="text-sm">
          Count: <span className="font-semibold">{data.value}</span>
        </p>
        <p className="text-sm">
          Percentage: <span className="font-semibold">{data.percentage}%</span>
        </p>
      </div>
    )
  }
  return null
}

const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) => {
  if (percentage === 0) return null
  
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-xs font-semibold"
    >
      {`${percentage}%`}
    </text>
  )
}

export function RatingDistributionChart({ reviews }: RatingDistributionChartProps) {
  const chartData = generateRatingDistribution(reviews)
  const totalReviews = reviews.length
  
  // Calculate average rating
  const avgRating = totalReviews > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
    : '0.0'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rating Distribution</CardTitle>
        <CardDescription>Breakdown by star rating</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-4xl font-bold">{avgRating}</span>
            <Star className="h-8 w-8 fill-yellow-400 text-yellow-400" />
          </div>
          <p className="text-sm text-muted-foreground">
            Average rating from {totalReviews} review{totalReviews !== 1 ? 's' : ''}
          </p>
        </div>

        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={CustomLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[(5 - index) as keyof typeof COLORS]} 
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              iconType="circle"
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="mt-4 space-y-2">
          {chartData.map((item, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[(5 - index) as keyof typeof COLORS] }}
                />
                <span>{item.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium">{item.value}</span>
                <span className="text-muted-foreground w-12 text-right">
                  {item.percentage}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

