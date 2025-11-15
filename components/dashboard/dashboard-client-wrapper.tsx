'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { RefreshCcw, Download } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { GmbAccount, GMBLocation, GMBReview, ActivityLog } from '@/lib/types/database'

interface DashboardStats {
  user_id: string
  total_locations: number
  avg_rating: number
  total_reviews: number
  response_rate: number
  pending_reviews: number
  recent_reviews: number
  pending_questions: number
  recent_questions: number
  calculated_at: string
}

interface DashboardData {
  accounts: GmbAccount[]
  locations: GMBLocation[]
  reviews: GMBReview[]
  activities: ActivityLog[]
  stats: DashboardStats | null
}

interface DashboardClientWrapperProps {
  initialData: DashboardData
  userId: string
  children: (data: DashboardData, actions: DashboardActions) => React.ReactNode
}

interface DashboardActions {
  refresh: () => Promise<void>
  exportToPDF: () => Promise<void>
  isRefreshing: boolean
  isExporting: boolean
}

export function DashboardClientWrapper({ 
  initialData, 
  userId,
  children 
}: DashboardClientWrapperProps) {
  const [data, setData] = useState<DashboardData>(initialData)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  // Real-time subscriptions
  useEffect(() => {
    const channels = [
      // Subscribe to reviews changes
      supabase
        .channel('dashboard-reviews')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'gmb_reviews',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            refreshData()
          }
        )
        .subscribe(),

      // Subscribe to locations changes
      supabase
        .channel('dashboard-locations')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'gmb_locations',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            refreshData()
          }
        )
        .subscribe(),

      // Subscribe to activity logs
      supabase
        .channel('dashboard-activities')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'activity_logs',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            refreshData()
          }
        )
        .subscribe(),
    ]

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel)
      })
    }
  }, [userId, supabase])

  const refreshData = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const [
        { data: accounts },
        { data: locations },
        { data: reviews },
        { data: activities },
        { data: stats },
      ] = await Promise.all([
        supabase
          .from('gmb_accounts')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('created_at', { ascending: false }),

        supabase
          .from('gmb_locations')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(5),

        supabase
          .from('gmb_reviews')
          .select(`
            *,
            gmb_locations!inner(location_name)
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10),

        supabase
          .from('activity_logs')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5),

        supabase
          .from('v_dashboard_stats')
          .select('*')
          .eq('user_id', userId)
          .single(),
      ])

      const reviewsWithLocation = reviews?.map((review: any) => ({
        ...review,
        location_name: review.gmb_locations?.location_name || 'Unknown Location',
      })) || []

      setData({
        accounts: accounts || [],
        locations: locations || [],
        reviews: reviewsWithLocation,
        activities: activities || [],
        stats: stats || null,
      })

      toast({
        title: 'Dashboard updated',
        description: 'Your data has been refreshed successfully.',
      })
    } catch (error) {
      console.error('Error refreshing dashboard:', error)
      toast({
        title: 'Refresh failed',
        description: 'Failed to refresh dashboard data. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsRefreshing(false)
    }
  }, [userId, supabase, toast])

  const exportToPDF = useCallback(async () => {
    setIsExporting(true)
    try {
      // Dynamic import to reduce bundle size
      const { exportDashboardToPDF } = await import('@/lib/utils/pdf-export')
      await exportDashboardToPDF(data)
      
      toast({
        title: 'Export successful',
        description: 'Dashboard report has been exported to PDF.',
      })
    } catch (error) {
      console.error('Error exporting to PDF:', error)
      toast({
        title: 'Export failed',
        description: 'Failed to export dashboard. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsExporting(false)
    }
  }, [data, toast])

  const actions: DashboardActions = {
    refresh: refreshData,
    exportToPDF,
    isRefreshing,
    isExporting,
  }

  return <>{children(data, actions)}</>
}

// Header component with refresh, export, and theme toggle buttons
export function DashboardHeader({ 
  onRefresh, 
  onExport, 
  isRefreshing, 
  isExporting 
}: {
  onRefresh: () => void
  onExport: () => void
  isRefreshing: boolean
  isExporting: boolean
}) {
  // Dynamic import to avoid SSR issues
  const ThemeToggle = require('./theme-toggle').DashboardThemeToggle

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's an overview of your Google Business Profile management.
        </p>
      </div>
      
      <div className="flex items-center gap-2 flex-wrap">
        <ThemeToggle />
        
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RefreshCcw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={isExporting}
        >
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? 'Exporting...' : 'Export PDF'}
        </Button>
      </div>
    </div>
  )
}

