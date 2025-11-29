// Performance Monitoring and Optimization Utils
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetric[]> = new Map();

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start timing an operation
   */
  startTiming(operationName: string): PerformanceTimer {
    return new PerformanceTimer(operationName, this);
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: PerformanceMetric): void {
    const existing = this.metrics.get(metric.operation) || [];
    existing.push(metric);

    // Keep only last 100 metrics per operation
    if (existing.length > 100) {
      existing.shift();
    }

    this.metrics.set(metric.operation, existing);
  }

  /**
   * Get performance statistics for an operation
   */
  getStats(operationName: string): PerformanceStats | null {
    const metrics = this.metrics.get(operationName);
    if (!metrics || metrics.length === 0) return null;

    const durations = metrics.map((m) => m.duration);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);

    // Calculate percentiles
    const sorted = durations.sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    return {
      operation: operationName,
      count: metrics.length,
      average: avg,
      min,
      max,
      p50,
      p95,
      p99,
      errorRate: metrics.filter((m) => m.error).length / metrics.length,
    };
  }

  /**
   * Get all performance statistics
   */
  getAllStats(): PerformanceStats[] {
    return Array.from(this.metrics.keys())
      .map((op) => this.getStats(op)!)
      .filter(Boolean);
  }

  /**
   * Clear metrics for an operation
   */
  clearMetrics(operationName?: string): void {
    if (operationName) {
      this.metrics.delete(operationName);
    } else {
      this.metrics.clear();
    }
  }
}

export class PerformanceTimer {
  private startTime: number;
  private endTime?: number;

  constructor(
    private operationName: string,
    private monitor: PerformanceMonitor,
  ) {
    this.startTime = performance.now();
  }

  /**
   * End timing and record the metric
   */
  end(error?: Error): void {
    this.endTime = performance.now();
    const duration = this.endTime - this.startTime;

    this.monitor.recordMetric({
      operation: this.operationName,
      duration,
      timestamp: Date.now(),
      error: !!error,
      errorMessage: error?.message,
    });
  }

  /**
   * Get current duration without ending the timer
   */
  getCurrentDuration(): number {
    return performance.now() - this.startTime;
  }
}

export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  error: boolean;
  errorMessage?: string;
}

export interface PerformanceStats {
  operation: string;
  count: number;
  average: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
  errorRate: number;
}

/**
 * Decorator for automatic performance monitoring
 */
export function monitored(operationName?: string) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const opName =
      operationName || `${target?.constructor?.name}.${propertyKey}`;

    descriptor.value = async function (...args: unknown[]) {
      const monitor = PerformanceMonitor.getInstance();
      const timer = monitor.startTiming(opName);

      try {
        const result = await originalMethod.apply(this, args);
        timer.end();
        return result;
      } catch (error) {
        timer.end(error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Cache with performance monitoring
 */
export class MonitoredCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private monitor = PerformanceMonitor.getInstance();

  set(key: string, value: T, ttlMs: number = 300000): void {
    const timer = this.monitor.startTiming("cache.set");

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });

    timer.end();
  }

  get(key: string): T | null {
    const timer = this.monitor.startTiming("cache.get");

    try {
      const entry = this.cache.get(key);

      if (!entry) {
        timer.end();
        return null;
      }

      if (Date.now() > entry.expiresAt) {
        this.cache.delete(key);
        timer.end();
        return null;
      }

      timer.end();
      return entry.value;
    } catch (error) {
      timer.end(error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  clear(): void {
    const timer = this.monitor.startTiming("cache.clear");
    this.cache.clear();
    timer.end();
  }

  size(): number {
    return this.cache.size;
  }
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Performance-aware async operation wrapper
 */
export async function withPerformanceMonitoring<T>(
  operationName: string,
  operation: () => Promise<T>,
): Promise<T> {
  const monitor = PerformanceMonitor.getInstance();
  const timer = monitor.startTiming(operationName);

  try {
    const result = await operation();
    timer.end();
    return result;
  } catch (error) {
    timer.end(error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Batch operation with performance monitoring
 */
export async function batchWithMonitoring<T, R>(
  operationName: string,
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 10,
): Promise<R[]> {
  const monitor = PerformanceMonitor.getInstance();
  const timer = monitor.startTiming(`${operationName}.batch`);

  try {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchTimer = monitor.startTiming(`${operationName}.batch.${i}`);

      try {
        const batchResults = await Promise.all(batch.map(processor));
        results.push(...batchResults);
        batchTimer.end();
      } catch (error) {
        batchTimer.end(
          error instanceof Error ? error : new Error(String(error)),
        );
        throw error;
      }
    }

    timer.end();
    return results;
  } catch (error) {
    timer.end(error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
