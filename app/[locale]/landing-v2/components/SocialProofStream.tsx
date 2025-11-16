/**
 * Social Proof Stream Component
 * Production-ready real-time activity notifications
 */

'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Users, MapPin, Star, MessageSquare, 
  FileText, TrendingUp, CheckCircle, Zap
} from 'lucide-react'

interface Activity {
  id: string
  type: 'signup' | 'locations' | 'reviews' | 'ai' | 'posts' | 'rating' | 'time-saved' | 'responses'
  name: string
  location: string
  message: string
  value?: string
  timestamp: Date
  icon: any
  color: string
}

const ACTIVITIES: Omit<Activity, 'id' | 'timestamp'>[] = [
  {
    type: 'signup',
    name: 'أحمد محمد',
    location: 'الرياض',
    message: 'سجل للتو!',
    icon: Users,
    color: 'text-blue-500'
  },
  {
    type: 'locations',
    name: 'سارة أحمد',
    location: 'دبي',
    message: 'ربطت 5 مواقع!',
    value: '5',
    icon: MapPin,
    color: 'text-green-500'
  },
  {
    type: 'reviews',
    name: 'محمد علي',
    location: 'القاهرة',
    message: 'حصل على +150 تقييم!',
    value: '+150',
    icon: Star,
    color: 'text-yellow-500'
  },
  {
    type: 'ai',
    name: 'فاطمة خالد',
    location: 'جدة',
    message: 'استخدمت AI Reply!',
    icon: Zap,
    color: 'text-purple-500'
  },
  {
    type: 'posts',
    name: 'عبدالله سعيد',
    location: 'الدمام',
    message: 'أنشأ 3 منشورات!',
    value: '3',
    icon: FileText,
    color: 'text-cyan-500'
  },
  {
    type: 'rating',
    name: 'نورة محمد',
    location: 'الكويت',
    message: 'حسنت تقييمها إلى 4.8⭐',
    value: '4.8⭐',
    icon: TrendingUp,
    color: 'text-orange-500'
  },
  {
    type: 'time-saved',
    name: 'خالد أحمد',
    location: 'عمان',
    message: 'وفر 40 ساعة هذا الشهر!',
    value: '40h',
    icon: CheckCircle,
    color: 'text-green-500'
  },
  {
    type: 'responses',
    name: 'ليلى سعيد',
    location: 'بيروت',
    message: 'ردت على 50 تقييم!',
    value: '50',
    icon: MessageSquare,
    color: 'text-pink-500'
  },
  {
    type: 'signup',
    name: 'يوسف علي',
    location: 'الدوحة',
    message: 'بدأ تجربة مجانية!',
    icon: Users,
    color: 'text-blue-500'
  },
  {
    type: 'locations',
    name: 'مريم أحمد',
    location: 'أبوظبي',
    message: 'ربطت 12 موقع!',
    value: '12',
    icon: MapPin,
    color: 'text-green-500'
  }
]

export default function SocialProofStream() {
  const [currentActivity, setCurrentActivity] = useState<Activity | null>(null)
  const [activityIndex, setActivityIndex] = useState(0)

  useEffect(() => {
    // Show first activity after 3 seconds
    const initialTimer = setTimeout(() => {
      showNextActivity()
    }, 3000)

    return () => clearTimeout(initialTimer)
  }, [])

  useEffect(() => {
    if (currentActivity) {
      // Hide after 5 seconds
      const hideTimer = setTimeout(() => {
        setCurrentActivity(null)
      }, 5000)

      // Show next after 8 seconds (3 seconds gap)
      const nextTimer = setTimeout(() => {
        showNextActivity()
      }, 8000)

      return () => {
        clearTimeout(hideTimer)
        clearTimeout(nextTimer)
      }
    }
  }, [currentActivity])

  const showNextActivity = () => {
    const activity = ACTIVITIES[activityIndex]
    setCurrentActivity({
      ...activity,
      id: Date.now().toString(),
      timestamp: new Date()
    })
    setActivityIndex((activityIndex + 1) % ACTIVITIES.length)
  }

  const getTimeAgo = (timestamp: Date): string => {
    const seconds = Math.floor((Date.now() - timestamp.getTime()) / 1000)
    if (seconds < 60) return 'الآن'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `منذ ${minutes} دقيقة`
    const hours = Math.floor(minutes / 60)
    return `منذ ${hours} ساعة`
  }

  return (
    <AnimatePresence>
      {currentActivity && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          className="fixed bottom-6 left-6 z-40 max-w-sm"
        >
          <Card className="glass-strong border-primary/30 shadow-2xl overflow-hidden">
            <div className="p-4">
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                  ${currentActivity.type === 'signup' ? 'bg-blue-500/20' :
                    currentActivity.type === 'locations' ? 'bg-green-500/20' :
                    currentActivity.type === 'reviews' ? 'bg-yellow-500/20' :
                    currentActivity.type === 'ai' ? 'bg-purple-500/20' :
                    currentActivity.type === 'posts' ? 'bg-cyan-500/20' :
                    currentActivity.type === 'rating' ? 'bg-orange-500/20' :
                    currentActivity.type === 'time-saved' ? 'bg-green-500/20' :
                    'bg-pink-500/20'}
                `}>
                  <currentActivity.icon className={`w-5 h-5 ${currentActivity.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm truncate">
                      {currentActivity.name}
                    </p>
                    {currentActivity.value && (
                      <Badge variant="outline" className="border-primary/30 text-xs">
                        {currentActivity.value}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-foreground mb-1">
                    {currentActivity.message}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span>{currentActivity.location}</span>
                    <span>•</span>
                    <span>{getTimeAgo(currentActivity.timestamp)}</span>
                  </div>
                </div>

                {/* Verified Badge */}
                <div className="flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 5, ease: 'linear' }}
              className="h-1 bg-gradient-to-r from-primary to-accent"
            />
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

