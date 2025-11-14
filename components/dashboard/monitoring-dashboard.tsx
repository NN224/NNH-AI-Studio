'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, AlertTriangle, CheckCircle, Info, RefreshCw, Bell, Activity, Cpu, HardDrive, Wifi } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { monitoringService } from '@/lib/services/monitoring-service';
import { useSafeState, useAsyncEffect } from '@/hooks/use-safe-fetch';
import { useSafeInterval } from '@/hooks/use-safe-timer';
import { cn } from '@/lib/utils';

interface HealthStatus {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  lastChecked: string;
  duration?: number;
}

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  message: string;
  service?: string;
  timestamp: string;
  acknowledged: boolean;
  resolved: boolean;
}

interface Metric {
  name: string;
  value: number;
  unit: 'count' | 'milliseconds' | 'bytes' | 'percentage' | 'custom';
  timestamp: string;
  trend?: 'up' | 'down' | 'stable';
  changePercent?: number;
}

export function MonitoringDashboard() {
  const [healthStatus, setHealthStatus] = useSafeState<HealthStatus[]>([]);
  const [alerts, setAlerts] = useSafeState<Alert[]>([]);
  const [metrics, setMetrics] = useSafeState<Metric[]>([]);
  const [isLoading, setIsLoading] = useSafeState(true);
  const [lastRefresh, setLastRefresh] = useSafeState<Date>(new Date());

  // Fetch health status
  const fetchHealthStatus = async () => {
    try {
      const response = await fetch('/api/health');
      if (response.ok) {
        const data = await response.json();
        const statuses: HealthStatus[] = [
          {
            service: 'Application',
            status: data.status,
            message: data.message,
            lastChecked: new Date().toISOString()
          },
          ...Object.entries(data.services || {}).map(([service, info]: [string, any]) => ({
            service,
            status: info.status,
            message: info.message,
            lastChecked: new Date().toISOString(),
            duration: info.duration
          }))
        ];
        setHealthStatus(statuses);
      }
    } catch (error) {
      console.error('Failed to fetch health status:', error);
    }
  };

  // Fetch alerts
  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/monitoring/alerts');
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  // Fetch metrics
  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/monitoring/metrics?period=24h');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics || []);
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    }
  };

  // Initial load
  useAsyncEffect(async (signal) => {
    setIsLoading(true);
    await Promise.all([
      fetchHealthStatus(),
      fetchAlerts(),
      fetchMetrics()
    ]);
    setIsLoading(false);
    setLastRefresh(new Date());
  }, []);

  // Auto-refresh every 30 seconds
  useSafeInterval(() => {
    Promise.all([
      fetchHealthStatus(),
      fetchAlerts(),
      fetchMetrics()
    ]);
    setLastRefresh(new Date());
  }, 30000);

  const handleRefresh = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchHealthStatus(),
      fetchAlerts(),
      fetchMetrics()
    ]);
    setIsLoading(false);
    setLastRefresh(new Date());
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/monitoring/alerts/${alertId}/acknowledge`, {
        method: 'POST'
      });
      if (response.ok) {
        await fetchAlerts();
      }
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'unhealthy':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'warning';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getMetricIcon = (name: string) => {
    if (name.includes('cpu')) return <Cpu className="h-4 w-4" />;
    if (name.includes('memory') || name.includes('storage')) return <HardDrive className="h-4 w-4" />;
    if (name.includes('network') || name.includes('api')) return <Wifi className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  const formatMetricValue = (value: number, unit: string) => {
    switch (unit) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'milliseconds':
        return `${value.toFixed(0)}ms`;
      case 'bytes':
        if (value > 1e9) return `${(value / 1e9).toFixed(2)}GB`;
        if (value > 1e6) return `${(value / 1e6).toFixed(2)}MB`;
        if (value > 1e3) return `${(value / 1e3).toFixed(2)}KB`;
        return `${value}B`;
      default:
        return value.toFixed(0);
    }
  };

  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged && !a.resolved);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">System Monitoring</h2>
          <p className="text-muted-foreground">
            Real-time monitoring and alerting dashboard
          </p>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">
            Last updated: {formatDistanceToNow(lastRefresh, { addSuffix: true })}
          </p>
          <Button 
            onClick={handleRefresh} 
            disabled={isLoading}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Alert Banner */}
      {unacknowledgedAlerts.length > 0 && (
        <Card className="border-destructive bg-destructive/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5 text-destructive" />
              {unacknowledgedAlerts.length} Unacknowledged Alert{unacknowledgedAlerts.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unacknowledgedAlerts.slice(0, 3).map(alert => (
                <div key={alert.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={getSeverityColor(alert.severity)}>{alert.severity}</Badge>
                    <span className="text-sm">{alert.title}</span>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => handleAcknowledgeAlert(alert.id)}
                  >
                    Acknowledge
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Health Status Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        {healthStatus.map(status => (
          <Card key={status.service}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {getStatusIcon(status.status)}
                {status.service}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {status.message || `Status: ${status.status}`}
              </p>
              {status.duration && (
                <p className="text-xs text-muted-foreground mt-1">
                  Response time: {status.duration}ms
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="logs">System Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {metrics.map(metric => (
              <Card key={metric.name}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    {getMetricIcon(metric.name)}
                    {metric.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </CardTitle>
                  <CardDescription>
                    {metric.trend && (
                      <span className={cn(
                        "text-xs font-medium",
                        metric.trend === 'up' && metric.changePercent && metric.changePercent > 0 && "text-red-500",
                        metric.trend === 'down' && metric.changePercent && metric.changePercent < 0 && "text-green-500"
                      )}>
                        {metric.trend === 'up' ? '↑' : metric.trend === 'down' ? '↓' : '→'}
                        {metric.changePercent && ` ${Math.abs(metric.changePercent).toFixed(1)}%`}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {formatMetricValue(metric.value, metric.unit)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <ScrollArea className="h-[500px] w-full rounded-md border p-4">
            <div className="space-y-4">
              {alerts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No alerts to display
                </p>
              ) : (
                alerts.map(alert => (
                  <Card key={alert.id} className={cn(
                    "border-l-4",
                    alert.severity === 'critical' && "border-l-red-500",
                    alert.severity === 'high' && "border-l-orange-500",
                    alert.severity === 'medium' && "border-l-yellow-500",
                    alert.severity === 'low' && "border-l-blue-500"
                  )}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          {alert.type === 'error' && <AlertCircle className="h-4 w-4" />}
                          {alert.type === 'warning' && <AlertTriangle className="h-4 w-4" />}
                          {alert.type === 'info' && <Info className="h-4 w-4" />}
                          {alert.title}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant={getSeverityColor(alert.severity)}>
                            {alert.severity}
                          </Badge>
                          {alert.service && (
                            <Badge variant="outline">{alert.service}</Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{alert.message}</p>
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                        </p>
                        {!alert.acknowledged && !alert.resolved && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAcknowledgeAlert(alert.id)}
                          >
                            Acknowledge
                          </Button>
                        )}
                        {alert.acknowledged && (
                          <Badge variant="secondary">Acknowledged</Badge>
                        )}
                        {alert.resolved && (
                          <Badge variant="success">Resolved</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Logs</CardTitle>
              <CardDescription>
                Recent system events and diagnostic information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] w-full">
                <p className="text-center text-muted-foreground py-8">
                  Log viewer coming soon...
                </p>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
