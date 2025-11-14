/**
 * Comprehensive monitoring and alerting service
 * Tracks application health, performance, and business metrics
 */

import { errorLogger } from './error-logger';

export interface MetricEvent {
  name: string;
  value: number;
  unit?: 'count' | 'milliseconds' | 'bytes' | 'percentage';
  tags?: Record<string, string>;
  timestamp?: Date;
}

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  duration: number;
  timestamp: Date;
}

export interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  message: string;
  service?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  acknowledged?: boolean;
}

export interface MonitoringConfig {
  enableRealTimeAlerts: boolean;
  enablePerformanceTracking: boolean;
  enableBusinessMetrics: boolean;
  alertWebhookUrl?: string;
  slackWebhookUrl?: string;
  emailAlerts?: string[];
}

class MonitoringService {
  private static instance: MonitoringService;
  private config: MonitoringConfig;
  private metricsBuffer: MetricEvent[] = [];
  private alertsBuffer: Alert[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.config = {
      enableRealTimeAlerts: process.env.NODE_ENV === 'production',
      enablePerformanceTracking: true,
      enableBusinessMetrics: true,
      alertWebhookUrl: process.env.MONITORING_WEBHOOK_URL,
      slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
      emailAlerts: process.env.ALERT_EMAILS?.split(','),
    };

    // Start periodic flush
    this.startPeriodicFlush();
  }

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  /**
   * Track a metric event
   */
  trackMetric(event: MetricEvent): void {
    if (!this.config.enablePerformanceTracking) return;

    const metric: MetricEvent = {
      ...event,
      timestamp: event.timestamp || new Date(),
    };

    this.metricsBuffer.push(metric);

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Metric] ${event.name}: ${event.value} ${event.unit || ''}`);
    }

    // Flush if buffer is getting large
    if (this.metricsBuffer.length > 100) {
      this.flushMetrics();
    }
  }

  /**
   * Track API performance
   */
  async trackAPICall(
    endpoint: string,
    method: string,
    execute: () => Promise<Response>
  ): Promise<Response> {
    const startTime = Date.now();
    let status = 'success';

    try {
      const response = await execute();
      
      if (!response.ok) {
        status = 'error';
      }

      const duration = Date.now() - startTime;
      
      this.trackMetric({
        name: 'api.request.duration',
        value: duration,
        unit: 'milliseconds',
        tags: {
          endpoint,
          method,
          status,
          statusCode: response.status.toString(),
        },
      });

      // Alert on slow requests
      if (duration > 3000) {
        this.createAlert({
          type: 'warning',
          severity: duration > 10000 ? 'high' : 'medium',
          title: 'Slow API Request',
          message: `${method} ${endpoint} took ${duration}ms`,
          service: 'api',
          metadata: { endpoint, method, duration },
        });
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.trackMetric({
        name: 'api.request.error',
        value: 1,
        unit: 'count',
        tags: { endpoint, method },
      });

      this.createAlert({
        type: 'error',
        severity: 'high',
        title: 'API Request Failed',
        message: `${method} ${endpoint} failed: ${error}`,
        service: 'api',
        metadata: { endpoint, method, error: String(error) },
      });

      throw error;
    }
  }

  /**
   * Track business metrics
   */
  trackBusinessMetric(metric: {
    name: string;
    value: number;
    locationId?: string;
    userId?: string;
  }): void {
    if (!this.config.enableBusinessMetrics) return;

    this.trackMetric({
      name: `business.${metric.name}`,
      value: metric.value,
      unit: 'count',
      tags: {
        ...(metric.locationId && { locationId: metric.locationId }),
        ...(metric.userId && { userId: metric.userId }),
      },
    });
  }

  /**
   * Perform health checks
   */
  async performHealthChecks(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];

    // Database health check
    results.push(await this.checkDatabase());

    // API health checks
    results.push(await this.checkExternalAPIs());

    // Memory usage check
    results.push(await this.checkMemoryUsage());

    // Check for degraded services
    const unhealthyServices = results.filter(r => r.status !== 'healthy');
    if (unhealthyServices.length > 0) {
      this.createAlert({
        type: 'error',
        severity: unhealthyServices.some(s => s.status === 'unhealthy') ? 'critical' : 'high',
        title: 'Service Health Degradation',
        message: `${unhealthyServices.length} services are experiencing issues`,
        metadata: { services: unhealthyServices },
      });
    }

    return results;
  }

  /**
   * Create an alert
   */
  createAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>): void {
    if (!this.config.enableRealTimeAlerts && alert.severity !== 'critical') {
      return;
    }

    const fullAlert: Alert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      acknowledged: false,
    };

    this.alertsBuffer.push(fullAlert);

    // Log the alert
    errorLogger.logError(
      new Error(alert.message),
      {
        component: 'monitoring',
        action: 'alert',
        metadata: { alert: fullAlert },
      },
      alert.type === 'error' ? 'error' : alert.type === 'warning' ? 'warning' : 'info'
    );

    // Send immediate notification for critical alerts
    if (alert.severity === 'critical') {
      this.sendImmediateNotification(fullAlert);
    }
  }

  /**
   * Check database health
   */
  private async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const response = await fetch('/api/health/database', {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      const duration = Date.now() - startTime;

      if (response.ok) {
        return {
          service: 'database',
          status: duration > 2000 ? 'degraded' : 'healthy',
          duration,
          timestamp: new Date(),
        };
      } else {
        return {
          service: 'database',
          status: 'unhealthy',
          message: `Database check failed with status ${response.status}`,
          duration,
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return {
        service: 'database',
        status: 'unhealthy',
        message: `Database check error: ${error}`,
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check external API health
   */
  private async checkExternalAPIs(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const apiChecks = [];

    // Check Google API
    if (process.env.GOOGLE_API_KEY) {
      apiChecks.push({
        name: 'google',
        url: 'https://www.googleapis.com/oauth2/v1/tokeninfo',
      });
    }

    // Add other API checks as needed

    let failedChecks = 0;
    for (const api of apiChecks) {
      try {
        const response = await fetch(api.url, {
          method: 'GET',
          signal: AbortSignal.timeout(3000),
        });
        
        if (!response.ok) {
          failedChecks++;
        }
      } catch {
        failedChecks++;
      }
    }

    const duration = Date.now() - startTime;

    return {
      service: 'external_apis',
      status: failedChecks === 0 ? 'healthy' : failedChecks < apiChecks.length ? 'degraded' : 'unhealthy',
      message: failedChecks > 0 ? `${failedChecks} API checks failed` : undefined,
      duration,
      timestamp: new Date(),
    };
  }

  /**
   * Check memory usage
   */
  private async checkMemoryUsage(): Promise<HealthCheckResult> {
    if (typeof window === 'undefined' || !('memory' in performance)) {
      return {
        service: 'memory',
        status: 'healthy',
        message: 'Memory monitoring not available',
        duration: 0,
        timestamp: new Date(),
      };
    }

    const memInfo = (performance as any).memory;
    const usedMB = memInfo.usedJSHeapSize / 1024 / 1024;
    const limitMB = memInfo.jsHeapSizeLimit / 1024 / 1024;
    const percentage = (usedMB / limitMB) * 100;

    this.trackMetric({
      name: 'memory.usage',
      value: usedMB,
      unit: 'bytes',
      tags: { type: 'heap' },
    });

    return {
      service: 'memory',
      status: percentage > 90 ? 'unhealthy' : percentage > 70 ? 'degraded' : 'healthy',
      message: `Memory usage: ${usedMB.toFixed(2)}MB / ${limitMB.toFixed(2)}MB (${percentage.toFixed(1)}%)`,
      duration: 0,
      timestamp: new Date(),
    };
  }

  /**
   * Send immediate notification for critical alerts
   */
  private async sendImmediateNotification(alert: Alert): Promise<void> {
    // Send to Slack
    if (this.config.slackWebhookUrl) {
      try {
        await fetch(this.config.slackWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `:rotating_light: ${alert.title}`,
            attachments: [{
              color: 'danger',
              fields: [
                { title: 'Message', value: alert.message, short: false },
                { title: 'Service', value: alert.service || 'Unknown', short: true },
                { title: 'Severity', value: alert.severity, short: true },
              ],
              footer: 'GMB Dashboard Monitoring',
              ts: Math.floor(alert.timestamp.getTime() / 1000),
            }],
          }),
        });
      } catch (error) {
        console.error('Failed to send Slack notification:', error);
      }
    }

    // Send to custom webhook
    if (this.config.alertWebhookUrl) {
      try {
        await fetch(this.config.alertWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alert),
        });
      } catch (error) {
        console.error('Failed to send webhook notification:', error);
      }
    }
  }

  /**
   * Flush metrics to storage/external service
   */
  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    const metrics = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      await fetch('/api/monitoring/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics }),
      });
    } catch (error) {
      console.error('Failed to flush metrics:', error);
      // Put metrics back in buffer
      this.metricsBuffer.unshift(...metrics);
    }
  }

  /**
   * Flush alerts to storage
   */
  private async flushAlerts(): Promise<void> {
    if (this.alertsBuffer.length === 0) return;

    const alerts = [...this.alertsBuffer];
    this.alertsBuffer = [];

    try {
      await fetch('/api/monitoring/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alerts }),
      });
    } catch (error) {
      console.error('Failed to flush alerts:', error);
      // Put alerts back in buffer
      this.alertsBuffer.unshift(...alerts);
    }
  }

  /**
   * Start periodic flush of metrics and alerts
   */
  private startPeriodicFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flushMetrics();
      this.flushAlerts();
    }, 60000); // Flush every minute
  }

  /**
   * Stop monitoring service
   */
  stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    // Final flush
    this.flushMetrics();
    this.flushAlerts();
  }
}

// Export singleton instance
export const monitoringService = MonitoringService.getInstance();

// Export convenience functions
export function trackMetric(event: MetricEvent): void {
  monitoringService.trackMetric(event);
}

export function trackBusinessMetric(metric: {
  name: string;
  value: number;
  locationId?: string;
  userId?: string;
}): void {
  monitoringService.trackBusinessMetric(metric);
}

export function createAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>): void {
  monitoringService.createAlert(alert);
}

export async function performHealthChecks(): Promise<HealthCheckResult[]> {
  return monitoringService.performHealthChecks();
}
