"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, CheckSquare, Video, Target } from "lucide-react";
import { Link } from "@/lib/navigation";
import { motion } from "framer-motion";

interface NextStep {
  id: string;
  icon: "zap" | "check" | "video" | "target";
  titleKey: string;
  href: string;
  priority: "high" | "medium" | "low";
}

interface NextStepsCardProps {
  steps: NextStep[];
}

export function NextStepsCard({ steps }: NextStepsCardProps) {
  const t = useTranslations("dashboard.nextSteps");

  const getIcon = (iconName: string) => {
    const iconClass = "w-5 h-5";
    switch (iconName) {
      case "zap":
        return <Zap className={iconClass} />;
      case "check":
        return <CheckSquare className={iconClass} />;
      case "video":
        return <Video className={iconClass} />;
      case "target":
        return <Target className={iconClass} />;
      default:
        return <Target className={iconClass} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-red-500/20 bg-red-500/5";
      case "medium":
        return "border-orange-500/20 bg-orange-500/5";
      default:
        return "border-border";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-blue-500" />
            </div>
            <CardTitle className="text-2xl">{t("title")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {steps.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckSquare className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-lg font-medium mb-2">{t("allDone.title")}</p>
              <p className="text-sm text-muted-foreground">
                {t("allDone.description")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {steps.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <Link href={step.href}>
                    <div
                      className={`flex items-center justify-between p-4 rounded-lg border hover:border-orange-500/50 transition-colors cursor-pointer group ${getPriorityColor(step.priority)}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                          <span className="text-sm font-bold text-orange-500">
                            {index + 1}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-orange-500">
                            {getIcon(step.icon)}
                          </div>
                          <p className="font-medium group-hover:text-orange-500 transition-colors">
                            {t(`steps.${step.titleKey}`)}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
