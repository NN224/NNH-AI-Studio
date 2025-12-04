"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useGMBStatus } from "@/hooks/features/use-gmb";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Building2, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { gmbLogger } from "@/lib/utils/logger";

export function GMBRequiredAlert() {
  const searchParams = useSearchParams();
  const [show, setShow] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Check GMB connection status
  const { data: gmbStatus, isLoading } = useGMBStatus();
  const isConnected = gmbStatus?.connected || gmbStatus?.hasLocations || false;

  useEffect(() => {
    // Only show if:
    // 1. URL has gmb_required=true
    // 2. AND user is NOT connected to GMB
    // 3. AND we're done loading
    if (
      searchParams.get("gmb_required") === "true" &&
      !isLoading &&
      !isConnected
    ) {
      setShow(true);
      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete("gmb_required");
      window.history.replaceState({}, "", url.toString());
    } else {
      // Hide if connected
      setShow(false);
    }
  }, [searchParams, isLoading, isConnected]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch("/api/gmb/create-auth-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to create auth URL");
      }

      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      gmbLogger.error(
        "Error connecting GMB",
        error instanceof Error ? error : new Error(String(error)),
      );
      toast.error("Failed to connect. Please try again.");
      setIsConnecting(false);
    }
  };

  const handleDismiss = () => {
    setShow(false);
  };

  // Don't render anything if loading, connected, or not showing
  if (isLoading || isConnected || !show) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -20, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -20, height: 0 }}
          className="mb-6"
        >
          <Alert className="border-orange-500/50 bg-orange-500/10 relative">
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="absolute top-2 right-2 h-6 w-6 text-orange-500 hover:text-orange-400 hover:bg-orange-500/20"
            >
              <X className="h-4 w-4" />
            </Button>

            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <AlertTitle className="text-orange-500 font-semibold pr-8">
              Google Business Connection Required
            </AlertTitle>
            <AlertDescription className="mt-2 space-y-3">
              <p className="text-muted-foreground">
                To access this feature, you need to connect your Google Business
                Profile first. This will allow you to manage your reviews,
                posts, and analytics.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="gap-2 bg-orange-500 hover:bg-orange-600"
                >
                  <Building2 className="h-4 w-4" />
                  {isConnecting ? "Connecting..." : "Connect Now"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={handleDismiss}>
                  Maybe Later
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
