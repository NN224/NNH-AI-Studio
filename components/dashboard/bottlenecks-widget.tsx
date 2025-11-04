'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, TrendingUp, MessageSquare, Star, Clock, ChevronRight } from 'lucide-react';
import { Link } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface Bottleneck {
  type: 'Response' | 'Content' | 'Compliance' | 'Reviews' | 'General';
  count: number;
  message: string;
  link: string;
  severity: 'low' | 'medium' | 'high';
}

interface BottlenecksWidgetProps {
  bottlenecks: Bottleneck[];
  loading?: boolean;
}

const severityConfig = {
  high: {
    color: 'text-red-600',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/50',
    icon: AlertTriangle,
  },
  medium: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/50',
    icon: Clock,
  },
  low: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/50',
    icon: TrendingUp,
  },
};

const typeIcon = {
  Response: MessageSquare,
  Reviews: Star,
  Content: TrendingUp,
  Compliance: Clock,
  General: AlertTriangle,
};

export function BottlenecksWidget({ bottlenecks, loading }: BottlenecksWidgetProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Risk & Opportunity Feed</CardTitle>
          <CardDescription>Analyzing your business performance...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground">Loading insights...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // إذا لم يكن هناك bottlenecks، عرض رسالة إيجابية
  if (bottlenecks.length === 0) {
    return (
      <Card className="border-green-500/50 bg-green-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            All Systems Optimal
          </CardTitle>
          <CardDescription>No critical issues detected. Great job!</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>✅ All reviews responded to</p>
            <p>✅ Customer questions answered</p>
            <p>✅ Rating above target</p>
            <p>✅ Data synced recently</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>AI Risk & Opportunity Feed</span>
          <span className="text-sm font-normal text-muted-foreground">
            {bottlenecks.length} alert{bottlenecks.length > 1 ? 's' : ''}
          </span>
        </CardTitle>
        <CardDescription>Predictive alerts and recommended actions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {bottlenecks.map((bottleneck, index) => {
            const config = severityConfig[bottleneck.severity];
            const Icon = typeIcon[bottleneck.type];
            const SeverityIcon = config.icon;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border transition-all hover:shadow-md',
                    config.bgColor,
                    config.borderColor
                  )}
                >
                  <div className={cn('p-2 rounded-full', config.bgColor)}>
                    <SeverityIcon className={cn('w-4 h-4', config.color)} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className={cn('text-xs font-semibold uppercase', config.color)}>
                        {bottleneck.severity} Priority
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground">{bottleneck.message}</p>
                  </div>

                  <Button
                    asChild
                    size="sm"
                    variant="ghost"
                    className={cn('flex-shrink-0', config.color)}
                  >
                    <Link href={bottleneck.link}>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
