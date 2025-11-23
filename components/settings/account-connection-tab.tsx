"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GMBConnectionManager } from "@/components/gmb/gmb-connection-manager";
import { Shield, CheckCircle, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import {
  updateAccountSyncSettings,
  getAccountSyncSettings,
} from "@/server/actions/gmb-settings";
import { toast } from "sonner";

interface GMBAccount {
  id: string;
  account_name?: string;
  is_active: boolean;
  last_sync?: string;
}

interface AccountConnectionTabProps {
  gmbAccounts: GMBAccount[];
  onSuccess?: () => void;
}

export function AccountConnectionTab({
  gmbAccounts,
  onSuccess,
}: AccountConnectionTabProps) {
  const activeAccounts = gmbAccounts?.filter((a) => a && a.is_active) || [];
  const activeAccountId = activeAccounts[0]?.id;

  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      if (activeAccountId) {
        const result = await getAccountSyncSettings(activeAccountId);
        if (result.success) {
          setAutoSyncEnabled(result.enabled || false);
        }
        setIsLoadingSettings(false);
      }
    }
    if (activeAccountId) {
      loadSettings();
    } else {
      setIsLoadingSettings(false);
    }
  }, [activeAccountId]);

  const handleAutoSyncChange = async (checked: boolean) => {
    if (!activeAccountId) return;

    setAutoSyncEnabled(checked); // Optimistic update
    const result = await updateAccountSyncSettings(activeAccountId, checked);
    if (result.success) {
      toast.success(checked ? "Auto sync enabled" : "Auto sync disabled");
    } else {
      setAutoSyncEnabled(!checked); // Revert on failure
      toast.error("Failed to update settings");
    }
  };

  return (
    <div className="space-y-6">
      {/* GMB Connection Manager - Main Component */}
      <GMBConnectionManager
        variant="full"
        showLastSync={true}
        onSuccess={onSuccess}
      />

      {/* Sync Preferences */}
      <Card className="bg-card border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Sync Preferences
          </CardTitle>
          <CardDescription>
            Manage how your data is synchronized with Google
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between space-x-2 border p-4 rounded-lg bg-background/50 border-border/50">
            <div className="space-y-0.5">
              <Label
                htmlFor="auto-sync-settings"
                className="text-base font-medium"
              >
                Automatic Synchronization
              </Label>
              <p className="text-sm text-muted-foreground">
                Automatically sync your reviews, questions, and insights every
                hour.
              </p>
            </div>
            <Switch
              id="auto-sync-settings"
              checked={autoSyncEnabled}
              onCheckedChange={handleAutoSyncChange}
              disabled={isLoadingSettings || !activeAccountId}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security & Permissions */}
      <Card className="bg-card border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Security & Permissions
          </CardTitle>
          <CardDescription>
            Your connection is secure and encrypted
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">
                OAuth 2.0 Authentication
              </p>
              <p className="text-xs text-muted-foreground">
                Industry-standard secure authentication
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Encrypted Token Storage
              </p>
              <p className="text-xs text-muted-foreground">
                All credentials are encrypted at rest
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Automatic Token Refresh
              </p>
              <p className="text-xs text-muted-foreground">
                Seamless reauthentication when needed
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Read-Only Access Option
              </p>
              <p className="text-xs text-muted-foreground">
                Control what data can be modified
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
