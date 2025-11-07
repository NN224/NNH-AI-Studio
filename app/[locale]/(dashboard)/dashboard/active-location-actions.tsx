'use client';

import { Button } from '@/components/ui/button';

export function ActiveLocationActions() {
  const handleSync = () => {
    // Functionality implemented in DashboardClient.tsx SyncButton
  };

  const handleDisconnect = () => {
    // Functionality implemented in DashboardClient.tsx DisconnectButton
  };

  return (
    <div className="flex gap-2">
      <Button 
        size="sm" 
        className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
        onClick={handleSync}
      >
        Sync Now
      </Button>
      <Button 
        size="sm" 
        variant="outline"
        className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
        onClick={handleDisconnect}
      >
        Disconnect
      </Button>
    </div>
  );
}

