'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function QuickActionButtons() {
  const router = useRouter();

  const handleSyncAll = () => {
    router.refresh();
  };

  return (
    <Button 
      variant="ghost" 
      size="sm"
      className="text-orange-400 hover:text-orange-300"
      onClick={handleSyncAll}
    >
      Sync All
    </Button>
  );
}

