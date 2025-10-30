"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export function ReviewSentimentChart() {
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchSentimentData() {
      try {
        const { data: reviews } = await supabase
          .from("gmb_reviews")
          .select("ai_sentiment, created_at")
          .order("created_at", { ascending: true })

        if (reviews) {
          // Group by month and sentiment
          const monthlyData: Record<string, { positive: number; neutral: number; negative: number }> = {}

          reviews.forEach((review) => {
            const date = new Date(review.created_at)
            const monthKey = date.toLocaleDateString("en-US", { month: "short" })

            if (!monthlyData[monthKey]) {
              monthlyData[monthKey] = { positive: 0, neutral: 0, negative: 0 }
            }

            if (review.ai_sentiment === "positive") monthlyData[monthKey].positive++
            else if (review.ai_sentiment === "neutral") monthlyData[monthKey].neutral++
            else if (review.ai_sentiment === "negative") monthlyData[monthKey].negative++
          })

          const chartData = Object.entries(monthlyData).map(([month, counts]) => ({
            month,
            ...counts,
          }))

          setData(chartData.slice(-6)) // Last 6 months
        }
      } catch (error) {
        console.error("Error fetching sentiment data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSentimentData()

    const channel = supabase
      .channel("sentiment-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "gmb_reviews" }, fetchSentimentData)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  if (isLoading) {
    return (
      <Card className="bg-card border-primary/30">
        <CardHeader>
          <CardTitle className="text-foreground">Review Sentiment Analysis</CardTitle>
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
        <CardTitle className="text-foreground">Review Sentiment Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
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
            />
            <Legend />
            <Bar dataKey="positive" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="neutral" fill="#eab308" radius={[4, 4, 0, 0]} />
            <Bar dataKey="negative" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
