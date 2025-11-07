import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plug, RefreshCcw, Unplug } from 'lucide-react';

export type GMBStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'syncing'
  | 'disconnecting'
  | 'error';

export interface GMBConnectionControlsProps {
  status: GMBStatus;
  onConnect: () => Promise<void> | void;
  onDisconnect: () => Promise<void> | void;
  onSync: () => Promise<void> | void;
  lastSyncedAt?: Date | string | null;
  errorMessage?: string;
  compact?: boolean;
  className?: string;
}

const formatDate = (d?: Date | string | null) => {
  if (!d) return null;
  try {
    const date = typeof d === 'string' ? new Date(d) : d;
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  } catch {
    return String(d);
  }
};

export const GMBConnectionControls: React.FC<GMBConnectionControlsProps> = ({
  status,
  onConnect,
  onDisconnect,
  onSync,
  lastSyncedAt,
  errorMessage,
  compact,
  className,
}) => {
  const isBusy = status === 'connecting' || status === 'syncing' || status === 'disconnecting';
  const lastSyncText = formatDate(lastSyncedAt);

  return (
    <div className={['flex flex-col gap-2', className].filter(Boolean).join(' ')}>
      <div className={compact ? 'flex items-center gap-2' : 'flex flex-wrap items-center gap-3'}>
        {status === 'disconnected' || status === 'error' ? (
          <Button onClick={onConnect} disabled={isBusy}>
            {isBusy ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plug className="w-4 h-4 mr-2" />
            )}
            {status === 'error' ? 'Retry Connect' : 'Connect Google My Business'}
          </Button>
        ) : null}

        {status === 'connected' || status === 'syncing' ? (
          <>
            <Button variant="secondary" onClick={onSync} disabled={isBusy}>
              {status === 'syncing' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCcw className="w-4 h-4 mr-2" />
              )}
              {status === 'syncing' ? 'Syncing…' : 'Sync Now'}
            </Button>
            <Button variant="outline" onClick={onDisconnect} disabled={isBusy}>
              {status === 'disconnecting' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Unplug className="w-4 h-4 mr-2" />
              )}
              {status === 'disconnecting' ? 'Disconnecting…' : 'Disconnect'}
            </Button>
          </>
        ) : null}

        {status === 'connecting' && (
          <Button disabled>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Connecting…
          </Button>
        )}
      </div>

      <div className={compact ? 'flex items-center gap-2' : 'flex items-center gap-3 text-sm text-muted-foreground'}>
        <Badge variant={status === 'connected' ? 'default' : status === 'error' ? 'destructive' : 'secondary'}>
          {status}
        </Badge>
        {lastSyncText && (
          <span className="text-xs sm:text-sm">Last synced: {lastSyncText}</span>
        )}
        {status === 'error' && errorMessage && (
          <span className="text-xs sm:text-sm text-destructive">{errorMessage}</span>
        )}
      </div>
    </div>
  );
};

export default GMBConnectionControls;
