'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Send, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

type ActivityItem = {
  id: string;
  message: string;
  created_at: string;
};

type MiniChatProps = {
  stats?: {
    total_reviews?: number;
    avg_rating?: number;
    pending_reviews?: number;
    pending_questions?: number;
    reviews_this_month?: number;
    response_rate?: number;
  } | null;
  activityFeed?: ActivityItem[] | null;
  className?: string;
};

function timeAgo(iso?: string) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function MiniChat({ stats, activityFeed, className }: MiniChatProps) {
  const [messages, setMessages] = useState<{ role: 'ai' | 'user'; text: string }[]>([
    {
      role: 'ai',
      text: 'Hi! Ask me for a quick update about reviews, questions, posts, or performance.',
    },
  ]);
  const [input, setInput] = useState('');
  const latestActivity = useMemo(() => (activityFeed || []).slice(0, 3), [activityFeed]);

  function buildQuickUpdate(kind: 'any' | 'reviews' | 'questions' | 'posts' | 'performance') {
    const lines: string[] = [];
    if (kind === 'any' || kind === 'reviews') {
      lines.push(
        `Reviews: ${stats?.total_reviews ?? 0} total, rating ${Number(stats?.avg_rating ?? 0).toFixed(1)}/5`
      );
      lines.push(`Pending reviews: ${stats?.pending_reviews ?? 0}`);
      if (stats?.reviews_this_month !== undefined) {
        lines.push(`This month: ${stats.reviews_this_month}`);
      }
    }
    if (kind === 'any' || kind === 'questions') {
      lines.push(`Pending questions: ${stats?.pending_questions ?? 0}`);
    }
    if (kind === 'any' || kind === 'performance') {
      const rr = stats?.response_rate ?? 0;
      lines.push(`Response rate: ${rr}%`);
      if (rr < 60) lines.push('Tip: Reply to pending reviews to boost visibility.');
    }
    if (latestActivity.length) {
      lines.push('Recent activity:');
      latestActivity.forEach((a) => lines.push(`• ${a.message} (${timeAgo(a.created_at)})`));
    }
    return lines.join('\n');
  }

  function handlePrompt(preset: 'any' | 'reviews' | 'questions' | 'posts' | 'performance') {
    const ai = buildQuickUpdate(preset);
    setMessages((prev) => [...prev, { role: 'user', text: preset === 'any' ? 'Any update?' : preset }, { role: 'ai', text: ai }]);
  }

  function onSend() {
    const trimmed = input.trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    // Simple intent routing
    const lower = trimmed.toLowerCase();
    if (lower.includes('review')) handlePrompt('reviews');
    else if (lower.includes('question')) handlePrompt('questions');
    else if (lower.includes('perform') || lower.includes('views')) handlePrompt('performance');
    else handlePrompt('any');
    setInput('');
  }

  return (
    <Card className={cn('border-primary/20 bg-card', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Insights & Mini Chat
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="secondary" className="hidden sm:inline-flex">Live</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => handlePrompt('any')}>Any update?</Button>
          <Button size="sm" variant="ghost" onClick={() => handlePrompt('reviews')}>Reviews</Button>
          <Button size="sm" variant="ghost" onClick={() => handlePrompt('questions')}>Questions</Button>
          <Button size="sm" variant="ghost" onClick={() => handlePrompt('performance')}>Performance</Button>
        </div>

        <div className="h-32 overflow-auto rounded-md border bg-background/50 p-2 space-y-2">
          {messages.map((m, idx) => (
            <div key={idx} className={cn('text-sm whitespace-pre-line', m.role === 'ai' ? 'text-muted-foreground' : 'text-foreground')}>
              {m.role === 'ai' ? 'AI: ' : 'You: '}{m.text}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Input
            placeholder="Ask the AI... e.g. Any update?"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSend();
            }}
          />
          <Button size="sm" onClick={onSend}>
            <Send className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          Quick summaries are generated from your latest stats and activity.
        </div>
      </CardContent>
    </Card>
  );
}


