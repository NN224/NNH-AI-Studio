"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Building2,
  Eye,
  Rocket,
  Sparkles,
  Youtube,
  CheckCircle2,
  Loader2,
  Zap,
  TrendingUp,
  Shield,
  MessageSquare,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { gmbLogger } from "@/lib/utils/logger";

interface OnboardingScreenProps {
  userName?: string;
}

export function OnboardingScreen({ userName }: OnboardingScreenProps) {
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale || "en";
  const [isConnectingGMB, setIsConnectingGMB] = useState(false);
  const [isConnectingYouTube, setIsConnectingYouTube] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // Loading steps للعرض أثناء الانتظار
  const loadingSteps = [
    { text: "جاري التحقق من الحساب...", icon: Shield },
    { text: "تجهيز البيانات...", icon: TrendingUp },
    { text: "تفعيل الميزات الذكية...", icon: Zap },
    { text: "جاهز تقريباً...", icon: CheckCircle2 },
  ];

  // Animate loading steps
  useEffect(() => {
    if (!isConnectingGMB && !isConnectingYouTube) {
      setLoadingStep(0);
      return;
    }

    const interval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev < loadingSteps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isConnectingGMB, isConnectingYouTube]);

  const handleConnectGMB = async () => {
    setIsConnectingGMB(true);
    setLoadingStep(0);
    
    try {
      toast.info("جاري التوجيه إلى Google...", {
        description: "سيُطلب منك السماح بالوصول لحسابك التجاري.",
      });

      const response = await fetch("/api/gmb/create-auth-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnUrl: `/${locale}/home` }),
      });

      if (!response.ok) {
        throw new Error("Failed to create auth URL");
      }

      const data = await response.json();
      if (data.authUrl) {
        // Show success animation
        setShowConfetti(true);
        setTimeout(() => {
          window.location.href = data.authUrl;
        }, 500);
      }
    } catch (error) {
      gmbLogger.error(
        "Error connecting GMB",
        error instanceof Error ? error : new Error(String(error)),
      );
      toast.error("فشل الاتصال. يرجى المحاولة مرة أخرى.");
      setIsConnectingGMB(false);
      setLoadingStep(0);
    }
  };

  const handleConnectYouTube = async () => {
    setIsConnectingYouTube(true);
    try {
      toast.info("Redirecting to YouTube...", {
        description: "Please authorize access to your channel.",
      });
      // TODO: Implement YouTube OAuth
      router.push(`/${locale}/youtube-dashboard`);
    } catch (error) {
      toast.error("Failed to connect YouTube. Please try again.");
      setIsConnectingYouTube(false);
    }
  };

  const handleDemoMode = async () => {
    try {
      toast.info("Welcome to Demo Mode! 👀", {
        description: "Explore the AI Command Center with realistic demo data.",
      });

      // Redirect to public preview page (no auth required)
      router.push(`/${locale}/preview`);
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    }
  };

  const displayName = userName?.split(" ")[0] || "صديقي";
  const isConnecting = isConnectingGMB || isConnectingYouTube;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-orange-500/5 to-purple-500/5 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-500/5 to-pink-500/5 rounded-full blur-3xl"
        />
      </div>

      <AnimatePresence mode="wait">
        {isConnecting ? (
          // Loading State - Enhanced
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full max-w-lg relative z-10"
          >
            <Card className="p-8 bg-zinc-900/80 backdrop-blur-xl border-zinc-800">
              <div className="text-center">
                {/* Animated Icon */}
                <motion.div
                  animate={{
                    rotate: 360,
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-purple-600 mb-6 relative"
                >
                  <Loader2 className="h-10 w-10 text-white" />
                  
                  {/* Pulsing rings */}
                  <motion.div
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.5, 0, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                    className="absolute inset-0 rounded-full border-4 border-orange-500"
                  />
                </motion.div>

                <h2 className="text-2xl font-bold text-white mb-3">
                  جاري الإعداد...
                </h2>

                {/* Progress Steps */}
                <div className="space-y-3 mb-6">
                  {loadingSteps.map((step, index) => {
                    const StepIcon = step.icon;
                    const isActive = index === loadingStep;
                    const isCompleted = index < loadingStep;

                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                          isActive
                            ? "bg-orange-500/10 border border-orange-500/30"
                            : isCompleted
                            ? "bg-green-500/5 border border-green-500/20"
                            : "bg-zinc-800/30 border border-zinc-800"
                        }`}
                      >
                        <div
                          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                            isActive
                              ? "bg-orange-500"
                              : isCompleted
                              ? "bg-green-500"
                              : "bg-zinc-700"
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-5 w-5 text-white" />
                          ) : (
                            <StepIcon
                              className={`h-5 w-5 ${
                                isActive ? "text-white" : "text-zinc-400"
                              }`}
                            />
                          )}
                        </div>
                        <span
                          className={`text-sm ${
                            isActive
                              ? "text-white font-medium"
                              : isCompleted
                              ? "text-green-400"
                              : "text-zinc-500"
                          }`}
                        >
                          {step.text}
                        </span>
                        {isActive && (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                            className="ml-auto"
                          >
                            <Loader2 className="h-4 w-4 text-orange-500" />
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Tips while waiting */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 }}
                  className="p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20"
                >
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-right">
                      <p className="text-sm text-zinc-300">
                        💡 <span className="font-semibold text-blue-400">نصيحة:</span> بعد الاتصال، يمكنك استخدام الذكاء الاصطناعي للرد التلقائي على التقييمات والأسئلة!
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Progress Bar */}
                <div className="mt-6">
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{
                        width: `${((loadingStep + 1) / loadingSteps.length) * 100}%`,
                      }}
                      transition={{ duration: 0.5 }}
                      className="h-full bg-gradient-to-r from-orange-500 to-purple-600"
                    />
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">
                    {Math.round(((loadingStep + 1) / loadingSteps.length) * 100)}% مكتمل
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        ) : (
          // Main Onboarding State
          <motion.div
            key="main"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-2xl relative z-10"
          >
            {/* Header */}
            <div className="text-center mb-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-purple-600 mb-6 relative"
              >
                <Rocket className="h-10 w-10 text-white" />
                
                {/* Orbiting particles */}
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{
                      rotate: 360,
                    }}
                    transition={{
                      duration: 3 + i,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="absolute inset-0"
                  >
                    <div
                      className="absolute w-2 h-2 bg-white rounded-full"
                      style={{
                        top: "50%",
                        left: "50%",
                        transform: `translate(-50%, -50%) translateY(-40px)`,
                      }}
                    />
                  </motion.div>
                ))}
              </motion.div>

              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-3xl md:text-4xl font-bold text-white mb-3"
              >
                أهلاً {displayName}! 🎉
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-zinc-400 text-lg max-w-md mx-auto"
              >
                لنبدأ الإعداد. قم بربط حساب واحد على الأقل لفتح جميع الميزات القوية.
              </motion.p>
            </div>

            {/* Connection Options */}
            <div className="space-y-4 mb-8">
              {/* Google Business Option - Enhanced */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card className="p-6 bg-zinc-900/50 backdrop-blur-sm border-zinc-800 hover:border-orange-500/50 hover:bg-zinc-900/70 transition-all cursor-pointer group relative overflow-hidden">
                  {/* Gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 to-orange-500/0 group-hover:from-orange-500/5 group-hover:to-transparent transition-all" />
                  
                  <div className="flex items-center gap-4 relative z-10">
                    <motion.div
                      whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                      transition={{ duration: 0.5 }}
                      className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center group-hover:from-orange-500/30 group-hover:to-orange-600/30 transition-all shadow-lg group-hover:shadow-orange-500/20"
                    >
                      <Building2 className="h-7 w-7 text-orange-500" />
                    </motion.div>
                    
                    <div className="flex-1 text-right">
                      <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-orange-400 transition-colors">
                        ربط Google Business
                      </h3>
                      <p className="text-sm text-zinc-400">
                        إدارة التقييمات والمنشورات والإحصائيات بمساعدة الذكاء الاصطناعي
                      </p>
                      
                      {/* Features badges */}
                      <div className="flex gap-2 mt-2 justify-end">
                        <span className="text-xs px-2 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                          ردود تلقائية
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                          تحليلات ذكية
                        </span>
                      </div>
                    </div>
                    
                    <Button
                      onClick={handleConnectGMB}
                      disabled={isConnectingGMB}
                      className="gap-2 bg-orange-500 hover:bg-orange-600 shadow-lg hover:shadow-orange-500/30 transition-all"
                    >
                      {isConnectingGMB ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          جاري الربط...
                        </>
                      ) : (
                        <>
                          ربط الآن
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              </motion.div>

              {/* YouTube Option - Enhanced */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card className="p-6 bg-zinc-900/50 backdrop-blur-sm border-zinc-800 hover:border-red-500/50 hover:bg-zinc-900/70 transition-all cursor-pointer group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 to-red-500/0 group-hover:from-red-500/5 group-hover:to-transparent transition-all" />
                  
                  <div className="flex items-center gap-4 relative z-10">
                    <motion.div
                      whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                      transition={{ duration: 0.5 }}
                      className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/20 flex items-center justify-center group-hover:from-red-500/30 group-hover:to-red-600/30 transition-all shadow-lg group-hover:shadow-red-500/20"
                    >
                      <Youtube className="h-7 w-7 text-red-500" />
                    </motion.div>
                    
                    <div className="flex-1 text-right">
                      <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-red-400 transition-colors">
                        ربط قناة YouTube
                      </h3>
                      <p className="text-sm text-zinc-400">
                        إدارة الفيديوهات والتعليقات وزيادة جمهورك
                      </p>
                      
                      <div className="flex gap-2 mt-2 justify-end">
                        <span className="text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                          قريباً
                        </span>
                      </div>
                    </div>
                    
                    <Button
                      onClick={handleConnectYouTube}
                      disabled={isConnectingYouTube}
                      variant="outline"
                      className="gap-2 border-red-500/50 text-red-500 hover:bg-red-500/10"
                    >
                      {isConnectingYouTube ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          جاري الربط...
                        </>
                      ) : (
                        <>
                          ربط الآن
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            </div>

            {/* Divider */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="relative mb-8"
            >
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-gradient-to-br from-black via-zinc-900 to-black text-zinc-500 text-sm">
                  أو
                </span>
              </div>
            </motion.div>

            {/* Demo Mode - Super Enhanced */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              whileHover={{ scale: 1.02 }}
            >
              <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/30 hover:border-purple-500/50 transition-all relative overflow-hidden group">
                {/* Animated gradient background */}
                <motion.div
                  animate={{
                    backgroundPosition: ["0% 0%", "100% 100%"],
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    repeatType: "reverse",
                  }}
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    background: "radial-gradient(circle at center, rgba(168, 85, 247, 0.1), transparent)",
                    backgroundSize: "200% 200%",
                  }}
                />
                
                <div className="text-center relative z-10">
                  <motion.div
                    animate={{
                      rotate: [0, 360],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 mb-4 relative"
                  >
                    <Sparkles className="h-8 w-8 text-purple-400" />
                    
                    {/* Orbiting stars */}
                    {[0, 1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        animate={{
                          rotate: 360,
                        }}
                        transition={{
                          duration: 2 + i * 0.5,
                          repeat: Infinity,
                          ease: "linear",
                          delay: i * 0.2,
                        }}
                        className="absolute inset-0"
                      >
                        <div
                          className="absolute w-1 h-1 bg-purple-400 rounded-full"
                          style={{
                            top: "50%",
                            left: "50%",
                            transform: `translate(-50%, -50%) translateY(-${30 + i * 5}px)`,
                          }}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                  
                  <h3 className="text-xl font-bold text-white mb-2">
                    جرّب النسخة التجريبية أولاً
                  </h3>
                  
                  <p className="text-sm text-zinc-300 mb-4">
                    اختبر مركز القيادة الذكي الكامل ببيانات تجريبية واقعية
                    <br />
                    <span className="text-purple-400 font-semibold inline-flex items-center gap-1 mt-1">
                      <Zap className="h-4 w-4" />
                      لا حاجة لربط أي حساب!
                    </span>
                  </p>
                  
                  {/* Features preview */}
                  <div className="flex items-center justify-center gap-3 mb-4 flex-wrap">
                    {[
                      { icon: MessageSquare, text: "ردود AI" },
                      { icon: TrendingUp, text: "تحليلات" },
                      { icon: Zap, text: "منشورات" },
                    ].map((feature, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1 + i * 0.1 }}
                        className="flex items-center gap-1 text-xs text-purple-300 bg-purple-500/10 px-2 py-1 rounded-full"
                      >
                        <feature.icon className="h-3 w-3" />
                        {feature.text}
                      </motion.div>
                    ))}
                  </div>
                  
                  <Button
                    onClick={handleDemoMode}
                    variant="outline"
                    className="gap-2 border-purple-500/50 text-purple-400 hover:bg-purple-500/20 hover:text-purple-300 hover:border-purple-400 w-full sm:w-auto shadow-lg hover:shadow-purple-500/30 transition-all"
                  >
                    <Eye className="h-4 w-4" />
                    تشغيل النسخة التجريبية
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            </motion.div>

        {/* Features Preview */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-12 pt-8 border-t border-zinc-800"
        >
          <div className="flex items-center justify-center gap-2 text-zinc-500 text-sm mb-4">
            <Sparkles className="h-4 w-4" />
            What you'll unlock
          </div>
          <div className="grid grid-cols-3 gap-4 text-center text-xs text-zinc-400">
            <div className="p-3 rounded-lg bg-zinc-900/30">
              <div className="text-2xl mb-1">🤖</div>
              AI Auto-Replies
            </div>
            <div className="p-3 rounded-lg bg-zinc-900/30">
              <div className="text-2xl mb-1">📊</div>
              Smart Analytics
            </div>
            <div className="p-3 rounded-lg bg-zinc-900/30">
              <div className="text-2xl mb-1">⚡</div>
              One-Click Posts
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
