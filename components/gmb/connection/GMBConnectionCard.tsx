"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Unlink,
  Link2,
} from "lucide-react";
import {
  useGMBStatus,
  useGMBConnection,
  useGMBSync,
} from "@/hooks/features/use-gmb";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export function GMBConnectionCard() {
  const { data: status, isLoading } = useGMBStatus();
  const { connect, isConnecting, disconnect, isDisconnecting } =
    useGMBConnection();
  const { mutate: sync, isPending: isSyncing } = useGMBSync();

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
              onClick={() =>
                disconnect({ revokeToken: true, clearData: false })
              }
              disabled={isDisconnecting}
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              <Unlink className="w-4 h-4 mr-2" />
              Disconnect
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
    </Card>
  );
}
