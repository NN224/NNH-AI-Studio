'use client'

import { createClient } from '@/lib/supabase/client'

export interface PerformanceMetric {
  name: string
  value: number
  metadata?: Record<string, any>
  timestamp?: Date
}

class PerformanceTracker {
  private metrics: Map<string, number> = new Map()
  private startTimes: Map<string, number> = new Map()
  private batchQueue: PerformanceMetric[] = []
  private batchSize = 10
  private batchTimeout: NodeJS.Timeout | null = null

  /**
   * Start tracking a metric
   */
  start(metricName: string): void {
    this.startTimes.set(metricName, performance.now())
  }

  /**
   * End tracking and record the metric
   */
  end(metricName: string, metadata?: Record<string, any>): number {
    const startTime = this.startTimes.get(metricName)
    
    if (!startTime) {
      console.warn(`Performance metric "${metricName}" was never started`)
      return 0
    }

    const duration = performance.now() - startTime
    this.startTimes.delete(metricName)
    
    this.record(metricName, duration, metadata)
    
    return duration
  }

  /**
   * Record a metric directly
   */
  record(name: string, value: number, metadata?: Record<string, any>): void {
    this.metrics.set(name, value)
    
    // Add to batch queue
    this.batchQueue.push({
      name,
      value,
      metadata,
      timestamp: new Date(),
    })

