'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function QuickActionButtons() {
  const router = useRouter();

  const handleSyncAll = () => {
    try {
      window.dispatchEvent(new Event('dashboard:refresh'));
      router.refresh();
      toast.success('All data synced successfully!');
    } catch (error) {
      console.error('[QuickActionButtons] Error during Sync All:', error);
      toast.error('Failed to sync data. Please try again.');
    }
  };

  return (
    <Button 
      variant="ghost" 
      size="sm"
      className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 transition-all duration-300 ease-in-out"
      onClick={handleSyncAll}
    >
      🔄 Sync All
    </Button>
  );
}
