/**
 * Performance Calculations Helper Functions
 * Calculate metrics from real Performance API data
 */

interface PerformanceMetric {
  metric_type: string
  metric_value: number | string
  metric_date: string
}

interface Review {
  rating?: number | null
  reply_text?: string | null
  created_at?: string
}

interface PeriodComparison {
  current: number
  previous: number
  change: number
  changePercent: number
}

/**
 * Calculate Engagement Rate from Performance Metrics
 * Engagement Rate = (Clicks + Conversations + Direction Requests) / Impressions * 100
 */
export function calculateEngagementRate(
  metrics: PerformanceMetric[],
  startDate: Date,
  endDate: Date
): number {
  if (!metrics || metrics.length === 0) return 0

  const dateRangeMetrics = metrics.filter((m) => {
    const metricDate = new Date(m.metric_date)
    return metricDate >= startDate && metricDate <= endDate
  })

  let totalImpressions = 0
  let totalEngagements = 0

  dateRangeMetrics.forEach((metric) => {
    const value = typeof metric.metric_value === 'string' 
      ? parseInt(metric.metric_value) || 0 
      : metric.metric_value

    // Sum all impression types
    if (
      metric.metric_type === 'BUSINESS_IMPRESSIONS_DESKTOP_MAPS' ||
      metric.metric_type === 'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH' ||
      metric.metric_type === 'BUSINESS_IMPRESSIONS_MOBILE_MAPS' ||
      metric.metric_type === 'BUSINESS_IMPRESSIONS_MOBILE_SEARCH'
    ) {
      totalImpressions += value
    }

    // Sum all engagement types
    if (
      metric.metric_type === 'WEBSITE_CLICKS' ||
      metric.metric_type === 'CALL_CLICKS' ||
      metric.metric_type === 'BUSINESS_CONVERSATIONS' ||
      metric.metric_type === 'BUSINESS_DIRECTION_REQUESTS'
    ) {
      totalEngagements += value
    }
  })

  if (totalImpressions === 0) return 0
  return (totalEngagements / totalImpressions) * 100
}

/**
 * Calculate Response Rate from Reviews
 * Response Rate = (Reviews with replies / Total reviews) * 100
 */
export function calculateResponseRate(reviews: Review[]): number {
  if (!reviews || reviews.length === 0) return 0

  const reviewsWithReplies = reviews.filter((r) => r.reply_text && r.reply_text.trim() !== '').length
  return (reviewsWithReplies / reviews.length) * 100
}

/**
 * Calculate Customer Satisfaction from Reviews ratings
 * Satisfaction = Average rating / 5 * 100
 */
export function calculateSatisfaction(reviews: Review[]): number {
  if (!reviews || reviews.length === 0) return 0

  const reviewsWithRatings = reviews.filter((r) => r.rating && r.rating > 0)
  if (reviewsWithRatings.length === 0) return 0

  const totalRating = reviewsWithRatings.reduce((sum, r) => sum + (r.rating || 0), 0)
  const avgRating = totalRating / reviewsWithRatings.length

  // Convert to percentage (5 stars = 100%)
  return (avgRating / 5) * 100
}

/**
 * Compare two time periods and calculate change
 */
export function comparePeriods(
  currentMetrics: PerformanceMetric[],
  previousMetrics: PerformanceMetric[],
  metricType: string
): PeriodComparison {
  const calculateSum = (metrics: PerformanceMetric[], type: string): number => {
    return metrics
      .filter((m) => m.metric_type === type)
      .reduce((sum, m) => {
        const value = typeof m.metric_value === 'string' 
          ? parseInt(m.metric_value) || 0 
          : m.metric_value
        return sum + value
      }, 0)
  }

  const current = calculateSum(currentMetrics, metricType)
  const previous = calculateSum(previousMetrics, metricType)
  const change = current - previous
  const changePercent = previous === 0 
    ? (current > 0 ? 100 : 0)
    : (change / previous) * 100

  return {
    current,
    previous,
    change,
    changePercent: Math.round(changePercent * 10) / 10
  }
}

/**
 * Get date range based on period selection
 */
