"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface SyncDiagnostics {
  syncQueue: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    lastSync?: {
      id: string;
      status: string;
      created_at: string;
      error_message?: string;
    };
  };
  syncLogs: {
    total: number;
    phases: {
      phase: string;
      status: string;
      created_at: string;
      counts?: Record<string, number>;
      error?: string;
    }[];
  };
  dataCounts: {
    locations: number;
    reviews: number;
    media: number;
    questions: number;
    performance: number;
    keywords: number;
  };
  gmbAccount?: {
    id: string;
    account_name: string;
    is_active: boolean;
    last_sync?: string;
    last_error?: string;
  };
}

export function SyncDiagnosticsPanel() {
  const [diagnostics, setDiagnostics] = useState<SyncDiagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDiagnostics = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/gmb/sync-diagnostics");
      const result = await response.json();

      if (result.success && result.data) {
        setDiagnostics(result.data);
      } else {
        setError(result.error || "Failed to load diagnostics");
        toast.error(result.error || "Failed to load diagnostics");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch diagnostics";
      setError(errorMessage);
      toast.error(errorMessage);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDiagnostics();
  }, []);

  if (loading) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-500/30 bg-zinc-900/50">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center h-32 space-y-4">
            <XCircle className="w-12 h-12 text-red-400" />
            <p className="text-red-400 text-center">{error}</p>
            <Button onClick={loadDiagnostics} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!diagnostics) return null;

  const hasIssues =
    diagnostics.syncQueue.failed > 0 ||
    !diagnostics.gmbAccount?.is_active ||
    diagnostics.syncQueue.lastSync?.status === "failed";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">GMB Sync Diagnostics</h2>
          <p className="text-zinc-400 text-sm">
            Account: {diagnostics.gmbAccount?.account_name}
          </p>
        </div>
        <Button onClick={loadDiagnostics} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Account Status */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {diagnostics.gmbAccount?.is_active ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400" />
            )}
            Account Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-400">Status:</span>
            <span
              className={
                diagnostics.gmbAccount?.is_active
                  ? "text-green-400"
                  : "text-red-400"
              }
            >
              {diagnostics.gmbAccount?.is_active ? "Active" : "Inactive"}
            </span>
          </div>
          {diagnostics.gmbAccount?.last_sync && (
            <div className="flex justify-between">
              <span className="text-zinc-400">Last Sync:</span>
              <span>
                {new Date(diagnostics.gmbAccount.last_sync).toLocaleString()}
              </span>
            </div>
          )}
          {diagnostics.gmbAccount?.last_error && (
            <div className="flex flex-col gap-1">
              <span className="text-zinc-400">Last Error:</span>
              <span className="text-red-400 text-xs">
                {diagnostics.gmbAccount.last_error}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Queue Status */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle>Sync Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {diagnostics.syncQueue.total}
              </div>
              <div className="text-xs text-zinc-400">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {diagnostics.syncQueue.pending}
              </div>
              <div className="text-xs text-zinc-400">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                {diagnostics.syncQueue.processing}
              </div>
              <div className="text-xs text-zinc-400">Processing</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {diagnostics.syncQueue.completed}
              </div>
              <div className="text-xs text-zinc-400">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">
                {diagnostics.syncQueue.failed}
              </div>
              <div className="text-xs text-zinc-400">Failed</div>
            </div>
          </div>

          {diagnostics.syncQueue.lastSync && (
            <div className="mt-4 p-3 bg-zinc-800/50 rounded-lg">
              <div className="text-xs text-zinc-400 mb-1">Last Sync Job:</div>
              <div className="flex items-center justify-between text-sm">
                <span>Status: {diagnostics.syncQueue.lastSync.status}</span>
                <span className="text-xs text-zinc-500">
                  {new Date(
                    diagnostics.syncQueue.lastSync.created_at,
                  ).toLocaleString()}
                </span>
              </div>
              {diagnostics.syncQueue.lastSync.error_message && (
                <div className="mt-2 text-xs text-red-400">
                  Error: {diagnostics.syncQueue.lastSync.error_message}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Counts */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle>Synced Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(diagnostics.dataCounts).map(([key, count]) => (
              <div
                key={key}
                className="p-4 bg-zinc-800/50 rounded-lg text-center"
              >
                <div
                  className={`text-2xl font-bold ${count === 0 ? "text-yellow-400" : "text-green-400"}`}
                >
                  {count}
                </div>
                <div className="text-xs text-zinc-400 capitalize mt-1">
                  {key}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sync Logs */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle>Recent Sync Phases</CardTitle>
        </CardHeader>
        <CardContent>
          {diagnostics.syncLogs.phases.length === 0 ? (
            <p className="text-zinc-400 text-sm text-center py-4">
              No sync logs found
            </p>
          ) : (
            <div className="space-y-2">
              {diagnostics.syncLogs.phases.slice(0, 10).map((log, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg text-sm"
                >
                  <div className="flex items-center gap-3">
                    {log.status === "success" ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : log.status === "failed" ? (
                      <XCircle className="w-4 h-4 text-red-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-400" />
                    )}
                    <span className="capitalize">{log.phase}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {log.counts && (
                      <span className="text-xs text-zinc-500">
                        {JSON.stringify(log.counts)}
                      </span>
                    )}
                    <span className="text-xs text-zinc-500">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      {hasIssues && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-400">
              <AlertCircle className="w-5 h-5" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {diagnostics.syncQueue.failed > 0 && (
              <p>
                • You have {diagnostics.syncQueue.failed} failed sync job(s).
                Check the error messages above.
              </p>
            )}
            {!diagnostics.gmbAccount?.is_active && (
              <p>
                • Your GMB account is inactive. Try reconnecting in Settings.
              </p>
            )}
            {diagnostics.syncQueue.pending > 0 && (
              <p>
                • You have {diagnostics.syncQueue.pending} pending sync job(s).
                They should process automatically.
              </p>
            )}
            {Object.values(diagnostics.dataCounts).every((c) => c === 0) && (
              <p>
                • No data has been synced yet. If you just connected, wait a few
                seconds and refresh.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
