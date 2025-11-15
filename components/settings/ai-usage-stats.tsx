'use client';

/**
 * AI Usage Statistics
 * Displays AI usage metrics and costs
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  DollarSign,
  Zap,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface AIRequest {
  id: string;
  provider: string;
  model: string;
  feature: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  latency_ms: number;
  success: boolean;
  created_at: string;
}

interface AIUsageStatsProps {
  userId: string;
  usageData: AIRequest[];
}

export function AIUsageStats({ userId, usageData }: AIUsageStatsProps) {
  const stats = useMemo(() => {
    const totalRequests = usageData.length;
    const successfulRequests = usageData.filter((r) => r.success).length;
    const failedRequests = totalRequests - successfulRequests;
    const totalCost = usageData.reduce((sum, r) => sum + (r.cost_usd || 0), 0);
    const totalTokens = usageData.reduce((sum, r) => sum + (r.total_tokens || 0), 0);
    const avgLatency =
      usageData.length > 0
        ? usageData.reduce((sum, r) => sum + (r.latency_ms || 0), 0) / usageData.length
        : 0;

    // Group by feature
    const byFeature = usageData.reduce((acc, r) => {
      if (!acc[r.feature]) {
        acc[r.feature] = { count: 0, cost: 0 };
      }
      acc[r.feature].count++;
      acc[r.feature].cost += r.cost_usd || 0;
      return acc;
    }, {} as Record<string, { count: number; cost: number }>);

    // Group by provider
    const byProvider = usageData.reduce((acc, r) => {
      if (!acc[r.provider]) {
        acc[r.provider] = { count: 0, cost: 0 };
      }
      acc[r.provider].count++;
      acc[r.provider].cost += r.cost_usd || 0;
      return acc;
    }, {} as Record<string, { count: number; cost: number }>);

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      totalCost,
      totalTokens,
      avgLatency,
      byFeature,
      byProvider,
    };
  }, [usageData]);

  const getFeatureName = (feature: string) => {
    const names: Record<string, string> = {
      dashboard_insights: 'رؤى Dashboard',
      chat_assistant: 'المساعد الذكي',
      automation: 'الأتمتة',
      review_response: 'الرد على المراجعات',
    };
    return names[feature] || feature;
  };

  const getProviderName = (provider: string) => {
    const names: Record<string, string> = {
      openai: 'OpenAI',
      anthropic: 'Anthropic',
      google: 'Google AI',
    };
    return names[provider] || provider;
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الطلبات</p>
                <p className="text-2xl font-bold">{stats.totalRequests}</p>
                <p className="text-xs text-green-600 mt-1">
                  {stats.successfulRequests} ناجح
                </p>
              </div>
              <Zap className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">التكلفة الإجمالية</p>
                <p className="text-2xl font-bold">${stats.totalCost.toFixed(4)}</p>
                <p className="text-xs text-muted-foreground mt-1">USD</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي Tokens</p>
                <p className="text-2xl font-bold">
                  {(stats.totalTokens / 1000).toFixed(1)}K
                </p>
                <p className="text-xs text-muted-foreground mt-1">tokens</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">متوسط الاستجابة</p>
                <p className="text-2xl font-bold">{stats.avgLatency.toFixed(0)}ms</p>
                <p className="text-xs text-muted-foreground mt-1">milliseconds</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Success Rate */}
      <Card>
        <CardHeader>
          <CardTitle>معدل النجاح</CardTitle>
          <CardDescription>نسبة الطلبات الناجحة مقابل الفاشلة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>طلبات ناجحة</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{stats.successfulRequests}</span>
                <Badge className="bg-green-500">
                  {stats.totalRequests > 0
                    ? ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)
                    : 0}
                  %
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <span>طلبات فاشلة</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{stats.failedRequests}</span>
                <Badge variant="destructive">
                  {stats.totalRequests > 0
                    ? ((stats.failedRequests / stats.totalRequests) * 100).toFixed(1)
                    : 0}
                  %
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage by Feature */}
      <Card>
        <CardHeader>
          <CardTitle>الاستخدام حسب الميزة</CardTitle>
          <CardDescription>توزيع الطلبات والتكلفة حسب الميزة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(stats.byFeature).map(([feature, data]) => (
              <div key={feature} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{getFeatureName(feature)}</p>
                  <p className="text-sm text-muted-foreground">{data.count} طلب</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">${data.cost.toFixed(4)}</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.totalCost > 0
                      ? ((data.cost / stats.totalCost) * 100).toFixed(1)
                      : 0}
                    % من الإجمالي
                  </p>
                </div>
              </div>
            ))}

            {Object.keys(stats.byFeature).length === 0 && (
              <p className="text-center text-muted-foreground py-4">لا توجد بيانات</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage by Provider */}
      <Card>
        <CardHeader>
          <CardTitle>الاستخدام حسب المزود</CardTitle>
          <CardDescription>توزيع الطلبات والتكلفة حسب المزود</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(stats.byProvider).map(([provider, data]) => (
              <div key={provider} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{getProviderName(provider)}</p>
                  <p className="text-sm text-muted-foreground">{data.count} طلب</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">${data.cost.toFixed(4)}</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.totalCost > 0
                      ? ((data.cost / stats.totalCost) * 100).toFixed(1)
                      : 0}
                    % من الإجمالي
                  </p>
                </div>
              </div>
            ))}

            {Object.keys(stats.byProvider).length === 0 && (
              <p className="text-center text-muted-foreground py-4">لا توجد بيانات</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

