'use client';

import { useState } from 'react';
import { FeedItem } from '@/components/dashboard/FeedItem';

type Alert = Readonly<{
  priority: 'HIGH' | 'MEDIUM';
  message: string;
  type: string;
  icon: string;
}>;

export function ExpandableFeed({ alerts }: Readonly<{ alerts: ReadonlyArray<Alert> }>) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const getAction = (type: string) => {
    if (type === 'reviews') return { text: 'Reply to Reviews', link: '/reviews', description: 'Respond quickly to maintain high engagement' };
    if (type === 'questions') return { text: 'Answer Questions', link: '/questions', description: 'Provide timely answers to improve trust' };
    if (type === 'response_rate') return { text: 'Improve Response Rate', link: '/reviews', description: 'Aim for at least 80% response rate' };
    return { text: 'View Details', link: '/dashboard', description: 'Open details' };
  };

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        const uniqueKey = `${alert.type}-${alert.message}`;
        const action = getAction(alert.type);
        return (
          <FeedItem
            key={uniqueKey}
            priority={alert.priority}
            title={alert.message}
            description={action.description}
            actionText={action.text}
            actionLink={action.link}
            isExpanded={expanded === uniqueKey}
            onToggle={() => setExpanded((prev) => (prev === uniqueKey ? null : uniqueKey))}
          />
        );
      })}
    </div>
  );
}


