"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  AlertCircle,
  Zap,
  MessageSquare,
  TrendingUp,
  Target,
  Lightbulb,
  ChevronRight,
  Clock,
  Activity,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface AIAlert {
  id: string;
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  time?: string;
}

interface AISuggestion {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface AICompanionSidebarProps {
  className?: string;
}

export function AICompanionSidebar({ className }: AICompanionSidebarProps) {
  const t = useTranslations("aiCommandCenter.companion");

  // Mock alerts for now
  const alerts: AIAlert[] = [
    {
      id: "1",
      severity: "high",
      title: "2 Negative Reviews",
      description: "Immediate response recommended",
      time: "2 min ago",
      action: {
        label: "Respond Now",
        onClick: () => (window.location.href = "/reviews?status=negative"),
      },
    },
    {
      id: "2",
      severity: "medium",
      title: "3 Unanswered Questions",
      description: "Pending for over 24 hours",
      time: "1 hour ago",
      action: {
        label: "Answer",
        onClick: () => (window.location.href = "/questions?status=pending"),
      },
    },
    {
      id: "3",
      severity: "low",
      title: "Weekly Report Ready",
      description: "Performance insights available",
      time: "Today",
      action: {
        label: "View Report",
        onClick: () => (window.location.href = "/analytics"),
      },
    },
  ];

  // AI-powered suggestions
  const suggestions: AISuggestion[] = [
    {
      id: "1",
      icon: <TrendingUp className="h-4 w-4" />,
      title: "Peak Hours Post",
      description: "Your audience is most active now",
      impact: "high",
      action: {
        label: "Create Post",
        onClick: () => (window.location.href = "/posts/create"),
      },
    },
    {
      id: "2",
      icon: <Target className="h-4 w-4" />,
      title: "Weekend Special",
      description: "Boost weekend traffic by 30%",
      impact: "high",
      action: {
        label: "Schedule",
        onClick: () =>
          (window.location.href = "/posts/create?template=special"),
      },
    },
    {
      id: "3",
      icon: <Lightbulb className="h-4 w-4" />,
      title: "Update Business Hours",
      description: "Holiday season approaching",
      impact: "medium",
      action: {
        label: "Update",
        onClick: () => (window.location.href = "/settings/business"),
      },
    },
  ];

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case "high":
        return {
          container: "bg-red-500/10 border-red-500/30",
          icon: "text-red-400",
          badge: "bg-red-500/20 text-red-400 border-red-500/30",
        };
      case "medium":
        return {
          container: "bg-yellow-500/10 border-yellow-500/30",
          icon: "text-yellow-400",
          badge: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
        };
      case "low":
        return {
          container: "bg-blue-500/10 border-blue-500/30",
          icon: "text-blue-400",
          badge: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        };
      default:
        return {
          container: "bg-zinc-800/50 border-zinc-700",
          icon: "text-zinc-400",
          badge: "bg-zinc-800 text-zinc-400 border-zinc-700",
        };
    }
  };

  const getImpactStyles = (impact: string) => {
    switch (impact) {
      case "high":
        return "bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-500/30";
      case "medium":
        return "bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/30";
      case "low":
        return "bg-zinc-800/50 border-zinc-700";
      default:
        return "bg-zinc-800/50 border-zinc-700";
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* AI Status Card */}
      <Card className="border-orange-500/20 bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-zinc-900 backdrop-blur-xl">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Sparkles className="h-5 w-5 text-orange-500" />
                <div className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              </div>
              <span className="font-medium text-zinc-100">AI Assistant</span>
            </div>
            <Badge
              variant="outline"
              className="bg-green-500/20 text-green-400 border-green-500/30"
            >
              Active
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-2 bg-zinc-800/50 rounded-lg">
              <Activity className="h-4 w-4 text-orange-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-zinc-100">94%</div>
              <div className="text-xs text-zinc-400">Automation</div>
            </div>
            <div className="text-center p-2 bg-zinc-800/50 rounded-lg">
              <Clock className="h-4 w-4 text-purple-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-zinc-100">2.1h</div>
              <div className="text-xs text-zinc-400">Saved Today</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content with Tabs */}
      <Card className="border-orange-500/20 bg-zinc-900/50 backdrop-blur-sm">
        <Tabs defaultValue="alerts" className="w-full">
          <CardHeader className="pb-3">
            <TabsList className="grid w-full grid-cols-2 bg-zinc-800/50">
              <TabsTrigger
                value="alerts"
                className="text-xs data-[state=active]:bg-orange-500/20"
              >
                <AlertCircle className="h-3 w-3 mr-1" />
                Alerts ({alerts.length})
              </TabsTrigger>
              <TabsTrigger
                value="suggestions"
                className="text-xs data-[state=active]:bg-purple-500/20"
              >
                <Lightbulb className="h-3 w-3 mr-1" />
                AI Insights
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          {/* Alerts Tab */}
          <TabsContent value="alerts">
            <CardContent className="space-y-3 p-4 pt-0">
              <AnimatePresence>
                {alerts.map((alert, index) => {
                  const styles = getSeverityStyles(alert.severity);
                  return (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.1 }}
                      className={cn(
                        "p-3 rounded-lg border transition-all",
                        styles.container,
                        "hover:scale-[1.02] cursor-pointer",
                      )}
                      onClick={alert.action?.onClick}
                    >
                      <div className="flex items-start gap-2">
                        <AlertCircle
                          className={cn("h-4 w-4 mt-0.5 shrink-0", styles.icon)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="text-sm font-medium text-zinc-100 truncate">
                              {alert.title}
                            </p>
                            {alert.time && (
                              <span className="text-xs text-zinc-500 shrink-0">
                                {alert.time}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 mb-2">
                            {alert.description}
                          </p>
                          {alert.action && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className={cn(
                                "h-7 text-xs w-full justify-between",
                                styles.icon,
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                alert.action!.onClick();
                              }}
                            >
                              {alert.action.label}
                              <ChevronRight className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {alerts.length === 0 && (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
                  <p className="text-sm text-zinc-400">
                    No alerts at the moment
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Great job keeping up!
                  </p>
                </div>
              )}
            </CardContent>
          </TabsContent>

          {/* Suggestions Tab */}
          <TabsContent value="suggestions">
            <CardContent className="space-y-3 p-4 pt-0">
              <AnimatePresence>
                {suggestions.map((suggestion, index) => (
                  <motion.div
                    key={suggestion.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      "p-3 rounded-lg border transition-all hover:scale-[1.02] cursor-pointer",
                      getImpactStyles(suggestion.impact),
                    )}
                    onClick={suggestion.action?.onClick}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-zinc-800/50 shrink-0">
                        {suggestion.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-zinc-100">
                            {suggestion.title}
                          </p>
                          {suggestion.impact === "high" && (
                            <Badge
                              variant="outline"
                              className="text-xs bg-orange-500/20 text-orange-400 border-orange-500/30"
                            >
                              High Impact
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 mb-2">
                          {suggestion.description}
                        </p>
                        {suggestion.action && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs w-full justify-between hover:bg-zinc-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              suggestion.action!.onClick();
                            }}
                          >
                            {suggestion.action.label}
                            <Zap className="h-3 w-3 text-orange-400" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Quick Actions Card */}
      <Card className="border-orange-500/20 bg-zinc-900/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="justify-start hover:bg-orange-500/10"
            onClick={() => (window.location.href = "/reviews")}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Reviews
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="justify-start hover:bg-purple-500/10"
            onClick={() => (window.location.href = "/posts")}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Posts
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="justify-start hover:bg-blue-500/10"
            onClick={() => (window.location.href = "/analytics")}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="justify-start hover:bg-green-500/10"
            onClick={() => (window.location.href = "/automation")}
          >
            <Zap className="h-4 w-4 mr-2" />
            Automate
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
