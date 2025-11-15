'use client';

/**
 * AI Insights Panel
 * Displays AI-generated business insights, predictions, and recommendations
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Target,
  Activity,
  Zap,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { AIInsightsResponse, AIInsight, AIPrediction, AIAnomaly } from '@/lib/types/ai';

interface AIInsightsPanelProps {
  userId: string;
}

export function AIInsightsPanel({ userId }: AIInsightsPanelProps) {
  const router = useRouter();
  const [insights, setInsights] = useState<AIInsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/ai/insights');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch insights');
      }

      const data: AIInsightsResponse = await response.json();
      setInsights(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load AI insights');
      console.error('Failed to fetch AI insights:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    
    // Invalidate cache
    await fetch('/api/ai/insights', { method: 'DELETE' });
    
    // Fetch new insights
    await fetchInsights();
  };

  const handleActionClick = (action: any) => {
    if (action.actionType === 'navigate' && action.actionUrl) {
      router.push(action.actionUrl);
    } else if (action.actionType === 'external_link' && action.actionUrl) {
      window.open(action.actionUrl, '_blank');
    }
  };

  if (loading) {
    return <AIInsightsSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          {error.includes('API key') && (
            <Button
              onClick={() => router.push('/settings/ai')}
              variant="outline"
              className="mt-4"
            >
              Configure AI Settings
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                AI-Powered Insights
              </CardTitle>
              <CardDescription>
                Generated {new Date(insights.generatedAt).toLocaleString()}
              </CardDescription>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{insights.summary}</p>
        </CardContent>
      </Card>

      {/* Predictions */}
      {insights.predictions && insights.predictions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Predictions
            </CardTitle>
            <CardDescription>AI-powered forecasts for your business</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {insights.predictions.map((prediction, index) => (
                <PredictionCard key={index} prediction={prediction} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Anomalies */}
      {insights.anomalies && insights.anomalies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Anomalies Detected
            </CardTitle>
            <CardDescription>Unusual patterns in your data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.anomalies.map((anomaly, index) => (
                <AnomalyCard key={index} anomaly={anomaly} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights & Recommendations */}
      {insights.insights && insights.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              Recommendations
            </CardTitle>
            <CardDescription>Actionable insights to improve your business</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.insights.map((insight) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  onActionClick={handleActionClick}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Insight Card Component
 */
function InsightCard({
  insight,
  onActionClick,
}: {
  insight: AIInsight;
  onActionClick: (action: any) => void;
}) {
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'prediction':
        return <TrendingUp className="h-4 w-4" />;
      case 'anomaly':
        return <AlertTriangle className="h-4 w-4" />;
      case 'recommendation':
        return <Target className="h-4 w-4" />;
      case 'trend':
        return <Activity className="h-4 w-4" />;
      default:
        return <Zap className="h-4 w-4" />;
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className="mt-1">{getTypeIcon(insight.type)}</div>
          <div className="flex-1">
            <h4 className="font-medium">{insight.title}</h4>
            <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getImpactColor(insight.impact)}>{insight.impact}</Badge>
          <Badge variant="outline">{insight.confidence}% confident</Badge>
        </div>
      </div>

      {insight.suggestedActions && insight.suggestedActions.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {insight.suggestedActions.map((action, index) => (
            <Button
              key={index}
              onClick={() => onActionClick(action)}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              {action.label}
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Prediction Card Component
 */
function PredictionCard({ prediction }: { prediction: AIPrediction }) {
  const isPositive = prediction.change > 0;

  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">{prediction.metric}</h4>
        <Badge variant="outline">{prediction.confidence}% confident</Badge>
      </div>
      
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold">{prediction.predictedValue.toFixed(2)}</span>
        <span className="text-sm text-muted-foreground">
          from {prediction.currentValue.toFixed(2)}
        </span>
      </div>

      <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? (
          <TrendingUp className="h-4 w-4" />
        ) : (
          <TrendingDown className="h-4 w-4" />
        )}
        <span>
          {isPositive ? '+' : ''}
          {prediction.changePercent.toFixed(1)}% ({prediction.timeframe})
        </span>
      </div>

      {prediction.factors && prediction.factors.length > 0 && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-1">Key factors:</p>
          <ul className="text-xs space-y-1">
            {prediction.factors.slice(0, 3).map((factor, index) => (
              <li key={index} className="flex items-start gap-1">
                <span className="text-muted-foreground">•</span>
                <span>{factor}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Anomaly Card Component
 */
function AnomalyCard({ anomaly }: { anomaly: AIAnomaly }) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {anomaly.metric}
        </h4>
        <Badge className={getSeverityColor(anomaly.severity)}>{anomaly.severity}</Badge>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Expected</p>
          <p className="font-medium">{anomaly.expectedValue.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Actual</p>
          <p className="font-medium">{anomaly.actualValue.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Deviation</p>
          <p className={`font-medium ${anomaly.deviation > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {anomaly.deviation > 0 ? '+' : ''}
            {anomaly.deviation.toFixed(1)}%
          </p>
        </div>
      </div>

      {anomaly.possibleCauses && anomaly.possibleCauses.length > 0 && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-1">Possible causes:</p>
          <ul className="text-xs space-y-1">
            {anomaly.possibleCauses.map((cause, index) => (
              <li key={index} className="flex items-start gap-1">
                <span className="text-muted-foreground">•</span>
                <span>{cause}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Loading Skeleton
 */
function AIInsightsSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4 mt-2" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

