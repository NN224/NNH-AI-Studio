'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { GMBSettings } from '@/components/settings/gmb-settings';
import { toast } from 'sonner';

export default function SettingsPage() {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Check if user just connected GMB account
    const connected = searchParams.get('connected');
    
    if (connected === 'true') {
      // Show success toast
      toast.success('Google My Business connected successfully!', {
        description: 'Your account is now connected and ready to sync.'
      });
      
      // Dispatch reconnected event to update UI
      window.dispatchEvent(new Event('gmb-reconnected'));
      
      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete('connected');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams]);
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account and GMB connection settings
        </p>
      </div>

      <GMBSettings />
    </div>
  );
}
