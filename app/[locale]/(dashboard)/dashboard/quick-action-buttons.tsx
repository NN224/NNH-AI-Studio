'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { syncAllGmbData } from '@/app/[locale]/(dashboard)/dashboard/DashboardClient';
import { cacheUtils } from '@/hooks/use-dashboard-cache';

export function QuickActionButtons() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSyncAll = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const result = await syncAllGmbData('full');

      if (result.rateLimited) {
        toast.error(`⏳ ${result.error || 'Sync temporarily limited. Try again shortly.'}`);
        return;
      }

      if (result.success) {
        toast.success(result.message || 'All data synced successfully!');
        cacheUtils.invalidateOverview();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('gmb-sync-complete'));
          window.dispatchEvent(new Event('dashboard:refresh'));
        }
        router.refresh();
      } else {
        const errorMsg = result.error || 'Failed to sync data. Please try again.';
        if (errorMsg.includes('expired') || errorMsg.includes('reconnect')) {
          toast.error('🔗 Google connection expired. Go to Settings to reconnect.', {
            duration: 8000,
            action: {
              label: 'Settings',
              onClick: () => router.push('/settings')
            }
          });
        } else {
          toast.error(`❌ ${errorMsg}`);
        }
      }
    } catch (error) {
      console.error('[QuickActionButtons] Error during Sync All:', error);
      toast.error('Failed to sync data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      variant="ghost" 
      size="sm"
      className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 transition-all duration-300 ease-in-out"
      onClick={handleSyncAll}
      disabled={loading}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Syncing...
        </span>
      ) : (
        '🔄 Sync All'
      )}
    </Button>
  );
}
