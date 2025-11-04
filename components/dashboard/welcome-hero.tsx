"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Sparkles, Target, Clock } from "lucide-react"
import { motion } from "framer-motion"

interface WelcomeHeroProps {
  userName?: string
  profileStrength: number
  tasksRemaining: number
  estimatedMinutes: number
  loading?: boolean
}

export function WelcomeHero({ 
  userName, 
  profileStrength, 
  tasksRemaining,
  estimatedMinutes,
  loading = false
}: WelcomeHeroProps) {
  const [displayProgress, setDisplayProgress] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayProgress(profileStrength)
    }, 300)
    return () => clearTimeout(timer)
  }, [profileStrength])

  const getStrengthLabel = (strength: number) => {
    if (strength < 30) return "Getting Started"
    if (strength < 50) return "Building Up"
    if (strength < 70) return "Intermediate"
    if (strength < 90) return "Advanced"
    return "Expert"
  }

  const getStrengthColor = (strength: number) => {
    if (strength < 30) return "text-destructive"
    if (strength < 50) return "text-warning"
    if (strength < 70) return "text-info"
    if (strength < 90) return "text-primary"
    return "text-success"
  }

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-card via-card to-primary/5 border-primary/30 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <CardContent className="p-6 relative">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-[300px]">
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-7 w-48" />
              </div>
              <Skeleton className="h-4 w-3/4 mb-4" />
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="bg-gradient-to-br from-card via-card to-primary/5 border-primary/30 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <CardContent className="p-6 relative">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-[300px]">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-bold text-foreground">
                  Welcome back{userName ? `, ${userName}` : ''}!
                </h2>
              </div>
              <p className="text-muted-foreground mb-4">
                Your AI Assistant is monitoring your business and ready to help
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      GMB Profile Strength:
                    </span>
                    <span className={`text-sm font-bold ${getStrengthColor(profileStrength)}`}>
                      {profileStrength}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {getStrengthLabel(profileStrength)}
                    </span>
                  </div>
                </div>
                
                <Progress 
                  value={displayProgress} 
                  className="h-3 bg-secondary"
                />
                
                {profileStrength < 100 && (
                  <div className="flex items-center gap-4 text-sm flex-wrap">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      <span className="text-muted-foreground">
                        Complete <span className="font-semibold text-foreground">{tasksRemaining}</span> more {tasksRemaining === 1 ? 'task' : 'tasks'} to unlock AI Pro
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-info" />
                      <span className="text-muted-foreground">
                        ⏱️ <span className="font-semibold text-foreground">{estimatedMinutes}</span> min left
                      </span>
                    </div>
                  </div>
                )}
                
                {profileStrength === 100 && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success/10 border border-success/30">
                      <Sparkles className="h-4 w-4 text-success" />
                      <span className="font-semibold text-success">
                        🎉 Profile Complete! You're a Pro!
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
