// lib/hooks/useAccountsManagement.ts
import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { GmbAccount } from '@/lib/types/database'; // تأكد من صحة المسار

export function useAccountsManagement() {
  const [accounts, setAccounts] = useState<GmbAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { toast } = useToast();
  const supabase = createClient();

  const fetchAccounts = useCallback(async (): Promise<GmbAccount[]> => { // تحديد نوع الإرجاع
    setLoading(true);
    console.log('[useAccountsManagement] Fetching accounts...');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[useAccountsManagement] No authenticated user found.');
        setAccounts([]);
        return [];
      }
       console.log('[useAccountsManagement] Authenticated user ID:', user.id);

      const { data: accountsData, error } = await supabase
        .from('gmb_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log(`[useAccountsManagement] Found ${accountsData?.length ?? 0} accounts in DB.`);

      if (!accountsData || accountsData.length === 0) {
        setAccounts([]);
        return [];
      }

      console.log('[useAccountsManagement] Fetching location counts...');
      const accountsWithLocations = await Promise.all(
        accountsData.map(async (account) => {
          // Add a check for account.id existence
          if (!account.id) {
             console.warn('[useAccountsManagement] Account found without ID:', account);
             // Return a partial object or skip, ensure GmbAccount type compatibility
             return { ...account, id: `unknown-${Math.random()}`, total_locations: 0 } as GmbAccount;
          }
          const { count, error: countError } = await supabase
            .from('gmb_locations')
            .select('*', { count: 'exact', head: true })
            .eq('gmb_account_id', account.id);

          if (countError) {
             console.error(`[useAccountsManagement] Error fetching location count for account ${account.id}:`, countError);
             // Return account data even if count fails
             return { ...account, total_locations: 0 };
          }

          return {
            ...account,
            total_locations: count || 0,
          };
        })
      );

      // Filter out potential error objects if needed, ensuring type safety
      const validAccounts = accountsWithLocations.filter(acc => acc.id) as GmbAccount[];

      console.log('[useAccountsManagement] Accounts processed:', validAccounts);
      setAccounts(validAccounts);
      return validAccounts; // Return the valid accounts
    } catch (error: any) {
      console.error('[useAccountsManagement] Error fetching accounts:', error);
      toast({
        title: 'Error Loading Accounts',
        description: error.message || 'Failed to fetch accounts',
        variant: 'destructive',
      });
      setAccounts([]);
      return []; // Return empty array on error
    } finally {
      setLoading(false);
      console.log('[useAccountsManagement] fetchAccounts finished.');
    }
  }, [supabase, toast]); // Removed fetchAccounts from dependencies

  const handleSync = useCallback(async (accountId: string, isAutoSync = false) => {
    setSyncing(accountId);
    console.log(`[useAccountsManagement] ${isAutoSync ? 'Auto-syncing' : 'Syncing'} account ${accountId}`);
    try {
      const response = await fetch('/api/gmb/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, syncType: 'full' }),
      });

      if (!response.ok) {
        // Get response as text first to handle HTML error pages
        const text = await response.text();
        console.error('[useAccountsManagement] Sync API error:', {
          status: response.status,
          url: response.url,
          text: text.substring(0, 500), // Log first 500 chars
        });
        
        // Try to parse as JSON
        let errorData: any = {};
        try {
          errorData = JSON.parse(text);
        } catch {
          // Not JSON, probably HTML error page
          // Trim message to avoid very long error toasts
          const shortMessage = text.length > 200 ? text.substring(0, 200) + '...' : text;
          errorData = { error: `Server error (${response.status})`, message: shortMessage };
        }
        
        if (errorData.error === 'invalid_grant') {
          toast({
            title: 'Authorization Expired',
            description: 'Please reconnect your account.',
            variant: 'destructive',
          });
          // Attempt to refetch accounts to update status UI
           await fetchAccounts();
          return;
        }
        throw new Error(errorData.error || errorData.message || `Sync failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log('[useAccountsManagement] Sync successful:', data);
      toast({
        title: isAutoSync ? 'Auto-Sync Complete!' : 'Sync Successful!',
        description: `Synced ${data.counts?.locations || 0} locations, ${data.counts?.reviews || 0} reviews, ${data.counts?.media || 0} media items.`,
      });
      await fetchAccounts(); // Refresh list after sync
    } catch (error: any) {
      console.error('[useAccountsManagement] Sync error:', error);
      toast({
        title: 'Sync Failed',
        description: error.message || 'Failed to sync account',
        variant: 'destructive',
      });
    } finally {
      setSyncing(null);
    }
  }, [supabase, toast, fetchAccounts]); // Added supabase

  const handleDisconnect = useCallback(async (accountId: string) => {
    // Added confirmation message in Arabic
    if (!confirm('هل أنت متأكد أنك تريد فصل هذا الحساب؟ ستتوقف المزامنة ولكن لن يتم حذف البيانات الحالية.')) return;

    setDeleting(accountId);
    console.log(`[useAccountsManagement] Disconnecting account ${accountId}`);
    try {
      // It's better practice to check the user ID here if RLS isn't fully guaranteed or for defense in depth
      const { data: { user } } = await supabase.auth.getUser();
       if (!user) throw new Error("User not authenticated for disconnect");

      const { error } = await supabase
        .from('gmb_accounts')
        .update({ is_active: false })
        .eq('id', accountId)
        .eq('user_id', user.id); // Ensure only the owner can disconnect

      if (error) throw error;

      toast({
        title: 'Account Disconnected', // Kept English for consistency with other toasts
        description: 'Syncing has been stopped for this account.',
      });
      await fetchAccounts(); // Refresh the list
    } catch (error: any) {
      console.error('[useAccountsManagement] Disconnect error:', error);
      toast({
        title: 'Error Disconnecting',
        description: error.message || 'Failed to disconnect account',
        variant: 'destructive',
      });
    } finally {
      setDeleting(null);
    }
  }, [supabase, toast, fetchAccounts]); // Added supabase

  return {
    accounts,
    loading,
    syncing,
    deleting,
    fetchAccounts,
    handleSync,
    handleDisconnect,
  };
}