import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  isLoading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  change,
  changeType = 'neutral',
  isLoading = false,
}) => {
  const changeColor = {
    positive: 'text-green-500',
    negative: 'text-red-500',
    neutral: 'text-gray-500',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-3/4" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        {isLoading ? (
          <Skeleton className="mt-1 h-4 w-1/2" />
        ) : (
          change && (
            <p className={cn('text-xs', changeColor[changeType])}>
              {change}
            </p>
          )
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;
