"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function ManualSyncTrigger() {
  const [isTriggering, setIsTriggering] = useState(false);

  const handleTriggerSync = async () => {
    setIsTriggering(true);

    try {
      const response = await fetch("/api/gmb/trigger-sync-now", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to trigger sync");
      }

      if (data.jobsFound === 0) {
        toast.info("No pending sync jobs", {
          description: "All your data is already up to date!",
        });
      } else {
        toast.success("Sync started!", {
          description: `Processing ${data.jobsFound} job(s). Refresh in a few moments.`,
          icon: <CheckCircle2 className="h-4 w-4" />,
        });
      }
    } catch (error) {
      console.error("Sync trigger error:", error);
      toast.error("Failed to start sync", {
        description: error instanceof Error ? error.message : "Please try again",
        icon: <AlertCircle className="h-4 w-4" />,
      });
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <Card className="p-4 bg-gradient-to-r from-orange-500/10 to-purple-500/10 border-orange-500/20">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-white mb-1">
            Data Not Loading?
          </h3>
          <p className="text-xs text-zinc-400">
            Click here to manually sync your Google Business data
          </p>
        </div>
        
        <Button
          onClick={handleTriggerSync}
          disabled={isTriggering}
          size="sm"
          className="gap-2 bg-orange-500 hover:bg-orange-600"
        >
          <RefreshCw className={`h-4 w-4 ${isTriggering ? "animate-spin" : ""}`} />
          {isTriggering ? "Syncing..." : "Sync Now"}
        </Button>
      </div>
    </Card>
  );
}
