/**
 * Dashboard Performance Monitoring
 *
 * Tracks and logs performance metrics for the dashboard
 * Helps identify bottlenecks and optimize load times
 */

import * as Sentry from "@sentry/nextjs";

// =====================================================
// Types
// =====================================================

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: "ms" | "bytes" | "count";
  timestamp: number;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface DashboardPerformanceData {
  pageLoadTime: number;
  dataFetchTime: number;
  cacheHitRate: number;
  queryCount: number;
  errorCount: number;
  timestamp: number;
}

// =====================================================
// Performance Tracking
// =====================================================

const metrics: PerformanceMetric[] = [];
const MAX_METRICS = 1000; // Keep last 1000 metrics in memory

/**
 * Record a performance metric
 */
export function recordMetric(metric: Omit<PerformanceMetric, "timestamp">) {
  const fullMetric: PerformanceMetric = {
    ...metric,
    timestamp: Date.now(),
  };

  metrics.push(fullMetric);

  // Keep only last MAX_METRICS
  if (metrics.length > MAX_METRICS) {
    metrics.shift();
  }

  // Log to console in development
  if (process.env.NODE_ENV === "development") {
    console.log(
      `[Performance] ${metric.name}: ${metric.value}${metric.unit}`,
      metric.metadata,
    );
  }

  // Send to Sentry for monitoring
  if (metric.value > getThreshold(metric.name)) {
    Sentry.captureMessage(`Performance threshold exceeded: ${metric.name}`, {
      level: "warning",
      tags: {
        metric: metric.name,
        userId: metric.userId,
      },
      extra: {
        value: metric.value,
        unit: metric.unit,
        threshold: getThreshold(metric.name),
        metadata: metric.metadata,
      },
    });
  }
}

/**
 * Get performance threshold for a metric
 */
function getThreshold(metricName: string): number {
  const thresholds: Record<string, number> = {
    "dashboard.load": 1000, // 1 second
    "dashboard.data_fetch": 500, // 500ms
    "dashboard.cache_miss": 300, // 300ms
    "dashboard.query": 200, // 200ms
    "dashboard.render": 100, // 100ms
  };

  return thresholds[metricName] || 1000;
}

/**
 * Get metrics summary
 */
export function getMetricsSummary(metricName?: string): {
  count: number;
  avg: number;
  min: number;
  max: number;
  p95: number;
} {
  const filtered = metricName
    ? metrics.filter((m) => m.name === metricName)
    : metrics;

  if (filtered.length === 0) {
    return { count: 0, avg: 0, min: 0, max: 0, p95: 0 };
  }

  const values = filtered.map((m) => m.value).sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const p95Index = Math.floor(values.length * 0.95);

  return {
    count: values.length,
    avg: sum / values.length,
    min: values[0],
    max: values[values.length - 1],
    p95: values[p95Index] || 0,
  };
}

/**
 * Clear all metrics
 */
export function clearMetrics() {
  metrics.length = 0;
}

// =====================================================
// Dashboard-specific Tracking
// =====================================================

/**
 * Track dashboard page load
 */
export function trackDashboardLoad(data: {
  loadTime: number;
  userId: string;
  fromCache: boolean;
  queryCount: number;
}) {
  recordMetric({
    name: "dashboard.load",
    value: data.loadTime,
    unit: "ms",
    userId: data.userId,
    metadata: {
      fromCache: data.fromCache,
      queryCount: data.queryCount,
    },
  });
}

/**
 * Track data fetch operation
 */
export function trackDataFetch(data: {
  operation: string;
  duration: number;
  userId: string;
  fromCache: boolean;
  success: boolean;
}) {
  recordMetric({
    name: `dashboard.data_fetch.${data.operation}`,
    value: data.duration,
    unit: "ms",
    userId: data.userId,
    metadata: {
      fromCache: data.fromCache,
      success: data.success,
    },
  });
}

/**
 * Track cache performance
 */
export function trackCachePerformance(data: {
  operation: "hit" | "miss";
  key: string;
  userId: string;
  duration?: number;
}) {
  recordMetric({
    name: `dashboard.cache.${data.operation}`,
    value: data.duration || 0,
    unit: "ms",
    userId: data.userId,
    metadata: {
      key: data.key,
    },
  });
}

/**
 * Track database query
 */
