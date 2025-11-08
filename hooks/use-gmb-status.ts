"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface GmbAccountRecord {
  id: string;
  account_name: string;
  email?: string;
  is_active: boolean;
  last_sync?: string;
  settings?: Record<string, any> | null;
}

interface UseGmbStatusResult {
  loading: boolean;
  error: { message: string; code?: string } | null;
  connected: boolean;
  activeAccount: GmbAccountRecord | null;
  lastSync: Date | null;
  syncSchedule: string; // manual | hourly | daily | custom
  refresh: () => Promise<void>;
}

/**
 * Central unified hook for GMB connection state.
 * Replaces repeated logic across dashboard/settings/locations.
 */
export function useGmbStatus(): UseGmbStatusResult {
  const supabase = createClient();
  const mountedRef = useRef(true);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const [activeAccount, setActiveAccount] = useState<GmbAccountRecord | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncSchedule, setSyncSchedule] = useState<string>('manual');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!mountedRef.current) return;
        setConnected(false);
        setActiveAccount(null);
        setLastSync(null);
        setSyncSchedule('manual');
        setLoading(false);
        return;
      }

      const { data: accounts, error: qError } = await supabase
        .from('gmb_accounts')
        .select('id, account_name, email, is_active, last_sync, settings')
        .eq('user_id', user.id);

      if (qError) {
        if (!mountedRef.current) return;
        setError({ message: qError.message, code: 'FETCH_ACCOUNTS' });
        setConnected(false);
        setActiveAccount(null);
        setLastSync(null);
        setSyncSchedule('manual');
        setLoading(false);
        return;
      }

  const arr = (accounts as GmbAccountRecord[]) || [];
  // Only treat as connected when there's an explicitly active account
  const active = arr.find(a => a.is_active) || null;

      if (!mountedRef.current) return;
  setActiveAccount(active);
  setConnected(!!active);

      if (active?.last_sync) {
        const d = new Date(active.last_sync);
        setLastSync(isNaN(d.getTime()) ? null : d);
      } else {
        setLastSync(null);
      }

      if (active?.settings && typeof active.settings === 'object') {
        const schedule = (active.settings as any).syncSchedule || 'manual';
        setSyncSchedule(schedule);
      } else {
        setSyncSchedule('manual');
      }
    } catch (e: any) {
      if (!mountedRef.current) return;
      setError({ message: e?.message || 'Unknown error', code: 'UNKNOWN' });
      setConnected(false);
      setActiveAccount(null);
      setLastSync(null);
      setSyncSchedule('manual');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
  }, [load]);

  return {
    loading,
    error,
    connected,
    activeAccount,
    lastSync,
    syncSchedule,
    refresh: load
  };
}

export default useGmbStatus;