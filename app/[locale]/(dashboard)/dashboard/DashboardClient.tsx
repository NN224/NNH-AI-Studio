"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { refreshDashboard, syncLocation, generateWeeklyTasks, disconnectLocation } from './actions';
import { RefreshCw, Calendar, Clock } from 'lucide-react';
import { ReviewsQuickActionModal } from '@/components/dashboard/ReviewsQuickActionModal';
import { QuestionsQuickActionModal } from '@/components/dashboard/QuestionsQuickActionModal';
import { CreatePostModal } from '@/components/dashboard/CreatePostModal';
import { ConfirmationModal } from '@/components/dashboard/ConfirmationModal';
import { ProfileProtectionModal } from '@/components/dashboard/ProfileProtectionModal';
import { toast } from 'sonner';

export function RefreshButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(
        () => setCooldownSeconds((prev) => Math.max(0, prev - 1)),
        1000,
      );
      return () => clearTimeout(timer);
    }
  }, [cooldownSeconds]);

  const handleRefresh = async () => {
    if (loading || cooldownSeconds > 0) return;

    setLoading(true);

    try {
      await refreshDashboard();
      toast.success('✅ Dashboard refreshed successfully!');

      setCooldownSeconds(10);

      window.dispatchEvent(new Event('dashboard:refresh'));
      router.refresh();
    } catch (error) {
      console.error('[RefreshButton] Error:', error);
      toast.error('❌ Failed to refresh dashboard');
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = loading || cooldownSeconds > 0;

  return (
    <Button
      onClick={handleRefresh}
      disabled={isDisabled}
      size="sm"
      className="bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          Refreshing...
        </>
      ) : cooldownSeconds > 0 ? (
        <>
          <Clock className="w-4 h-4 mr-2" />
          {cooldownSeconds}s
        </>
      ) : (
        <>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Now
        </>
      )}
    </Button>
  );
}

