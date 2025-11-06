'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { refreshDashboard, syncLocation, generateWeeklyTasks } from './actions';
import { RefreshCw, Calendar } from 'lucide-react';

export function RefreshButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const handleRefresh = async () => {
    setLoading(true);
    await refreshDashboard();
    router.refresh();
    setLoading(false);
  };
  
  return (
    <Button
      onClick={handleRefresh}
      disabled={loading}
      className="bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
    >
      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
      {loading ? 'Refreshing...' : 'Refresh Now'}
    </Button>
  );
}

export function SyncButton({ locationId }: { locationId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const handleSync = async () => {
    setLoading(true);
    await syncLocation(locationId);
    router.refresh();
    setLoading(false);
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
  const [loading, setLoading] = useState(false);
  
  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect this location?')) return;
    
    setLoading(true);
    // TODO: Implement disconnect logic
    alert('Disconnect feature coming soon!');
    setLoading(false);
  };
  
  return (
    <Button
      onClick={handleDisconnect}
      disabled={loading}
      size="sm"
      variant="outline"
      className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
    >
      Disconnect
    </Button>
  );
}

export function GenerateTasksButton({ locationId }: { locationId: string | null }) {
  const [loading, setLoading] = useState(false);
  
  const handleGenerate = async () => {
    if (!locationId) {
      alert('No location selected!');
      return;
    }
    
    setLoading(true);
    const result = await generateWeeklyTasks(locationId);
    
    if (result.success) {
      alert('Weekly tasks generated! (Feature in development)');
    } else {
      alert('Failed to generate tasks');
    }
    
    setLoading(false);
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
  href
}: {
  title: string;
  icon: string;
  subtitle: string;
  pendingCount: number;
  href: string;
}) {
  const router = useRouter();
  
  return (
    <div
      onClick={() => router.push(href)}
      className="bg-zinc-800/50 border-zinc-700/50 hover:border-orange-500/30 transition-all cursor-pointer rounded-lg"
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
  const [selected, setSelected] = useState<'7' | '30' | '90' | 'custom'>('30');
  
  const handleFilter = (days: '7' | '30' | '90') => {
    setSelected(days);
    // TODO: Implement actual filtering with URL params
    router.refresh();
  };
  
  return (
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
        onClick={() => alert('Custom date picker coming soon!')}
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
          router.refresh();
        }}
        variant="ghost"
        size="sm"
        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
      >
        Reset
      </Button>
    </div>
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

export function ManageProtectionButton() {
  const router = useRouter();
  
  return (
    <Button
      onClick={() => router.push('/settings')}
      className="w-full bg-orange-600 hover:bg-orange-700 text-white"
    >
      Manage Protection
    </Button>
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