    // Send batch if queue is full
    if (this.batchQueue.length >= this.batchSize) {
      this.flush()
    } else {
      // Schedule flush after timeout
      this.scheduleBatchFlush()
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Performance: ${name} = ${value.toFixed(2)}ms`, metadata)
    }
  }

  /**
   * Get a recorded metric
   */
  get(metricName: string): number | undefined {
    return this.metrics.get(metricName)
  }

  /**
   * Get all metrics
   */
  getAll(): Record<string, number> {
    return Object.fromEntries(this.metrics)
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear()
    this.startTimes.clear()
  }

  /**
   * Schedule batch flush
   */
  private scheduleBatchFlush(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
    }

    this.batchTimeout = setTimeout(() => {
      this.flush()
    }, 5000) // Flush after 5 seconds
  }

  /**
   * Flush metrics to database
   */
  async flush(): Promise<void> {
    if (this.batchQueue.length === 0) return

    const metricsToSend = [...this.batchQueue]
    this.batchQueue = []

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
      this.batchTimeout = null
    }

    try {
      const supabase = createClient()
  if (!supabase) {
    throw new Error('Failed to initialize Supabase client')
  }
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      // Insert metrics
      const { error } = await supabase.from('performance_metrics').insert(
        metricsToSend.map((metric) => ({
          user_id: user.id,
          name: metric.name,
          value: metric.value,
          metadata: metric.metadata,
          timestamp: metric.timestamp?.toISOString() || new Date().toISOString(),
        }))
      )

      if (error) {
        console.error('Failed to save performance metrics:', error)
      }
    } catch (error) {
      console.error('Performance tracking error:', error)
    }
  }

  /**
   * Track Web Vitals
   */
  trackWebVitals(): void {
    if (typeof window === 'undefined') return

    // Track FCP (First Contentful Paint)
    const paintEntries = performance.getEntriesByType('paint')
    const fcp = paintEntries.find((entry) => entry.name === 'first-contentful-paint')
    if (fcp) {
      this.record('web_vitals_fcp', fcp.startTime)
    }

    // Track LCP (Largest Contentful Paint)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1] as any
          if (lastEntry) {
            this.record('web_vitals_lcp', lastEntry.renderTime || lastEntry.loadTime)
          }
        })
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
      } catch (e) {
        console.warn('LCP tracking not supported')
      }

      // Track FID (First Input Delay)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach((entry: any) => {
            this.record('web_vitals_fid', entry.processingStart - entry.startTime)
          })
        })
        fidObserver.observe({ entryTypes: ['first-input'] })
      } catch (e) {
        console.warn('FID tracking not supported')
      }

      // Track CLS (Cumulative Layout Shift)
      try {
        let clsValue = 0
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value
              this.record('web_vitals_cls', clsValue * 1000) // Convert to ms for consistency
            }
          }
        })
        clsObserver.observe({ entryTypes: ['layout-shift'] })
      } catch (e) {
        console.warn('CLS tracking not supported')
      }
    }
  }

  /**
   * Track Navigation Timing
   */
  trackNavigationTiming(): void {
    if (typeof window === 'undefined') return

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    
    if (navigation) {
      this.record('navigation_dns', navigation.domainLookupEnd - navigation.domainLookupStart)
      this.record('navigation_tcp', navigation.connectEnd - navigation.connectStart)
      this.record('navigation_request', navigation.responseStart - navigation.requestStart)
      this.record('navigation_response', navigation.responseEnd - navigation.responseStart)
      this.record('navigation_dom_processing', navigation.domComplete - navigation.domInteractive)
      this.record('navigation_load_complete', navigation.loadEventEnd - navigation.loadEventStart)
      this.record('navigation_total', navigation.loadEventEnd - navigation.fetchStart)
    }
  }

  /**
   * Track Resource Timing
   */
  trackResourceTiming(): void {
    if (typeof window === 'undefined') return

    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    
    const resourceStats = {
      total: resources.length,
      scripts: 0,
      stylesheets: 0,
      images: 0,
      fonts: 0,
      totalSize: 0,
      totalDuration: 0,
    }

    resources.forEach((resource) => {
      const duration = resource.responseEnd - resource.startTime
      resourceStats.totalDuration += duration

      if (resource.initiatorType === 'script') resourceStats.scripts++
      if (resource.initiatorType === 'link') resourceStats.stylesheets++
      if (resource.initiatorType === 'img') resourceStats.images++
      if (resource.initiatorType === 'css') resourceStats.fonts++

      if ('transferSize' in resource) {
        resourceStats.totalSize += (resource as any).transferSize
      }
    })

    this.record('resources_total', resourceStats.total)
    this.record('resources_scripts', resourceStats.scripts)
    this.record('resources_stylesheets', resourceStats.stylesheets)
    this.record('resources_images', resourceStats.images)
    this.record('resources_duration', resourceStats.totalDuration)
    this.record('resources_size', resourceStats.totalSize / 1024) // KB
  }
}

// Singleton instance
export const performanceTracker = new PerformanceTracker()

/**
 * Hook for tracking component render performance
 */
export function usePerformanceTracking(componentName: string) {
  if (typeof window !== 'undefined') {
    performanceTracker.start(`component_render_${componentName}`)
    
    return () => {
      performanceTracker.end(`component_render_${componentName}`)
    }
  }
  
  return () => {}
}

/**
 * Track dashboard load performance
 */
export function trackDashboardLoad() {
  performanceTracker.start('dashboard_load')
  
  return {
    end: () => performanceTracker.end('dashboard_load'),
    trackDataFetch: (dataType: string) => {
      performanceTracker.start(`dashboard_fetch_${dataType}`)
      return () => performanceTracker.end(`dashboard_fetch_${dataType}`)
    },
  }
}

/**
 * Track API call performance
 */
export async function trackApiCall<T>(
  apiName: string,
  apiCall: () => Promise<T>
): Promise<T> {
  performanceTracker.start(`api_${apiName}`)
  
  try {
    const result = await apiCall()
    performanceTracker.end(`api_${apiName}`, { success: true })
    return result
  } catch (error) {
    performanceTracker.end(`api_${apiName}`, { success: false, error: String(error) })
    throw error
  }
}

/**
 * Initialize performance tracking
 */
export function initPerformanceTracking() {
  if (typeof window === 'undefined') return

  // Track Web Vitals
  performanceTracker.trackWebVitals()

  // Track Navigation Timing after page load
  if (document.readyState === 'complete') {
    performanceTracker.trackNavigationTiming()
    performanceTracker.trackResourceTiming()
  } else {
    window.addEventListener('load', () => {
      performanceTracker.trackNavigationTiming()
      performanceTracker.trackResourceTiming()
    })
  }

  // Flush metrics before page unload
  window.addEventListener('beforeunload', () => {
    performanceTracker.flush()
  })

  // Flush metrics periodically
  setInterval(() => {
    performanceTracker.flush()
  }, 30000) // Every 30 seconds
}

export default performanceTracker

