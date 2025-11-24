import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('locationId')
    const days = parseInt(searchParams.get('days') || '30')

    if (!locationId) {
      return NextResponse.json({ error: 'Location ID is required' }, { status: 400 })
    }

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Fetch performance metrics
    const { data: metrics, error } = await supabase
      .from('gmb_performance_metrics')
      .select('*')
      .eq('location_id', locationId)
      .gte('metric_date', startDate.toISOString().split('T')[0])
      .lte('metric_date', endDate.toISOString().split('T')[0])
      .order('metric_date', { ascending: true })

    if (error) {
      console.error('[Analytics] DB Error:', error)
      return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
    }

    // Aggregate data by date
    interface DayMetrics {
      date: string
      views: number
      searches: number
      actions: number
      calls: number
      websiteClicks: number
      directionRequests: number
    }
    const dataByDate = new Map<string, DayMetrics>()

    metrics?.forEach((metric) => {
      const date = metric.metric_date
      if (!dataByDate.has(date)) {
        dataByDate.set(date, {
          date,
          views: 0,
          searches: 0,
          actions: 0,
          calls: 0,
          websiteClicks: 0,
          directionRequests: 0,
        })
      }

      const entry = dataByDate.get(date)
      if (!entry) return // Type guard

      // Map metric types to chart data
      switch (metric.metric_type) {
        case 'BUSINESS_IMPRESSIONS_DESKTOP_MAPS':
        case 'BUSINESS_IMPRESSIONS_MOBILE_MAPS':
        case 'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH':
        case 'BUSINESS_IMPRESSIONS_MOBILE_SEARCH':
          entry.views += metric.metric_value
          break
        case 'QUERIES_DIRECT':
        case 'QUERIES_INDIRECT':
          entry.searches += metric.metric_value
          break
        case 'CALL_CLICKS':
          entry.calls += metric.metric_value
          entry.actions += metric.metric_value
          break
        case 'WEBSITE_CLICKS':
          entry.websiteClicks += metric.metric_value
          entry.actions += metric.metric_value
          break
        case 'DRIVING_DIRECTIONS':
          entry.directionRequests += metric.metric_value
          entry.actions += metric.metric_value
          break
      }
    })

    const chartData = Array.from(dataByDate.values())

    // Calculate totals
    const totals = chartData.reduce(
      (acc, day) => ({
        totalViews: acc.totalViews + day.views,
        totalActions: acc.totalActions + day.actions,
        totalCalls: acc.totalCalls + day.calls,
        totalDirections: acc.totalDirections + day.directionRequests,
      }),
      { totalViews: 0, totalActions: 0, totalCalls: 0, totalDirections: 0 },
    )

    return NextResponse.json({ chartData, totals })
  } catch (error) {
    console.error('[Analytics] Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