export function getDateRange(periodDays: number): { start: Date; end: Date } {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - periodDays)

  return { start, end }
}

/**
 * Get previous period date range for comparison
 */
export function getPreviousPeriodRange(
  currentStart: Date,
  currentEnd: Date
): { start: Date; end: Date } {
  const periodLength = currentEnd.getTime() - currentStart.getTime()
  
  const previousEnd = new Date(currentStart)
  previousEnd.setTime(previousEnd.getTime() - 1) // One day before current start
  
  const previousStart = new Date(previousEnd)
  previousStart.setTime(previousStart.getTime() - periodLength)

  return { start: previousStart, end: previousEnd }
}

/**
 * Aggregate metrics by type (sum all values for each metric type)
 */
export function aggregateMetricsByType(
  metrics: PerformanceMetric[],
  dateRange?: { start: Date; end: Date }
): Record<string, number> {
  const aggregated: Record<string, number> = {}

  metrics.forEach((metric) => {
    // Filter by date range if provided
    if (dateRange) {
      const metricDate = new Date(metric.metric_date)
      if (metricDate < dateRange.start || metricDate > dateRange.end) {
        return
      }
    }

    const value = typeof metric.metric_value === 'string' 
      ? parseInt(metric.metric_value) || 0 
      : metric.metric_value

    aggregated[metric.metric_type] = (aggregated[metric.metric_type] || 0) + value
  })

  return aggregated
}

/**
 * Aggregate metrics by date for charting
 */
