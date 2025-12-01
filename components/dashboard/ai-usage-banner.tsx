"use client";

/**
 * AI Usage Banner
 * Shows AI usage limits and encourages upgrade
 */

import React, { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { aiLogger } from "@/lib/utils/logger";

interface AIUsage {
  plan: string;
  used: number;
  limit: number;
  remaining: number;
  percentage: number;
  isLimitReached: boolean;
}

interface AIUsageBannerProps {
  userId: string;
}

export function AIUsageBanner({ userId }: AIUsageBannerProps) {
  const router = useRouter();
  const [usage, setUsage] = useState<AIUsage | null>(null);
  const [hasOwnKey, setHasOwnKey] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsage();
  }, [userId]);

  const fetchUsage = async () => {
    try {
      const response = await fetch(`/api/ai/usage?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUsage(data.usage);
        setHasOwnKey(data.hasOwnKey);
      }
    } catch (error) {
      aiLogger.error(
        "Error fetching AI usage",
        error instanceof Error ? error : new Error(String(error)),
        { userId },
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading || !usage) {
    return null;
  }

  // Don't show banner if user has own API key
  if (hasOwnKey) {
    return null;
  }

  // Show different alerts based on usage
  const getAlertVariant = () => {
    if (usage.isLimitReached) return "destructive";
    if (usage.percentage >= 80) return "default";
    return "default";
  };

  const getIcon = () => {
    if (usage.isLimitReached) return <AlertTriangle className="h-5 w-5" />;
    if (usage.percentage >= 80)
      return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    return <Sparkles className="h-5 w-5 text-purple-500" />;
  };

  const getTitle = () => {
    if (usage.isLimitReached) return "وصلت للحد الأقصى من AI";
    if (usage.percentage >= 80) return "قاربت على الوصول للحد الأقصى";
    return `استخدام AI - خطة ${getPlanName(usage.plan)}`;
  };

  const getDescription = () => {
    if (usage.isLimitReached) {
      return "لقد استخدمت كل طلبات AI المجانية هذا الشهر. قم بالترقية أو أضف API Key خاص.";
    }
    if (usage.percentage >= 80) {
      return `استخدمت ${usage.used} من ${usage.limit} طلب. تبقى ${usage.remaining} فقط.`;
    }
    return `استخدمت ${usage.used} من ${usage.limit} طلب AI هذا الشهر.`;
  };

  const getPlanName = (plan: string) => {
    const names: Record<string, string> = {
      free: "المجانية",
      basic: "الأساسية",
      pro: "الاحترافية",
      enterprise: "المؤسسات",
    };
    return names[plan] || plan;
  };

  return (
    <Alert variant={getAlertVariant()} className="mb-4">
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1 space-y-2">
          <AlertTitle>{getTitle()}</AlertTitle>
          <AlertDescription>{getDescription()}</AlertDescription>

          {/* Progress Bar */}
          {!usage.isLimitReached && (
            <div className="space-y-1">
              <Progress value={usage.percentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {usage.remaining} طلب متبقي (
                {(100 - usage.percentage).toFixed(0)}%)
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 mt-3">
            {usage.isLimitReached ? (
              <>
                <Button
                  onClick={() => router.push("/settings/ai")}
                  size="sm"
                  variant="default"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  أضف API Key خاص
                </Button>
                <Button
                  onClick={() => router.push("/pricing")}
                  size="sm"
                  variant="outline"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  ترقية الخطة
                </Button>
              </>
            ) : usage.percentage >= 80 ? (
              <>
                <Button
                  onClick={() => router.push("/pricing")}
                  size="sm"
                  variant="default"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  ترقية للحصول على المزيد
                </Button>
                <Button
                  onClick={() => router.push("/settings/ai")}
                  size="sm"
                  variant="outline"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  أو أضف API Key خاص
                </Button>
              </>
            ) : (
              <Button
                onClick={() => router.push("/settings/ai")}
                size="sm"
                variant="outline"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                أضف API Key خاص لاستخدام غير محدود
              </Button>
            )}
          </div>

          {/* Benefits List */}
          {usage.plan === "free" && (
            <div className="mt-3 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-semibold mb-2">مع API Key خاص:</p>
              <ul className="text-xs space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  استخدام غير محدود
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  أنت تتحكم في التكلفة
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  خصوصية أفضل
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </Alert>
  );
}
