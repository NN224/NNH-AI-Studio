"use client";

import { Button } from "@/components/ui/button";
import { apiLogger } from "@/lib/utils/logger";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { disconnectLocation } from "./actions";

export function ActiveLocationActions({ locationId }: { locationId: string }) {
  const [loading, setLoading] = useState<"disconnect" | null>(null);
  const router = useRouter();

  const handleDisconnect = async () => {
    setLoading("disconnect");
    try {
      const result = await disconnectLocation(locationId);
      if (result.success) {
        toast.success(result.message || "Location disconnected successfully!");
        window.dispatchEvent(new Event("dashboard:refresh"));
        router.refresh();
      } else {
        toast.error(result.message || "Failed to disconnect location");
      }
    } catch (error) {
      apiLogger.error(
        "[ActiveLocationActions] Disconnect failed",
        error instanceof Error ? error : new Error(String(error)),
        { locationId },
      );
      toast.error("An unexpected error occurred while disconnecting");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex gap-2 w-full">
      <Button
        size="sm"
        variant="outline"
        className={`flex-1 transition-all duration-300 ${
          loading === "disconnect"
            ? "border-zinc-700 text-zinc-400 cursor-wait"
            : "border-red-500/30 text-red-400 hover:border-red-500/60 hover:bg-red-500/10 hover:scale-[1.02]"
        }`}
        onClick={handleDisconnect}
        disabled={!!loading}
      >
        {loading === "disconnect" ? "Disconnecting..." : "🛑 Disconnect"}
      </Button>
    </div>
  );
}
