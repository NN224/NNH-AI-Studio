"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Eye, MousePointerClick, Phone, ArrowUp, ArrowDown } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface DayPerformance {
  day: string
  views: number
  clicks: number
  calls: number
}

interface PerformanceSnapshotProps {
  data: DayPerformance[]
  aiInsight?: string
}

export function PerformanceSnapshot({ data, aiInsight }: PerformanceSnapshotProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="bg-card border-primary/30">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">Last 7 Days</CardTitle>
              <p className="text-xs text-muted-foreground">
                Performance overview
              </p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="p-8 text-center text-muted-foreground">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Connect GMB to see performance data</p>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  const maxViews = Math.max(...data.map(d => d.views), 1)
  
  const totalViews = data.reduce((sum, d) => sum + d.views, 0)
  const totalClicks = data.reduce((sum, d) => sum + d.clicks, 0)
  const totalCalls = data.reduce((sum, d) => sum + d.calls, 0)
  
  const avgViews = data.length > 0 ? Math.round(totalViews / data.length) : 0
  const peakDay = data.length > 0 ? data.reduce((max, d) => d.views > max.views ? d : max, data[0]) : null
  
  const getChangePercent = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
  }

  return (
    <Card className="bg-card border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-sm font-medium text-muted-foreground">Last 7 Days</CardTitle>
            <p className="text-xs text-muted-foreground">
              Performance overview
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-secondary border border-primary/20">
            <div className="flex items-center gap-2 mb-1">
              <Eye className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Views</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{totalViews.toLocaleString()}</p>
          </div>
          
          <div className="p-3 rounded-lg bg-secondary border border-primary/20">
            <div className="flex items-center gap-2 mb-1">
              <MousePointerClick className="h-4 w-4 text-info" />
              <span className="text-xs text-muted-foreground">Clicks</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{totalClicks.toLocaleString()}</p>
          </div>
          
          <div className="p-3 rounded-lg bg-secondary border border-primary/20">
            <div className="flex items-center gap-2 mb-1">
              <Phone className="h-4 w-4 text-success" />
              <span className="text-xs text-muted-foreground">Calls</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{totalCalls.toLocaleString()}</p>
          </div>
        </div>

        <div className="space-y-3">
          {data.map((day, index) => {
            const barHeight = (day.views / maxViews) * 100
            const isPeak = peakDay ? day.day === peakDay.day : false
            const prevDay = index > 0 ? data[index - 1] : null
            const changePercent = prevDay ? getChangePercent(day.views, prevDay.views) : 0
            const isUp = changePercent > 0
            
            return (
              <motion.div
                key={day.day}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3"
              >
                <span className="text-xs font-medium text-muted-foreground w-9 text-right">
                  {day.day}
                </span>
                
                <div className="flex-1 flex items-center gap-3">
                  <div className="flex-1 h-8 bg-secondary rounded-md overflow-hidden relative border border-primary/20">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barHeight}%` }}
                      transition={{ duration: 0.5, delay: index * 0.05 }}
                      className={cn(
                        "h-full rounded-md",
                        isPeak ? "bg-[#FF8C42] shadow-lg shadow-[#FF8C42]/20" : "bg-[#FF8C42]/70"
                      )}
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 min-w-[100px] justify-end">
                    <span className="text-sm font-semibold text-foreground">
                      {day.views}
                    </span>
                    {prevDay && changePercent !== 0 && (
                      <span className={cn(
                        "text-xs flex items-center font-medium px-1.5 py-0.5 rounded",
                        isUp ? "text-success bg-success/10" : "text-destructive bg-destructive/10"
                      )}>
                        {isUp ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )}
                        {Math.abs(changePercent)}%
                      </span>
                    )}
                    {isPeak && (
                      <span className="text-xs font-bold text-[#FF8C42] px-2 py-0.5 bg-[#FF8C42]/10 rounded border border-[#FF8C42]/30">
                        🔥 Peak
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {aiInsight && (
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
            <div className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-primary">AI Insight:</span> {aiInsight}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
