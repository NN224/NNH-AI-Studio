'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface FeedItemProps {
  readonly priority: 'HIGH' | 'MEDIUM';
  readonly title: string;
  readonly description: string;
  readonly actionText: string;
  readonly actionLink: string;
  readonly isExpanded: boolean;
  readonly onToggle: () => void;
}

export function FeedItem({
  priority,
  title,
  description,
  actionText,
  actionLink,
  isExpanded,
  onToggle,
}: Readonly<FeedItemProps>) {
  const router = useRouter();

  return (
    <Card
      className={cn(
        'bg-zinc-800/50 border-l-4 transition-all',
        priority === 'HIGH' ? 'border-red-500' : 'border-yellow-500'
      )}
    >
      <button
        type="button"
        className="p-4 cursor-pointer select-none w-full text-left"
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div
              className={cn(
                'inline-flex items-center gap-2 px-2 py-1 rounded text-xs',
                priority === 'HIGH'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              )}
            >
              {priority} PRIORITY
            </div>
            <p className="text-zinc-200 text-sm mt-2">{title}</p>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-zinc-400 mt-1" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-400 mt-1" />
          )}
        </div>
        {isExpanded && (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-zinc-400">{description}</p>
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                router.push(actionLink);
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {actionText}
            </Button>
          </div>
        )}
      </button>
    </Card>
  );
}