export function aggregateMetricsByDate(
  metrics: PerformanceMetric[],
  metricTypes: string[]
): Array<{ date: string; [key: string]: string | number }> {
  const aggregated: Record<string, Record<string, number>> = {}

  metrics.forEach((metric) => {
    if (!metricTypes.includes(metric.metric_type)) return

    const date = metric.metric_date
    if (!aggregated[date]) {
      aggregated[date] = {}
      metricTypes.forEach((type) => {
        aggregated[date][type] = 0
      })
    }

    const value = typeof metric.metric_value === 'string' 
      ? parseInt(metric.metric_value) || 0 
      : metric.metric_value

    aggregated[date][metric.metric_type] = (aggregated[date][metric.metric_type] || 0) + value
  })

  return Object.entries(aggregated)
    .map(([date, values]) => ({
      date,
      ...values,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

/**
 * Calculate Click-Through Rate (CTR)
 * CTR = (Website Clicks + Call Clicks) / Impressions * 100
 */
export function calculateCTR(
  metrics: PerformanceMetric[],
  startDate: Date,
  endDate: Date
): number {
  if (!metrics || metrics.length === 0) return 0

  const dateRangeMetrics = metrics.filter((m) => {
    const metricDate = new Date(m.metric_date)
    return metricDate >= startDate && metricDate <= endDate
  })

  let totalImpressions = 0
  let totalClicks = 0

  dateRangeMetrics.forEach((metric) => {
    const value = typeof metric.metric_value === 'string' 
      ? parseInt(metric.metric_value) || 0 
      : metric.metric_value

    // Sum all impression types
    if (
      metric.metric_type.includes('IMPRESSIONS')
    ) {
      totalImpressions += value
    }

    // Sum clicks
    if (
      metric.metric_type === 'WEBSITE_CLICKS' ||
      metric.metric_type === 'CALL_CLICKS'
    ) {
      totalClicks += value
    }
  })

  if (totalImpressions === 0) return 0
  return (totalClicks / totalImpressions) * 100
}

/**
 * Get Impressions Breakdown by source (Desktop/Mobile, Maps/Search)
 */
export interface ImpressionsBreakdown {
  desktopMaps: number
  desktopSearch: number
  mobileMaps: number
  mobileSearch: number
  total: number
  mapsTotal: number
  searchTotal: number
  desktopTotal: number
  mobileTotal: number
}

export function getImpressionsBreakdown(
  metrics: PerformanceMetric[],
  startDate?: Date,
  endDate?: Date
): ImpressionsBreakdown {
  const filteredMetrics = metrics.filter((m) => {
    if (!startDate || !endDate) return true
    const metricDate = new Date(m.metric_date)
    return metricDate >= startDate && metricDate <= endDate
  })

  let desktopMaps = 0
  let desktopSearch = 0
  let mobileMaps = 0
  let mobileSearch = 0

  filteredMetrics.forEach((metric) => {
    const value = typeof metric.metric_value === 'string' 
      ? parseInt(metric.metric_value) || 0 
      : metric.metric_value

    switch (metric.metric_type) {
      case 'BUSINESS_IMPRESSIONS_DESKTOP_MAPS':
        desktopMaps += value
        break
      case 'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH':
        desktopSearch += value
        break
      case 'BUSINESS_IMPRESSIONS_MOBILE_MAPS':
        mobileMaps += value
        break
      case 'BUSINESS_IMPRESSIONS_MOBILE_SEARCH':
        mobileSearch += value
        break
    }
  })

  const total = desktopMaps + desktopSearch + mobileMaps + mobileSearch
  const mapsTotal = desktopMaps + mobileMaps
  const searchTotal = desktopSearch + mobileSearch
  const desktopTotal = desktopMaps + desktopSearch
  const mobileTotal = mobileMaps + mobileSearch

  return {
    desktopMaps,
    desktopSearch,
    mobileMaps,
    mobileSearch,
    total,
    mapsTotal,
    searchTotal,
    desktopTotal,
    mobileTotal,
  }
}

/**
 * Get Device Split (Desktop vs Mobile percentage)
 */
export interface DeviceSplit {
  desktop: number
  mobile: number
  desktopPercent: number
  mobilePercent: number
}

export function getDeviceSplit(
  metrics: PerformanceMetric[],
  startDate?: Date,
  endDate?: Date
): DeviceSplit {
  const breakdown = getImpressionsBreakdown(metrics, startDate, endDate)
  
  const total = breakdown.total
  if (total === 0) {
    return { desktop: 0, mobile: 0, desktopPercent: 0, mobilePercent: 0 }
  }

  return {
    desktop: breakdown.desktopTotal,
    mobile: breakdown.mobileTotal,
    desktopPercent: (breakdown.desktopTotal / total) * 100,
    mobilePercent: (breakdown.mobileTotal / total) * 100,
  }
}

/**
 * Get Source Split (Maps vs Search percentage)
 */
export interface SourceSplit {
  maps: number
  search: number
  mapsPercent: number
  searchPercent: number
}

export function getSourceSplit(
  metrics: PerformanceMetric[],
  startDate?: Date,
  endDate?: Date
): SourceSplit {
  const breakdown = getImpressionsBreakdown(metrics, startDate, endDate)
  
  const total = breakdown.total
  if (total === 0) {
    return { maps: 0, search: 0, mapsPercent: 0, searchPercent: 0 }
  }

  return {
    maps: breakdown.mapsTotal,
    search: breakdown.searchTotal,
    mapsPercent: (breakdown.mapsTotal / total) * 100,
    searchPercent: (breakdown.searchTotal / total) * 100,
  }
}

/**
 * Calculate Bookings Rate
 * Bookings Rate = Bookings / Impressions * 100
 */
export function calculateBookingsRate(
  metrics: PerformanceMetric[],
  startDate: Date,
  endDate: Date
): number {
  if (!metrics || metrics.length === 0) return 0

  const dateRangeMetrics = metrics.filter((m) => {
    const metricDate = new Date(m.metric_date)
    return metricDate >= startDate && metricDate <= endDate
  })

  let totalImpressions = 0
  let totalBookings = 0

  dateRangeMetrics.forEach((metric) => {
    const value = typeof metric.metric_value === 'string' 
      ? parseInt(metric.metric_value) || 0 
      : metric.metric_value

    // Sum all impression types
    if (metric.metric_type.includes('IMPRESSIONS')) {
      totalImpressions += value
    }

    // Sum bookings
    if (metric.metric_type === 'BUSINESS_BOOKINGS') {
      totalBookings += value
    }
  })

  if (totalImpressions === 0) return 0
  return (totalBookings / totalImpressions) * 100
}
