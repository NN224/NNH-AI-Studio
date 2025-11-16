import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  isLoading?: boolean;
  trend?: number;
  suffix?: string;
  alert?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  change,
  changeType = 'neutral',
  isLoading = false,
  trend,
  suffix,
  alert = false,
}) => {
  const changeColor = {
    positive: 'text-green-500',
    negative: 'text-red-500',
    neutral: 'text-muted-foreground',
  };

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300",
      alert && "border-orange-500/50 bg-orange-500/5"
    )}>
      {alert && (
        <motion.div
          className="absolute top-2 right-2"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <AlertCircle className="h-4 w-4 text-orange-500" />
        </motion.div>
      )}
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-3/4" />
        ) : (
          <motion.div 
            className="text-2xl font-bold"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {value}{suffix && <span className="text-lg text-muted-foreground ml-1">{suffix}</span>}
          </motion.div>
        )}
        
        {isLoading ? (
          <Skeleton className="mt-1 h-4 w-1/2" />
        ) : (
          <div className="mt-1 flex items-center gap-2">
            {change && (
              <p className={cn('text-xs flex items-center gap-1', changeColor[changeType])}>
                {changeType === 'positive' && <TrendingUp className="h-3 w-3" />}
                {changeType === 'negative' && <TrendingDown className="h-3 w-3" />}
                {change}
              </p>
            )}
            {trend !== undefined && (
              <p className={cn(
                'text-xs flex items-center gap-1',
                trend > 0 ? 'text-green-500' : trend < 0 ? 'text-red-500' : 'text-muted-foreground'
              )}>
                {trend > 0 ? <TrendingUp className="h-3 w-3" /> : trend < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                {trend > 0 ? '+' : ''}{trend}%
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;
