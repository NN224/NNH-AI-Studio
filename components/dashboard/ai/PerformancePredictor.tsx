'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Calculator, TrendingUp } from 'lucide-react';

type Point = { date: string; value: number };

function forecastNext(points: Point[], days = 7) {
  if (points.length < 2) return { prediction: 0, pct: 0 };
  // simple linear regression y = a + b*x
  const xs = points.map((_, i) => i + 1);
  const ys = points.map((p) => p.value);
  const n = xs.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const sumXX = xs.reduce((a, x) => a + x * x, 0);
  const b = (n * sumXY - sumX * sumY) / Math.max(1, n * sumXX - sumX * sumX);
  const a = sumY / n - b * (sumX / n);
  const lastX = xs[xs.length - 1];
  const nextX = lastX + days;
  const prediction = Math.max(0, Math.round(a + b * nextX));
  const lastVal = ys[ys.length - 1] || 1;
  const pct = Math.round(((prediction - lastVal) / lastVal) * 100);
  return { prediction, pct };
}

export default function PerformancePredictor({ data }: { data: Point[] }) {
  const { prediction, pct } = useMemo(() => forecastNext(data || [], 7), [data]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="h-4 w-4 text-primary" />
          AI Performance Predictor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Next 7 days:</span> {prediction} views ({pct >= 0 ? '+' : ''}{pct}%)
        </div>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Tooltip />
              <Line dataKey="value" stroke="#FF8A00" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          Simple linear forecast based on your recent views.
        </div>
      </CardContent>
    </Card>
  );
}


