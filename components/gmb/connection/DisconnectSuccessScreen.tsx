"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, Home, Link2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

interface DisconnectSuccessScreenProps {
  onReconnect: () => void;
  isConnecting?: boolean;
}

export function DisconnectSuccessScreen({
  onReconnect,
  isConnecting,
}: DisconnectSuccessScreenProps) {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || "en";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm"
    >
      <div className="max-w-md w-full mx-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="bg-card border border-border rounded-2xl p-8 shadow-2xl text-center"
        >
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6"
          >
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </motion.div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Account Disconnected
          </h2>

          {/* Description */}
          <p className="text-muted-foreground mb-6">
            Your Google Business Profile has been successfully disconnected. You
            can reconnect at any time to resume syncing.
          </p>

          {/* What happens next */}
          <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm font-medium text-foreground mb-2">
              What happens now:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                Synchronization has been stopped
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                Your data remains safe in our system
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                Reconnect anytime to resume updates
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={onReconnect}
              disabled={isConnecting}
              className="flex-1 bg-[#4285F4] hover:bg-[#357ABD] text-white"
            >
              <Link2 className="w-4 h-4 mr-2" />
              {isConnecting ? "Connecting..." : "Reconnect Now"}
            </Button>

            <Button
              variant="outline"
              onClick={() => router.push(`/${locale}/home`)}
              className="flex-1"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Home
            </Button>
          </div>

          {/* Skip link */}
          <button
            onClick={() => router.push(`/${locale}/settings`)}
            className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            Continue to Settings
            <ArrowRight className="w-3 h-3" />
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
