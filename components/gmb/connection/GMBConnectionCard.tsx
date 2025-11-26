"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGMBConnection,
  useGMBStatus,
  useGMBSync,
} from "@/hooks/features/use-gmb";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  CheckCircle,
  Link2,
  RefreshCw,
  ShieldAlert,
  Unlink,
} from "lucide-react";
import { useState } from "react";
import { DisconnectSuccessScreen } from "./DisconnectSuccessScreen";

export function GMBConnectionCard() {
  const { data: status, isLoading } = useGMBStatus();
  const { connect, isConnecting, disconnect, isDisconnecting } =
    useGMBConnection({
      onDisconnectSuccess: () => {
        setShowSuccessScreen(true);
      },
    });
  const { mutate: sync, isPending: isSyncing } = useGMBSync();
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);

  const handleDisconnect = () => {
    if (activeAccount?.id) {
      disconnect({ accountId: activeAccount.id });
      setShowDisconnectDialog(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const isConnected = status?.connected;
  const activeAccount = status?.activeAccount;

  return (
    <Card
      className={cn(
        "border-l-4",
        isConnected ? "border-l-green-500" : "border-l-amber-500",
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Google Business Profile</CardTitle>
            <Badge
              variant={isConnected ? "default" : "secondary"}
              className={cn(
                isConnected
                  ? "bg-green-500 hover:bg-green-600"
                  : "bg-amber-500 hover:bg-amber-600",
              )}
            >
              {isConnected ? (
                <CheckCircle className="w-3 h-3 mr-1" />
              ) : (
                <AlertTriangle className="w-3 h-3 mr-1" />
              )}
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
        </div>
        <CardDescription>
          {isConnected
            ? `Connected to ${activeAccount?.accountName || "Business Profile"}`
            : "Connect your Google Business Profile to manage locations and reviews."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {isConnected ? (
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() =>
                activeAccount?.id && sync({ accountId: activeAccount.id })
              }
              disabled={isSyncing || !activeAccount?.id}
              className="flex-1"
            >
              <RefreshCw
                className={cn("w-4 h-4 mr-2", isSyncing && "animate-spin")}
              />
              {isSyncing ? "Syncing..." : "Sync Now"}
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowDisconnectDialog(true)}
              disabled={isDisconnecting || !activeAccount?.id}
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              <Unlink className="w-4 h-4 mr-2" />
              {isDisconnecting ? "Disconnecting..." : "Disconnect"}
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => connect()}
            disabled={isConnecting}
            className="w-full bg-[#4285F4] hover:bg-[#357ABD] text-white"
          >
            <Link2 className="w-4 h-4 mr-2" />
            {isConnecting ? "Connecting..." : "Connect Google Account"}
          </Button>
        )}

        {isConnected && status?.lastSync && (
          <p className="text-xs text-muted-foreground text-center">
            Last synced{" "}
            {formatDistanceToNow(new Date(status.lastSync), {
              addSuffix: true,
            })}
          </p>
        )}
      </CardContent>

      {/* Disconnect Success Screen */}
      {showSuccessScreen && (
        <DisconnectSuccessScreen
          onReconnect={() => {
            setShowSuccessScreen(false);
            connect();
          }}
          isConnecting={isConnecting}
        />
      )}

      {/* Disconnect Confirmation Dialog */}
      <AlertDialog
        open={showDisconnectDialog}
        onOpenChange={setShowDisconnectDialog}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <AlertDialogTitle className="text-center">
              Disconnect Google Business Profile?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-2">
              <p>
                You are about to disconnect{" "}
                <strong>{activeAccount?.accountName || "your account"}</strong>.
              </p>
              <p className="text-sm">
                This will stop all synchronization and you won&apos;t receive
                updates for reviews, questions, or insights.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2">
            <AlertDialogCancel className="sm:w-32">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              className="sm:w-32 bg-red-600 hover:bg-red-700 text-white"
            >
              {isDisconnecting ? "Disconnecting..." : "Disconnect"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
