import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ActivityFeedItemProps {
  icon: React.ReactNode;
  message: React.ReactNode;
  timestamp: string;
  isLoading?: boolean;
}

const ActivityFeedItem: React.FC<ActivityFeedItemProps> = ({
  icon,
  message,
  timestamp,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center space-x-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start space-x-4">
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex-1">
        <div className="text-sm text-gray-200">{message}</div>
        <p className="text-xs text-gray-500">{timestamp}</p>
      </div>
    </div>
  );
};

export default ActivityFeedItem;
