"use client"

import { useState } from "react"
import { MetricsOverview } from "@/components/analytics/metrics-overview"
import { ReviewSentimentChart } from "@/components/analytics/review-sentiment-chart"
import { LocationPerformance } from "@/components/analytics/location-performance"
import { TrafficChart } from "@/components/analytics/traffic-chart"
import { ResponseTimeChart } from "@/components/analytics/response-time-chart"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Download, Calendar, Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import { toast } from "sonner"

export default function AnalyticsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    
    const exportPromise = new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const reportData = {
            timestamp: new Date().toISOString(),
            metrics: "Sample analytics data",
          }
          const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" })
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `analytics-report-${Date.now()}.json`
          a.click()
          URL.revokeObjectURL(url)
          resolve("Report exported successfully")
        } catch (error) {
          reject(error)
        }
      }, 1000)
    })

    toast.promise(exportPromise, {
      loading: "Exporting report...",
      success: "Report exported successfully!",
      error: "Failed to export report",
      finally: () => {
        setIsExporting(false)
      },
    })
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  }

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Analytics
          </h1>
          <p className="text-muted-foreground mt-1">Track your performance and insights</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-primary/30 text-foreground hover:bg-primary/20 bg-transparent transition-all duration-200 hover:scale-105"
          >
            <Calendar className="h-4 w-4 mr-2" />
            All time
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white transition-all duration-200 hover:scale-105"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </>
            )}
          </Button>
        </div>
      </motion.div>

      {/* Metrics Overview */}
      <motion.div variants={itemVariants}>
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-3 p-6 rounded-lg border border-primary/30 bg-card">
                <Skeleton className="h-4 w-20 shimmer" />
                <Skeleton className="h-8 w-32 shimmer" />
                <Skeleton className="h-3 w-24 shimmer" />
              </div>
            ))}
          </div>
        ) : (
          <MetricsOverview />
        )}
      </motion.div>

      {/* Charts Grid 1 */}
      <motion.div variants={itemVariants} className="grid gap-6 lg:grid-cols-2">
        {isLoading ? (
          <>
            <div className="p-6 rounded-lg border border-primary/30 bg-card space-y-4">
              <Skeleton className="h-6 w-40 shimmer" />
              <Skeleton className="h-64 w-full shimmer" />
            </div>
            <div className="p-6 rounded-lg border border-primary/30 bg-card space-y-4">
              <Skeleton className="h-6 w-40 shimmer" />
              <Skeleton className="h-64 w-full shimmer" />
            </div>
          </>
        ) : (
          <>
            <ReviewSentimentChart />
            <LocationPerformance />
          </>
        )}
      </motion.div>

      {/* Charts Grid 2 */}
      <motion.div variants={itemVariants} className="grid gap-6 lg:grid-cols-2">
        {isLoading ? (
          <>
            <div className="p-6 rounded-lg border border-primary/30 bg-card space-y-4">
              <Skeleton className="h-6 w-40 shimmer" />
              <Skeleton className="h-64 w-full shimmer" />
            </div>
            <div className="p-6 rounded-lg border border-primary/30 bg-card space-y-4">
              <Skeleton className="h-6 w-40 shimmer" />
              <Skeleton className="h-64 w-full shimmer" />
            </div>
          </>
        ) : (
          <>
            <TrafficChart />
            <ResponseTimeChart />
          </>
        )}
      </motion.div>
    </motion.div>
  )
}
