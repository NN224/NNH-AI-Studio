"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { useSyncContextSafe } from "@/contexts/sync-context";
import { cn } from "@/lib/utils";

interface SyncBannerProps {
  className?: string;
}

export function SyncBanner({ className }: SyncBannerProps) {
  const syncContext = useSyncContextSafe();

  // If no context or banner not visible, don't render
  if (!syncContext || !syncContext.isBannerVisible) {
    return null;
  }

  const { state, dismissBanner } = syncContext;
  const { status, stage, progress, message } = state;

  // Determine banner style based on status
  const getBannerStyles = () => {
    switch (status) {
      case "syncing":
        return {
          bg: "bg-gradient-to-r from-blue-600/90 to-indigo-600/90",
          border: "border-blue-500/30",
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          iconBg: "bg-blue-500/20",
        };
      case "completed":
        return {
          bg: "bg-gradient-to-r from-emerald-600/90 to-green-600/90",
          border: "border-emerald-500/30",
          icon: <CheckCircle2 className="h-4 w-4" />,
          iconBg: "bg-emerald-500/20",
        };
      case "error":
        return {
          bg: "bg-gradient-to-r from-red-600/90 to-rose-600/90",
          border: "border-red-500/30",
          icon: <AlertCircle className="h-4 w-4" />,
          iconBg: "bg-red-500/20",
        };
      default:
        return {
          bg: "bg-gray-800/90",
          border: "border-gray-700/30",
          icon: <RefreshCw className="h-4 w-4" />,
          iconBg: "bg-gray-500/20",
        };
    }
  };

  const styles = getBannerStyles();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50",
          "backdrop-blur-md",
          className,
        )}
      >
        <div
          className={cn(
            "w-full py-2.5 px-4",
            styles.bg,
            "border-b",
            styles.border,
          )}
        >
          <div className="container mx-auto flex items-center justify-between gap-4">
            {/* Left: Icon + Message */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div
                className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-full",
                  styles.iconBg,
                )}
              >
                {styles.icon}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {message}
                </p>
              </div>
            </div>

            {/* Center: Progress Bar (only when syncing) */}
            {status === "syncing" && (
              <div className="hidden sm:flex items-center gap-3 flex-1 max-w-xs">
                <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-white rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
                <span className="text-xs font-medium text-white/80 tabular-nums">
                  {progress}%
                </span>
              </div>
            )}

            {/* Right: Stage indicator + Close button */}
            <div className="flex items-center gap-3">
              {status === "syncing" && stage !== "queued" && (
                <span className="hidden md:inline-block text-xs text-white/70 capitalize">
                  {stage.replace("_", " ")}
                </span>
              )}

              <button
                onClick={dismissBanner}
                className={cn(
                  "p-1 rounded-full transition-colors",
                  "hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20",
                )}
                aria-label="إغلاق"
              >
                <X className="h-4 w-4 text-white/70 hover:text-white" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Compact version for inline use (e.g., in cards)
 */
export function SyncBannerCompact({ className }: SyncBannerProps) {
  const syncContext = useSyncContextSafe();

  if (!syncContext || !syncContext.isBannerVisible) {
    return null;
  }

  const { state } = syncContext;
  const { status, progress, message } = state;

  if (status === "idle") return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
        status === "syncing" && "bg-blue-500/10 text-blue-400",
        status === "completed" && "bg-emerald-500/10 text-emerald-400",
        status === "error" && "bg-red-500/10 text-red-400",
        className,
      )}
    >
      {status === "syncing" && (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>{progress}%</span>
        </>
      )}
      {status === "completed" && (
        <>
          <CheckCircle2 className="h-3 w-3" />
          <span>تم التحديث</span>
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="h-3 w-3" />
          <span>خطأ</span>
        </>
      )}
    </motion.div>
  );
}