export function SyncAllButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(
        () => setCooldownSeconds((prev) => Math.max(0, prev - 1)),
        1000,
      );
      return () => clearTimeout(timer);
    }
  }, [cooldownSeconds]);

  const handleSyncAll = async () => {
    if (loading || cooldownSeconds > 0) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/gmb/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.status === 429 && data.rateLimited) {
        toast.error(`⏳ ${data.error}`);
        setCooldownSeconds(data.cooldownRemaining || 60);
        setLoading(false);
        return;
      }

      if (data.success) {
        toast.success(`✅ ${data.message || 'Locations synced successfully!'}`);

        setCooldownSeconds(60);

        window.dispatchEvent(new Event('dashboard:refresh'));
        router.refresh();
      } else {
        toast.error(`❌ ${data.error || 'Failed to sync locations'}`);
      }
    } catch (error) {
      console.error('[SyncAllButton] Network error:', error);
      toast.error('❌ Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = loading || cooldownSeconds > 0;

  return (
    <Button
      onClick={handleSyncAll}
      disabled={isDisabled}
      className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white px-6 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      title={
        cooldownSeconds > 0
          ? `Wait ${cooldownSeconds} seconds`
          : 'Sync all locations from Google'
      }
    >
      {loading ? (
        <>
          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          Syncing...
        </>
      ) : cooldownSeconds > 0 ? (
        <>
          <Clock className="w-4 h-4 mr-2" />
          Wait {cooldownSeconds}s
        </>
      ) : (
        <>
          <RefreshCw className="w-4 h-4 mr-2" />
          Sync All Locations
        </>
      )}
    </Button>
  );
}

export function SyncButton({ locationId }: { locationId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const handleSync = async () => {
    setLoading(true);
    try {
      const result = await syncLocation(locationId);
      if (result.success) {
        toast.success(result.message || 'Location synced successfully!');
        window.dispatchEvent(new Event('dashboard:refresh'));
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to sync location');
      }
    } catch (error) {
      console.error('[handleSync] Error:', error);
      toast.error('An unexpected error occurred while syncing');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Button
      onClick={handleSync}
      disabled={loading}
      size="sm"
      className="flex-1 bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
    >
      {loading ? '⏳ Syncing...' : 'Sync Now'}
    </Button>
  );
}

export function DisconnectButton({ locationId }: { locationId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  
  const handleDisconnect = async () => {
    setLoading(true);
    try {
      const result = await disconnectLocation(locationId);
      if (result.success) {
        toast.success(result.message || 'Location disconnected successfully');
        setOpen(false);
        window.dispatchEvent(new Event('dashboard:refresh'));
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to disconnect location');
      }
    } catch (error) {
      console.error('[handleDisconnect] Error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <>
      <Button
        onClick={handleOpen}
        disabled={loading}
        size="sm"
        variant="outline"
        className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
      >
        Disconnect
      </Button>
      <ConfirmationModal
        isOpen={open}
        onClose={handleClose}
        title="Disconnect Location?"
        message="Are you sure you want to disconnect this location? You will need to reconnect to manage it again."
        confirmText="Disconnect"
        confirmVariant="destructive"
        onConfirm={handleDisconnect}
        isLoading={loading}
      />
    </>
  );
}

export function GenerateTasksButton({ locationId }: { locationId: string | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const handleGenerate = async () => {
    if (!locationId) {
      toast.error('No location selected!');
      return;
    }

    setLoading(true);
    try {
      const result = await generateWeeklyTasks(locationId);
      if (result.success) {
        toast.success('Weekly tasks generated!');
        window.dispatchEvent(new Event('dashboard:refresh'));
        router.refresh();
      } else {
        toast.error('Failed to generate tasks');
      }
    } catch (error) {
      console.error('[handleGenerate] Error:', error);
      toast.error('An unexpected error occurred while generating tasks');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Button
      onClick={handleGenerate}
      disabled={loading}
      className="bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
    >
      {loading ? '⏳ Generating...' : 'Generate Weekly Tasks'}
    </Button>
  );
}

export function QuickActionCard({ 
  title, 
  icon, 
  subtitle, 
  pendingCount,
  onClick,
  disabled
}: {
  title: string;
  icon: string;
  subtitle: string;
  pendingCount: number;
  onClick?: (e?: React.MouseEvent) => void;
  disabled?: boolean;
}) {
  return (
    <div
      onClick={(e) => {
        if (disabled) return;
        if (onClick) return onClick(e as React.MouseEvent);
      }}
      className={`bg-zinc-800/50 border-zinc-700/50 hover:border-orange-500/30 transition-all rounded-lg ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <span className="text-2xl">{icon}</span>
            <div>
              <p className="text-zinc-100 font-medium">{title}</p>
              <p className="text-zinc-400 text-sm">{subtitle}</p>
            </div>
          </div>
          {pendingCount > 0 && (
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
              + {pendingCount} pending
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

export function LocationCard({ locationName, href }: { locationName: string; href: string }) {
  const router = useRouter();
  
  return (
    <Button
      onClick={() => router.push(href)}
      size="sm"
      variant="ghost"
      className="w-full text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
    >
      Go to Location →
    </Button>
  );
}

export function TimeFilterButtons() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFilter = searchParams.get('period') || '30';
  const [selected, setSelected] = useState<'7' | '30' | '90' | 'custom'>(currentFilter as '7' | '30' | '90' | 'custom' || '30');
  const [customOpen, setCustomOpen] = useState(false);
  const [start, setStart] = useState<string>(searchParams.get('start') || '');
  const [end, setEnd] = useState<string>(searchParams.get('end') || '');
  
  const updateFilter = (period: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (period === 'all') {
      params.delete('period');
      params.delete('start');
      params.delete('end');
    } else {
      params.set('period', period);
      if (startDate) params.set('start', startDate);
      if (endDate) params.set('end', endDate);
      if (!startDate && !endDate) {
        params.delete('start');
        params.delete('end');
      }
    }
    router.push(`/dashboard?${params.toString()}`);
  };
  
  const handleFilter = (days: '7' | '30' | '90') => {
    setSelected(days);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days === '7' ? 7 : days === '30' ? 30 : 90));
    updateFilter(days, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]);
  };
  
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() => handleFilter('7')}
          variant="outline"
          size="sm"
          className={
            selected === '7'
              ? 'bg-orange-600 border-orange-600 text-white'
              : 'border-orange-500/20 text-zinc-300 hover:border-orange-500/50 hover:bg-orange-500/10'
          }
        >
          <Calendar className="w-4 h-4 mr-2" />
          Last 7 Days
        </Button>
        <Button
          onClick={() => handleFilter('30')}
          size="sm"
          className={
            selected === '30'
              ? 'bg-orange-600 hover:bg-orange-700 text-white'
              : 'border-orange-500/20 text-zinc-300 hover:border-orange-500/50 hover:bg-orange-500/10'
          }
        >
          <Calendar className="w-4 h-4 mr-2" />
          Last 30 Days
        </Button>
        <Button
          onClick={() => handleFilter('90')}
          variant="outline"
          size="sm"
          className={
            selected === '90'
              ? 'bg-orange-600 border-orange-600 text-white'
              : 'border-orange-500/20 text-zinc-300 hover:border-orange-500/50 hover:bg-orange-500/10'
          }
        >
          <Calendar className="w-4 h-4 mr-2" />
          Last 90 Days
        </Button>
        <Button
          onClick={() => setCustomOpen(true)}
          variant="outline"
          size="sm"
          className="border-orange-500/20 text-zinc-300 hover:border-orange-500/50 hover:bg-orange-500/10"
        >
          <Calendar className="w-4 h-4 mr-2" />
          Custom
        </Button>
        <Button
          onClick={() => {
            setSelected('30');
            updateFilter('all');
          }}
          variant="ghost"
          size="sm"
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          Reset
        </Button>
      </div>
      {customOpen && (
        <div className="mt-3 rounded-lg border border-zinc-700/50 bg-zinc-900 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Start</label>
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-600"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">End</label>
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-600"
              />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCustomOpen(false)}
              className="text-zinc-300 hover:text-zinc-100"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!start || !end) {
                  toast.error('Please select both start and end dates');
                  return;
                }
                if (new Date(start) > new Date(end)) {
                  toast.error('Start date must be before end date');
                  return;
                }
                setSelected('custom');
                setCustomOpen(false);
                updateFilter('custom', start, end);
                toast.success('Custom date range applied');
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Apply
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

export function ViewDetailsButton({ href }: { href: string }) {
  const router = useRouter();
  
  return (
    <Button
      onClick={() => router.push(href)}
      size="sm"
      variant="ghost"
      className="w-full text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
    >
      View Details →
    </Button>
  );
}

export function ManageProtectionButton({
  protectionScore = 0,
  issues = ['Improve health score to activate', '2 pending items need attention'],
}: {
  protectionScore?: number;
  issues?: string[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="w-full bg-orange-600 hover:bg-orange-700 text-white"
      >
        Manage Protection
      </Button>
      <ProfileProtectionModal
        isOpen={open}
        onClose={() => setOpen(false)}
        protectionScore={protectionScore}
        issues={issues}
      />
    </>
  );
}

export function LastUpdated({ updatedAt }: { updatedAt: string }) {
  const getTimeAgo = (date: string) => {
    const now = new Date();
    const updated = new Date(date);
    const diffMs = now.getTime() - updated.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };
  
  return (
    <div className="text-sm text-zinc-300">
      Last Updated: <span className="text-orange-500 font-medium">{getTimeAgo(updatedAt)}</span>
    </div>
  );
}

// Interactive Quick Actions with Modals
export function QuickActionsInteractive({
  pendingReviews,
  unansweredQuestions,
  locationId,
}: {
  pendingReviews: Array<{ id: string; rating: number; comment: string | null; created_at: string }>;
  unansweredQuestions: Array<{ id: string; question_text: string; created_at: string; upvotes?: number | null }>;
  locationId?: string;
}) {
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [postOpen, setPostOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <div className="space-y-3">
        <QuickActionCard
          title="Reply to Reviews"
          icon="💬"
          subtitle="Respond to pending reviews"
          pendingCount={pendingReviews.length}
          onClick={() => setReviewsOpen(true)}
        />
        <QuickActionCard
          title="Answer Questions"
          icon="❓"
          subtitle="Reply to customer questions"
          pendingCount={unansweredQuestions.length}
          onClick={() => setQuestionsOpen(true)}
        />
        <QuickActionCard
          title="Create New Post"
          icon="📝"
          subtitle="Share updates with customers"
          pendingCount={0}
          onClick={() => setPostOpen(true)}
          disabled={!locationId}
        />
      </div>
      <ReviewsQuickActionModal
        isOpen={reviewsOpen}
        onClose={() => setReviewsOpen(false)}
        pendingReviews={pendingReviews}
        onSuccess={() => {
          router.refresh();
          setReviewsOpen(false);
        }}
      />
      <QuestionsQuickActionModal
        isOpen={questionsOpen}
        onClose={() => setQuestionsOpen(false)}
        unansweredQuestions={unansweredQuestions}
        onSuccess={() => {
          router.refresh();
          setQuestionsOpen(false);
        }}
      />
      {locationId && (
        <CreatePostModal 
          isOpen={postOpen} 
          onClose={() => setPostOpen(false)} 
          locationId={locationId}
          onSuccess={() => {
            router.refresh();
            setPostOpen(false);
          }}
        />
      )}
    </>
  );
}

