'use client';

import { useState, useEffect } from 'react';
import { Settings, Lightbulb, Sparkles, Bot, ChevronRight, Zap, Shield, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { getAutoReplySettings, saveAutoReplySettings, type AutoReplySettings } from '@/server/actions/auto-reply';
import type { GMBReview } from '@/lib/types/database';

interface AIAssistantSidebarProps {
  selectedReview: GMBReview | null;
  pendingReviewsCount: number;
  locationId?: string;
}

const QUICK_TIPS = [
  {
    id: 1,
    icon: '💡',
    title: 'Quick Tip',
    message: 'Select a pending review to get AI-powered reply suggestions',
    color: 'from-yellow-500/20 to-orange-500/10',
    borderColor: 'border-yellow-500/30',
  },
  {
    id: 2,
    icon: '⚡',
    title: 'Pro Tip',
    message: 'Enable auto-reply to respond instantly to positive reviews',
    color: 'from-blue-500/20 to-cyan-500/10',
    borderColor: 'border-blue-500/30',
  },
  {
    id: 3,
    icon: '🎯',
    title: 'Smart Tip',
    message: 'Use sentiment analysis to prioritize negative reviews first',
    color: 'from-purple-500/20 to-pink-500/10',
    borderColor: 'border-purple-500/30',
  },
  {
    id: 4,
    icon: '🚀',
    title: 'Growth Tip',
    message: 'Respond within 24 hours to boost your response rate score',
    color: 'from-green-500/20 to-emerald-500/10',
    borderColor: 'border-green-500/30',
  },
];

export function AIAssistantSidebar({ selectedReview, pendingReviewsCount, locationId }: AIAssistantSidebarProps) {
  const router = useRouter();
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentTip, setCurrentTip] = useState(0);
  const [settings, setSettings] = useState<AutoReplySettings | null>(null);

  // Load auto-reply settings
  useEffect(() => {
    loadSettings();
  }, [locationId]);

  // Rotate tips every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % QUICK_TIPS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const result = await getAutoReplySettings(locationId);
      if (result.success && result.data) {
        setSettings(result.data);
        setAutoReplyEnabled(result.data.enabled);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoReply = async (enabled: boolean) => {
    if (!settings) {
      toast.error('Please wait for settings to load');
      return;
    }

    setLoading(true);
    try {
      const newSettings = { ...settings, enabled };
      const result = await saveAutoReplySettings(newSettings);

      if (result.success) {
        setAutoReplyEnabled(enabled);
        setSettings(newSettings);
        toast.success(enabled ? 'Auto-reply enabled!' : 'Auto-reply disabled', {
          description: enabled 
            ? 'AI will automatically respond to new reviews' 
            : 'Auto-reply is now off',
        });
      } else {
        toast.error('Failed to update settings', {
          description: result.error,
        });
      }
    } catch (error) {
      console.error('Error toggling auto-reply:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAISettings = () => {
    router.push('/settings?tab=ai');
  };

  const tip = QUICK_TIPS[currentTip];

  return (
    <div className="w-full h-full bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-orange-500/20 rounded-xl p-6 flex flex-col gap-6 shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-zinc-900 animate-pulse" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white">AI Assistant</h3>
          <p className="text-xs text-zinc-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Powered by Claude
          </p>
        </div>
      </div>

      {/* Quick Tip Card */}
      <Card className={`bg-gradient-to-br ${tip.color} border ${tip.borderColor} backdrop-blur-sm transition-all duration-500 hover:scale-[1.02]`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl animate-bounce">{tip.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs border-orange-500/30 text-orange-400 bg-orange-500/10">
                  {tip.title}
                </Badge>
              </div>
              <p className="text-sm text-zinc-200 leading-relaxed">
                {tip.message}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-zinc-800/50 border-zinc-700/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Zap className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">Pending</p>
                <p className="text-lg font-bold text-white">{pendingReviewsCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-800/50 border-zinc-700/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Shield className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">Auto-Reply</p>
                <p className="text-lg font-bold text-white">{autoReplyEnabled ? 'ON' : 'OFF'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Auto-Reply Toggle */}
      <Card className="bg-zinc-800/30 border-zinc-700/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Auto-Reply</p>
                <p className="text-xs text-zinc-400">
                  {autoReplyEnabled ? 'AI will respond automatically' : 'Manual replies only'}
                </p>
              </div>
            </div>
            <Switch
              checked={autoReplyEnabled}
              onCheckedChange={handleToggleAutoReply}
              disabled={loading}
              className="data-[state=checked]:bg-orange-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Selected Review Info */}
      {selectedReview && (
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm">
                {selectedReview.reviewer_name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {selectedReview.reviewer_name || 'Anonymous'}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`text-xs ${
                        star <= selectedReview.rating
                          ? 'text-yellow-400'
                          : 'text-zinc-600'
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <p className="text-xs text-zinc-400 mt-2 line-clamp-2">
                  {selectedReview.review_text || 'No review text'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Settings Button */}
      <Button
        onClick={handleAISettings}
        className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-0 shadow-lg shadow-orange-500/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-orange-500/40"
        size="lg"
      >
        <Settings className="w-4 h-4 mr-2" />
        AI Settings
        <ChevronRight className="w-4 h-4 ml-auto" />
      </Button>

      {/* Footer */}
      <div className="mt-auto pt-4 border-t border-zinc-800">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <TrendingUp className="w-3 h-3" />
          <span>AI features powered by advanced models</span>
        </div>
      </div>
    </div>
  );
}

