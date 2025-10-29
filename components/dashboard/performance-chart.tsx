"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import { useEffect, useState } from "react"
import { getMonthlyStats } from "@/server/actions/dashboard"
import { AlertCircle } from "lucide-react"

interface MonthlyData {
  month: string
  rating: number
  reviews: number
}

export function PerformanceChart() {
  const [data, setData] = useState<MonthlyData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await getMonthlyStats()
        
        if (result.error) {
          setError(result.error)
        } else {
          setData(result.data)
        }
      } catch (err) {
        setError("Failed to load chart data")
        console.error("Chart data error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <Card className="bg-card border-primary/30">
        <CardHeader>
          <CardTitle className="text-foreground">Rating Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full h-[300px]" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-card border-primary/30">
        <CardHeader>
          <CardTitle className="text-foreground">Rating Trends</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="w-12 h-12 mx-auto mb-2 text-red-500" />
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card className="bg-card border-primary/30">
        <CardHeader>
          <CardTitle className="text-foreground">Rating Trends</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <div className="text-center text-muted-foreground">
            <p>No review data available yet</p>
            <p className="text-sm mt-2">Chart will appear once you receive reviews</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate dynamic domain based on actual data
  const minRating = Math.min(...data.map(d => d.rating))
  const maxRating = Math.max(...data.map(d => d.rating))
  const domain = [
    Math.max(0, Math.floor(minRating) - 0.5),
    Math.min(5, Math.ceil(maxRating) + 0.5)
  ]

  return (
    <Card className="bg-card border-primary/30">
      <CardHeader>
        <CardTitle className="text-foreground">Rating Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 107, 53, 0.1)" />
            <XAxis dataKey="month" stroke="#999999" style={{ fontSize: "12px" }} />
            <YAxis stroke="#999999" style={{ fontSize: "12px" }} domain={domain} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0a0a0a",
                border: "1px solid rgba(255, 107, 53, 0.3)",
                borderRadius: "8px",
                color: "#ffffff",
              }}
            />
            <Line
              type="monotone"
              dataKey="rating"
              stroke="#ff6b35"
              strokeWidth={3}
              dot={{ fill: "#ff6b35", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
