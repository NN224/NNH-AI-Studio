"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export function TrafficChart() {
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchTrafficData() {
      try {
        const { data: reviews } = await supabase
          .from("gmb_reviews")
          .select("created_at")
          .order("created_at", { ascending: true })

        if (reviews && reviews.length > 0) {
          // Group reviews by month (all time)
          const monthlyCounts: Record<string, number> = {}
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

          reviews.forEach(review => {
            const reviewDate = new Date(review.created_at)
            const monthKey = `${months[reviewDate.getMonth()]} ${reviewDate.getFullYear()}`
            monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + 1
          })

          // Convert to chart format, sorted by date
          const chartData = Object.entries(monthlyCounts)
            .map(([monthYear, count]) => {
              const [month, year] = monthYear.split(' ')
              return {
                month: monthYear, // e.g., "Jan 2024"
                views: count,
                sortKey: new Date(`${month} 1, ${year}`).getTime()
              }
            })
            .sort((a, b) => a.sortKey - b.sortKey)
            .map(({ month, views }) => ({ month, views }))

          setData(chartData)
        } else {
          setData([])
        }
      } catch (error) {
        console.error("Error fetching traffic data:", error)
        setData([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchTrafficData()
  }, [supabase])

  if (isLoading) {
    return (
      <Card className="bg-card border-primary/30">
        <CardHeader>
          <CardTitle className="text-foreground">Traffic Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-secondary animate-pulse rounded" />
        </CardContent>
      </Card>
    )
  }

  const hasData = data.some(d => d.views > 0)

  return (
    <Card className="bg-card border-primary/30">
      <CardHeader>
        <CardTitle className="text-foreground">Engagement Trends (All time)</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 107, 53, 0.1)" />
              <XAxis dataKey="month" stroke="#999999" style={{ fontSize: "12px" }} />
              <YAxis stroke="#999999" style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0a0a0a",
                  border: "1px solid rgba(255, 107, 53, 0.3)",
                  borderRadius: "8px",
                  color: "#ffffff",
                }}
                labelFormatter={(label) => `${label}`}
                formatter={(value: number) => [`${value} reviews`, "Activity"]}
              />
              <Line type="monotone" dataKey="views" stroke="#FF6B35" strokeWidth={2} dot={{ fill: "#FF6B35", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex flex-col items-center justify-center text-center p-6">
            <div className="text-muted-foreground mb-2">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-lg font-medium">No recent activity</p>
              <p className="text-sm mt-2 max-w-md">
                Connect your GMB accounts and sync locations to see engagement trends based on customer reviews.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
