"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export function ResponseTimeChart() {
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchResponseData() {
      try {
        // Get current user first
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setIsLoading(false)
          return
        }

        const { data: reviews } = await supabase
          .from("gmb_reviews")
          .select("created_at, reply_text, updated_at")
          .eq("user_id", user.id)
          .not("reply_text", "is", null)

        if (reviews && reviews.length > 0) {
          // Calculate actual response time from reviews with replies
          const reviewsWithReplies = reviews.filter((r: any) => r.reply_text && r.updated_at && r.created_at)
          
          if (reviewsWithReplies.length > 0) {
            // Group by week and calculate average response time
            const now = new Date()
            const weeklyData = Array.from({ length: 6 }, (_, i) => {
              const weekStart = new Date(now)
              weekStart.setDate(weekStart.getDate() - (6 - i) * 7)
              
              const weekReviews = reviewsWithReplies.filter((r: any) => {
                const reviewDate = new Date(r.created_at)
                return reviewDate >= weekStart && reviewDate < new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
              })
              
              if (weekReviews.length === 0) {
                return { week: `Week ${i + 1}`, hours: 0 }
              }
              
              const avgHours = weekReviews.reduce((sum: number, r: any) => {
                const created = new Date(r.created_at).getTime()
                const replied = new Date(r.updated_at).getTime()
                const diffHours = (replied - created) / (1000 * 60 * 60)
                return sum + diffHours
              }, 0) / weekReviews.length
              
              return { week: `Week ${i + 1}`, hours: Math.round(avgHours * 10) / 10 }
            })
            
            setData(weeklyData)
          } else {
            setData([])
          }
        } else {
          setData([])
        }
      } catch (error) {
        console.error("Error fetching response data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchResponseData()
  }, [supabase])

  if (isLoading) {
    return (
      <Card className="bg-card border-primary/30">
        <CardHeader>
          <CardTitle className="text-foreground">Average Response Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-secondary animate-pulse rounded" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-primary/30">
      <CardHeader>
        <CardTitle className="text-foreground">Average Response Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="responseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#FF6B35" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 107, 53, 0.1)" />
            <XAxis dataKey="week" stroke="#999999" style={{ fontSize: "12px" }} />
            <YAxis stroke="#999999" style={{ fontSize: "12px" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0a0a0a",
                border: "1px solid rgba(255, 107, 53, 0.3)",
                borderRadius: "8px",
                color: "#ffffff",
              }}
              formatter={(value: number) => [`${value} hours`, "Response Time"]}
            />
            <Area type="monotone" dataKey="hours" stroke="#FF6B35" strokeWidth={2} fill="url(#responseGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