export function trackQuery(data: {
  query: string;
  duration: number;
  userId: string;
  rowCount?: number;
}) {
  recordMetric({
    name: "dashboard.query",
    value: data.duration,
    unit: "ms",
    userId: data.userId,
    metadata: {
      query: data.query,
      rowCount: data.rowCount,
    },
  });
}

/**
 * Track error
 */
export function trackError(data: {
  error: Error;
  context: string;
  userId?: string;
}) {
  recordMetric({
    name: "dashboard.error",
    value: 1,
    unit: "count",
    userId: data.userId,
    metadata: {
      error: data.error.message,
      context: data.context,
      stack: data.error.stack,
    },
  });

  // Also send to Sentry
  Sentry.captureException(data.error, {
    tags: {
      context: data.context,
      userId: data.userId,
    },
  });
}

// =====================================================
// Performance Timer Utility
// =====================================================

export class PerformanceTimer {
  private startTime: number;
  private name: string;
  private userId?: string;
  private metadata?: Record<string, any>;

  constructor(name: string, userId?: string, metadata?: Record<string, any>) {
    this.name = name;
    this.userId = userId;
    this.metadata = metadata;
    this.startTime = performance.now();
  }

  /**
   * End the timer and record the metric
   */
  end(additionalMetadata?: Record<string, any>) {
    const duration = performance.now() - this.startTime;

    recordMetric({
      name: this.name,
      value: Math.round(duration),
      unit: "ms",
      userId: this.userId,
      metadata: {
        ...this.metadata,
        ...additionalMetadata,
      },
    });

    return duration;
  }
}

// =====================================================
// Client-side Performance Tracking
// =====================================================

/**
 * Track Web Vitals (for client-side)
 */
export function trackWebVitals(metric: {
  name: string;
  value: number;
  id: string;
  label: "web-vital" | "custom";
}) {
  // Send to analytics
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", metric.name, {
      value: Math.round(
        metric.name === "CLS" ? metric.value * 1000 : metric.value,
      ),
      event_category:
        metric.label === "web-vital" ? "Web Vitals" : "Custom Metrics",
      event_label: metric.id,
      non_interaction: true,
    });
  }

  // Log to console in development
  if (process.env.NODE_ENV === "development") {
    console.log(`[Web Vital] ${metric.name}:`, metric.value);
  }
}

// =====================================================
// Performance Report
// =====================================================

/**
 * Generate performance report
 */
export function generatePerformanceReport(): {
  summary: Record<string, ReturnType<typeof getMetricsSummary>>;
  recentMetrics: PerformanceMetric[];
  recommendations: string[];
} {
  const metricNames = [...new Set(metrics.map((m) => m.name))];
  const summary: Record<string, ReturnType<typeof getMetricsSummary>> = {};

  metricNames.forEach((name) => {
    summary[name] = getMetricsSummary(name);
  });

  // Get last 50 metrics
  const recentMetrics = metrics.slice(-50);

  // Generate recommendations
  const recommendations: string[] = [];

  // Check cache hit rate
  const cacheHits = metrics.filter(
    (m) => m.name === "dashboard.cache.hit",
  ).length;
  const cacheMisses = metrics.filter(
    (m) => m.name === "dashboard.cache.miss",
  ).length;
  const cacheHitRate = cacheHits / (cacheHits + cacheMisses);

  if (cacheHitRate < 0.7) {
    recommendations.push(
      "Cache hit rate is low (<70%). Consider increasing cache TTL or warming cache more aggressively.",
    );
  }

  // Check average load time
  const loadSummary = getMetricsSummary("dashboard.load");
  if (loadSummary.avg > 1000) {
    recommendations.push(
      "Average page load time exceeds 1 second. Investigate slow queries or add more caching.",
    );
  }

  // Check query count
  const queryMetrics = metrics.filter((m) => m.name === "dashboard.query");
  const avgQueriesPerLoad =
    queryMetrics.length /
    metrics.filter((m) => m.name === "dashboard.load").length;

  if (avgQueriesPerLoad > 5) {
    recommendations.push(
      `Average of ${avgQueriesPerLoad.toFixed(1)} queries per page load. Consider using materialized views or combining queries.`,
    );
  }

  return {
    summary,
    recentMetrics,
    recommendations,
  };
}
