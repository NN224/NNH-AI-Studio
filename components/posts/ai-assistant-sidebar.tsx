'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Settings, Bot, ChevronRight, FileText, Calendar, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import type { GMBPost } from '@/lib/types/database';

interface PostStats {
  total: number;
  published: number;
  drafts: number;
  scheduled: number;
  failed: number;
  whatsNew: number;
  events: number;
  offers: number;
  thisWeek: number;
}

interface AIAssistantSidebarProps {
  selectedPost: GMBPost | null;
  stats: PostStats | null;
  locationId?: string;
}

const QUICK_TIPS = [
  {
    id: 1,
    icon: '💡',
    title: 'Content Tip',
    message: 'Keep posts under 1500 characters for best engagement',
    color: 'from-yellow-500/20 to-orange-500/10',
    borderColor: 'border-yellow-500/30',
  },
  {
    id: 2,
    icon: '⚡',
    title: 'Timing Tip',
    message: 'Post during peak hours (9 AM - 5 PM) for maximum visibility',
    color: 'from-blue-500/20 to-cyan-500/10',
    borderColor: 'border-blue-500/30',
  },
  {
    id: 3,
    icon: '🎯',
    title: 'Engagement Tip',
    message: 'Include a clear call-to-action to drive customer actions',
    color: 'from-purple-500/20 to-pink-500/10',
    borderColor: 'border-purple-500/30',
  },
  {
    id: 4,
    icon: '🚀',
    title: 'Growth Tip',
    message: 'Post regularly (2-3 times per week) to stay top of mind',
    color: 'from-green-500/20 to-emerald-500/10',
    borderColor: 'border-green-500/30',
  },
] as const;

const PostTypeIconMap = {
  whats_new: FileText,
  event: Calendar,
  offer: Gift,
  product: FileText,
} as const;

export const AIAssistantSidebar = memo(function AIAssistantSidebar({ selectedPost, stats, locationId }: AIAssistantSidebarProps) {
  const router = useRouter();
  const [currentTip, setCurrentTip] = useState(0);

  // Rotate tips every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % QUICK_TIPS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAISettings = useCallback(() => {
    router.push('/settings?tab=ai');
  }, [router]);

  const handleViewDrafts = useCallback(() => {
    router.push('/posts?status=draft');
  }, [router]);

  const handleViewScheduled = useCallback(() => {
    router.push('/posts?status=queued');
  }, [router]);

  const tip = QUICK_TIPS[currentTip];

  const PostTypeIcon = useMemo(() => {
    if (!selectedPost) return FileText;
    return PostTypeIconMap[selectedPost.post_type] || FileText;
  }, [selectedPost]);

  return (
    <div className="w-full h-full bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-orange-500/20 rounded-xl p-6 flex flex-col gap-6 shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-zinc-900 animate-pulse" aria-label="AI online indicator" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white">AI Assistant</h3>
          <p className="text-xs text-zinc-400 flex items-center gap-1">
            Powered by Multiple AI Providers
          </p>
        </div>
      </div>

      {/* Quick Tip Card */}
      <Card className={`bg-gradient-to-br ${tip.color} border ${tip.borderColor} backdrop-blur-sm transition-all duration-500 hover:scale-[1.02]`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl" aria-hidden="true">{tip.icon}</div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-white mb-1">{tip.title}</h4>
              <p className="text-xs text-zinc-300 leading-relaxed">{tip.message}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {stats && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Card className="bg-zinc-800/50 border-zinc-700/50">
              <CardContent className="p-3">
                <p className="text-xs text-zinc-400 mb-1">Published</p>
                <p className="text-lg font-bold text-green-400">{stats.published || 0}</p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-800/50 border-zinc-700/50">
              <CardContent className="p-3">
                <p className="text-xs text-zinc-400 mb-1">Drafts</p>
                <p className="text-lg font-bold text-yellow-400">{stats.drafts || 0}</p>
              </CardContent>
            </Card>
          </div>
          <Card className="bg-zinc-800/50 border-zinc-700/50">
            <CardContent className="p-3">
              <p className="text-xs text-zinc-400 mb-1">Scheduled</p>
              <p className="text-lg font-bold text-blue-400">{stats.scheduled || 0}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Selected Post Preview */}
      {selectedPost && (
        <Card className="bg-zinc-800/50 border-orange-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <PostTypeIcon className="w-4 h-4 text-orange-400" />
              <h4 className="text-sm font-semibold text-white">Selected Post</h4>
            </div>
            <p className="text-xs text-zinc-400 mb-2 line-clamp-2">
              {selectedPost.title || selectedPost.content || 'Untitled Post'}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="text-xs" variant="outline">
                {selectedPost.status}
              </Badge>
              <Badge className="text-xs" variant="outline">
                {selectedPost.post_type}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Settings Button */}
      <Button
        onClick={handleAISettings}
        variant="outline"
        className="w-full border-orange-500/30 text-orange-400 hover:bg-orange-500/10 justify-between"
        aria-label="Open AI Settings"
      >
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4" />
          <span>AI Settings</span>
        </div>
        <ChevronRight className="w-4 h-4" />
      </Button>

      {/* Quick Actions */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Quick Actions</h4>
        <div className="space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start text-zinc-300 hover:text-white hover:bg-zinc-800"
            onClick={handleViewDrafts}
            aria-label="View draft posts"
          >
            <FileText className="w-4 h-4 mr-2" />
            View Drafts
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-zinc-300 hover:text-white hover:bg-zinc-800"
            onClick={handleViewScheduled}
            aria-label="View scheduled posts"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Scheduled Posts
          </Button>
        </div>
      </div>
    </div>
  );
});

AIAssistantSidebar.displayName = 'AIAssistantSidebar';

