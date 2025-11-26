"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Loader2,
  MapPin,
  Star,
  MessageSquare,
  HelpCircle,
  Image,
  BarChart3,
} from "lucide-react";
import {
  useSyncContextSafe,
  STAGE_PROGRESS,
  type SyncStage,
} from "@/contexts/sync-context";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface SyncProgressOverlayProps {
  className?: string;
}

const STAGE_CONFIG: Record<
  SyncStage,
  { icon: React.ReactNode; label: string; labelAr: string }
> = {
  idle: { icon: null, label: "Idle", labelAr: "جاهز" },
  queued: {
    icon: <Loader2 className="h-5 w-5" />,
    label: "Starting",
    labelAr: "جاري البدء",
  },
  locations: {
    icon: <MapPin className="h-5 w-5" />,
    label: "Locations",
    labelAr: "المواقع",
  },
  reviews: {
    icon: <Star className="h-5 w-5" />,
    label: "Reviews",
    labelAr: "التقييمات",
  },
  questions: {
    icon: <HelpCircle className="h-5 w-5" />,
    label: "Q&A",
    labelAr: "الأسئلة",
  },
  posts: {
    icon: <MessageSquare className="h-5 w-5" />,
    label: "Posts",
    labelAr: "المنشورات",
  },
  media: {
    icon: <Image className="h-5 w-5" />,
    label: "Media",
    labelAr: "الوسائط",
  },
  performance: {
    icon: <BarChart3 className="h-5 w-5" />,
    label: "Analytics",
    labelAr: "الإحصائيات",
  },
  completing: {
    icon: <Loader2 className="h-5 w-5 animate-spin" />,
    label: "Saving",
    labelAr: "جاري الحفظ",
  },
  completed: {
    icon: <CheckCircle2 className="h-5 w-5" />,
    label: "Done",
    labelAr: "تم",
  },
  error: { icon: null, label: "Error", labelAr: "خطأ" },
};

const VISIBLE_STAGES: SyncStage[] = [
  "locations",
  "reviews",
  "questions",
  "posts",
  "media",
  "performance",
];

/**
 * Full-screen overlay for new users during initial sync
 */
export function SyncProgressOverlay({ className }: SyncProgressOverlayProps) {
  const syncContext = useSyncContextSafe();
  const [showConfetti, setShowConfetti] = useState(false);

  // Show confetti when completed
  useEffect(() => {
    if (
      syncContext?.state.status === "completed" &&
      syncContext?.state.isNewUser
    ) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [syncContext?.state.status, syncContext?.state.isNewUser]);

  if (!syncContext) return null;

  const { state } = syncContext;
  const { status, stage, progress, message, isNewUser, counts } = state;

  // Only show overlay for new users during syncing
  if (!isNewUser || status === "idle") {
    return null;
  }

  const currentStageIndex = VISIBLE_STAGES.indexOf(stage);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center",
          "bg-black/80 backdrop-blur-xl",
          className,
        )}
      >
        {/* Confetti effect */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  opacity: 1,
                  x: "50vw",
                  y: "50vh",
                  scale: 0,
                }}
                animate={{
                  opacity: 0,
                  x: `${Math.random() * 100}vw`,
                  y: `${Math.random() * 100}vh`,
                  scale: 1,
                  rotate: Math.random() * 360,
                }}
                transition={{
                  duration: 2 + Math.random(),
                  ease: "easeOut",
                }}
                className={cn(
                  "absolute w-3 h-3 rounded-sm",
                  i % 5 === 0 && "bg-yellow-400",
                  i % 5 === 1 && "bg-blue-400",
                  i % 5 === 2 && "bg-green-400",
                  i % 5 === 3 && "bg-pink-400",
                  i % 5 === 4 && "bg-purple-400",
                )}
              />
            ))}
          </div>
        )}

        <div className="w-full max-w-lg mx-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-8"
          >
            {status === "completed" ? (
              <>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 10 }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/20 mb-4"
                >
                  <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                </motion.div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  🎉 مرحباً بك!
                </h2>
                <p className="text-gray-400">
                  تم إعداد حسابك بنجاح. بياناتك جاهزة الآن.
                </p>
              </>
            ) : (
              <>
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-500/20 mb-4">
                  <Loader2 className="h-10 w-10 text-blue-400 animate-spin" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  جاري إعداد حسابك...
                </h2>
                <p className="text-gray-400">
                  {message || "نقوم بجلب بيانات نشاطك التجاري من Google"}
                </p>
              </>
            )}
          </motion.div>

          {/* Progress Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>التقدم</span>
              <span className="tabular-nums">{progress}%</span>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className={cn(
                  "h-full rounded-full",
                  status === "completed"
                    ? "bg-gradient-to-r from-emerald-500 to-green-400"
                    : "bg-gradient-to-r from-blue-500 to-indigo-400",
                )}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </motion.div>

          {/* Stage Indicators */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-3 gap-3"
          >
            {VISIBLE_STAGES.map((s, index) => {
              const config = STAGE_CONFIG[s];
              const isActive = s === stage;
              const isCompleted =
                currentStageIndex > index || status === "completed";
              const count = counts[s as keyof typeof counts];

              return (
                <motion.div
                  key={s}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * index }}
                  className={cn(
                    "flex flex-col items-center p-3 rounded-xl transition-all",
                    isActive && "bg-blue-500/10 ring-1 ring-blue-500/30",
                    isCompleted && !isActive && "bg-emerald-500/10",
                    !isActive && !isCompleted && "bg-gray-800/50",
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center mb-2",
                      isActive && "bg-blue-500/20 text-blue-400",
                      isCompleted &&
                        !isActive &&
                        "bg-emerald-500/20 text-emerald-400",
                      !isActive && !isCompleted && "bg-gray-700 text-gray-500",
                    )}
                  >
                    {isCompleted && !isActive ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : isActive ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      config.icon
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      isActive && "text-blue-400",
                      isCompleted && !isActive && "text-emerald-400",
                      !isActive && !isCompleted && "text-gray-500",
                    )}
                  >
                    {config.labelAr}
                  </span>
                  {count !== undefined && count > 0 && (
                    <span className="text-xs text-gray-500 mt-0.5">
                      {count}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </motion.div>

          {/* Tip */}
          {status === "syncing" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 text-center"
            >
              <p className="text-sm text-gray-500">
                💡 نصيحة: يمكنك استكشاف التطبيق أثناء الانتظار
              </p>
            </motion.div>
          )}

          {/* Continue Button (when completed) */}
          {status === "completed" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-8 text-center"
            >
              <button
                onClick={() => syncContext.dismissBanner()}
                className={cn(
                  "px-8 py-3 rounded-xl font-medium",
                  "bg-gradient-to-r from-emerald-500 to-green-500",
                  "text-white shadow-lg shadow-emerald-500/25",
                  "hover:shadow-emerald-500/40 transition-shadow",
                )}
              >
                ابدأ الآن 🚀
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
