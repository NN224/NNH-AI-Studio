import { t } from "@/lib/i18n/stub";
import React from "react";
import { Button } from "@/components/ui/button";
// Ensure Badge path exists; fallback to a simple span if unavailable
import { Badge as UIBadge } from "@/components/ui/badge";
import { Loader2, Plug, RefreshCcw, Unplug } from "lucide-react";

export type GMBStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "syncing"
  | "disconnecting"
  | "error";

export interface GMBConnectionControlsProps {
  status: GMBStatus;
  onConnect?: () => Promise<void> | void;
  onDisconnect?: () => Promise<void> | void;
  onSync?: () => Promise<void> | void;
  lastSyncedAt?: Date | string | null;
  errorMessage?: string;
  errorContext?: "connect" | "sync" | "disconnect";
  compact?: boolean;
  className?: string;
  labels?: Partial<{
    connect: string;
    retryConnect: string;
    syncing: string;
    syncNow: string;
    disconnecting: string;
    disconnect: string;
    connecting: string;
    lastSynced: string;
    statusConnected: string;
    statusDisconnected: string;
    statusConnecting: string;
    statusSyncing: string;
    statusDisconnecting: string;
    statusError: string;
  }>;
}

const formatDate = (d?: Date | string | null) => {
  if (!d) return null;
  try {
    const date = typeof d === "string" ? new Date(d) : d;
    if (isNaN(date.getTime())) return null;
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  } catch {
    return null;
  }
};

export const GMBConnectionControls: React.FC<GMBConnectionControlsProps> = ({
  status,
  onConnect,
  onDisconnect,
  onSync,
  lastSyncedAt,
  errorMessage,
  errorContext,
  compact,
  className,
  labels,
}) => {
  const isBusy =
    status === "connecting" ||
    status === "syncing" ||
    status === "disconnecting";
  const lastSyncText = formatDate(lastSyncedAt);

  const L = {
    connect:
      labels?.connect ||
      t("connect", { default: "Connect Google My Business" }),
    retryConnect:
      labels?.retryConnect || t("retryConnect", { default: "Retry Connect" }),
    syncing: labels?.syncing || t("syncing", { default: "Syncing…" }),
    syncNow: labels?.syncNow || t("syncNow", { default: "Sync Now" }),
    disconnecting:
      labels?.disconnecting ||
      t("disconnecting", { default: "Disconnecting…" }),
    disconnect:
      labels?.disconnect || t("disconnect", { default: "Disconnect" }),
    connecting:
      labels?.connecting || t("connecting", { default: "Connecting…" }),
    lastSynced:
      labels?.lastSynced || t("lastSynced", { default: "Last synced" }),
    statusConnected:
      labels?.statusConnected ||
      t("status.connected", { default: "connected" }),
    statusDisconnected:
      labels?.statusDisconnected ||
      t("status.disconnected", { default: "disconnected" }),
    statusConnecting:
      labels?.statusConnecting ||
      t("status.connecting", { default: "connecting" }),
    statusSyncing:
      labels?.statusSyncing || t("status.syncing", { default: "syncing" }),
    statusDisconnecting:
      labels?.statusDisconnecting ||
      t("status.disconnecting", { default: "disconnecting" }),
    statusError: labels?.statusError || t("status.error", { default: "error" }),
  };

  const renderStatusText = () => {
    switch (status) {
      case "connected":
        return L.statusConnected;
      case "disconnected":
        return L.statusDisconnected;
      case "connecting":
        return L.statusConnecting;
      case "syncing":
        return L.statusSyncing;
      case "disconnecting":
        return L.statusDisconnecting;
      case "error":
        return L.statusError;
      default:
        return String(status);
    }
  };

  const Badge =
    UIBadge ||
    (({ children }: any) => (
      <span className="inline-block rounded px-2 py-0.5 bg-muted text-xs">
        {children}
      </span>
    ));

  return (
    <div
      className={["flex flex-col gap-2", className].filter(Boolean).join(" ")}
    >
      <div
        className={
          compact
            ? "flex items-center gap-2"
            : "flex flex-wrap items-center gap-3"
        }
      >
        {(status === "disconnected" || status === "error") && (
          <Button
            onClick={onConnect}
            disabled={isBusy || !onConnect}
            aria-busy={isBusy}
            aria-label={status === "error" ? L.retryConnect : L.connect}
          >
            {isBusy ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plug className="w-4 h-4 mr-2" />
            )}
            {status === "error" ? L.retryConnect : L.connect}
          </Button>
        )}

        {(status === "connected" ||
          status === "syncing" ||
          status === "disconnecting" ||
          status === "error") && (
          <>
            <Button
              variant="secondary"
              onClick={onSync}
              disabled={isBusy || !onSync}
              aria-busy={status === "syncing"}
              aria-label={status === "syncing" ? L.syncing : L.syncNow}
            >
              {status === "syncing" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCcw className="w-4 h-4 mr-2" />
              )}
              {status === "syncing" ? L.syncing : L.syncNow}
            </Button>
            <Button
              variant="outline"
              onClick={onDisconnect}
              disabled={isBusy || !onDisconnect}
              aria-busy={status === "disconnecting"}
              aria-label={
                status === "disconnecting" ? L.disconnecting : L.disconnect
              }
            >
              {status === "disconnecting" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Unplug className="w-4 h-4 mr-2" />
              )}
              {status === "disconnecting" ? L.disconnecting : L.disconnect}
            </Button>
          </>
        )}

        {status === "connecting" && (
          <Button disabled aria-busy className="cursor-wait">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {L.connecting}
          </Button>
        )}
      </div>

      <div
        className={
          compact
            ? "flex items-center gap-2"
            : "flex items-center gap-3 text-sm text-muted-foreground"
        }
      >
        <UIBadge
          variant={
            status === "connected"
              ? "default"
              : status === "error"
                ? "destructive"
                : "secondary"
          }
          className={
            status === "connecting" ||
            status === "syncing" ||
            status === "disconnecting"
              ? "animate-pulse"
              : undefined
          }
          aria-live="polite"
        >
          {renderStatusText()}
        </UIBadge>
        {lastSyncText && (
          <span className={compact ? "text-xs" : "text-xs sm:text-sm"}>
            {L.lastSynced}: {lastSyncText}
          </span>
        )}
        {status === "error" && errorMessage && (
          <span className="text-xs sm:text-sm text-destructive" role="alert">
            {errorMessage}
          </span>
        )}
      </div>
    </div>
  );
};

export default GMBConnectionControls;
