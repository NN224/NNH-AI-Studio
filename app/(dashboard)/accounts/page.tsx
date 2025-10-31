'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { useAccountsManagement } from '@/lib/hooks/useAccountsManagement';
import { useOAuthCallbackHandler } from '@/lib/hooks/useOAuthCallbackHandler';
import { AccountCard } from '@/components/accounts/AccountCard';
import { NoAccountsPlaceholder } from '@/components/accounts/NoAccountsPlaceholder';

const formatDate = (dateString?: string | null): string => {
  if (!dateString) return 'Never';
  try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return 'Invalid Date';
  }
};

export default function AccountsPage() {
  const {
    accounts,
    loading,
    syncing,
    deleting,
    fetchAccounts,
    handleSync,
    handleDisconnect,
  } = useAccountsManagement();

  const [connecting, setConnecting] = useState(false);

  useOAuthCallbackHandler({ fetchAccounts, handleSync });

  const handleConnect = useCallback(async () => {
    setConnecting(true);
    console.log('[Accounts Page] handleConnect initiated...');
    try {
      const response = await fetch('/api/gmb/create-auth-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse server error response' }));
        console.error('[Accounts Page] Failed response from create-auth-url:', response.status, errorData);
        throw new Error(errorData.error || errorData.message || `Failed to initiate connection (status: ${response.status})`);
      }

      const data = await response.json();
      const authUrl = data.authUrl || data.url;

      if (authUrl && typeof authUrl === 'string') {
        console.log('[Accounts Page] Redirecting to Google OAuth:', authUrl);
        window.location.href = authUrl;
      } else {
        throw new Error('Invalid authorization URL received from server.');
      }
    } catch (error: any) {
      console.error('[Accounts Page] Error during handleConnect:', error);
      toast.error('Connection Error', {
        description: error.message || 'Could not start the Google connection process. Please try again.',
      });
      setConnecting(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading connected accounts...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-primary/10 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Google Accounts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage connections to your Google My Business accounts.
          </p>
        </div>
        <Button onClick={handleConnect} disabled={connecting} className="w-full sm:w-auto">
          {connecting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Redirecting...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Connect Account
            </>
          )}
        </Button>
      </div>

      {accounts.length === 0 ? (
        <NoAccountsPlaceholder onConnect={handleConnect} isConnecting={connecting} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          {accounts.map((account, index) => (
            <AccountCard
              key={account.id}
              account={account}
              syncingAccountId={syncing}
              deletingAccountId={deleting}
              onSync={handleSync}
              onDisconnect={handleDisconnect}
              formatDate={formatDate}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  );
}
