'use client';

/**
 * Automation Insights Component
 * Displays AI autopilot status and automation metrics
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Zap,
  CheckCircle2,
  Clock,
  TrendingUp,
  Activity,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { AutomationStatus, UpcomingAction, AutomationLog } from '@/lib/types/ai';

interface AutomationInsightsProps {
  userId: string;
}

export function AutomationInsights({ userId }: AutomationInsightsProps) {
  const [status, setStatus] = useState<AutomationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAutomationStatus();
  }, []);

  const fetchAutomationStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/ai/automation-status');
      
      if (!response.ok) {
        throw new Error('Failed to fetch automation status');
      }

      const data: AutomationStatus = await response.json();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load automation status');
      console.error('Failed to fetch automation status:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <AutomationInsightsSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            AI Automation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Automations</p>
                <p className="text-2xl font-bold">{status.activeAutomations}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  of {status.totalAutomations} total
                </p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{(status.successRate * 100).toFixed(1)}%</p>
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Excellent
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Time Saved</p>
                <p className="text-2xl font-bold">{status.timeSavedHours.toFixed(1)}h</p>
                <p className="text-xs text-muted-foreground mt-1">this week</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold">{status.upcomingActions.length}</p>
                <p className="text-xs text-muted-foreground mt-1">scheduled actions</p>
              </div>
              <Calendar className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Actions */}
      {status.upcomingActions && status.upcomingActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Scheduled Actions
            </CardTitle>
            <CardDescription>AI-powered actions scheduled to run</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {status.upcomingActions.map((action) => (
                <UpcomingActionCard key={action.id} action={action} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      {status.recentLogs && status.recentLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Automation Activity
            </CardTitle>
            <CardDescription>Latest AI autopilot actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {status.recentLogs.map((log) => (
                <AutomationLogCard key={log.id} log={log} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Upcoming Action Card
 */
function UpcomingActionCard({ action }: { action: UpcomingAction }) {
  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg">
      <div className="flex-shrink-0 mt-1">
        <Calendar className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="font-medium text-sm">{action.description}</p>
            <p className="text-xs text-muted-foreground mt-1">{action.locationName}</p>
          </div>
          <Badge variant="outline" className="flex-shrink-0">
            {action.type}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Scheduled for {formatDistanceToNow(new Date(action.scheduledAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

/**
 * Automation Log Card
 */
function AutomationLogCard({ log }: { log: AutomationLog }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg">
      <div className="flex-shrink-0 mt-1">{getStatusIcon(log.status)}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="font-medium text-sm">{log.action_description}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge className={getStatusColor(log.status)}>{log.status}</Badge>
            <Badge variant="outline">{log.action_type}</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Loading Skeleton
 */
function AutomationInsightsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

