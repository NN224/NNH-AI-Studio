"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  Bell,
  BellRing,
  X,
  Check,
  AlertCircle,
  MessageSquare,
  TrendingUp,
  Star,
  Zap,
  Clock,
  ChevronRight,
  Settings,
  Volume2,
  VolumeX,
  Filter,
  CheckCircle2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/use-notifications";

interface NotificationWithIcon {
  id: string;
  type: "review" | "insight" | "achievement" | "alert" | "update" | "system";
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
  priority: "low" | "medium" | "high" | "urgent";
  actionUrl?: string;
  actionLabel?: string;
  icon?: React.ElementType;
}

interface SmartNotificationsProps {
  userId?: string;
}

export function SmartNotifications({ userId }: SmartNotificationsProps) {
  const t = useTranslations("home.notifications");
  const router = useRouter();
  const { toast } = useToast();

  // Use real notifications hook
  const {
    notifications: realNotifications,
    isLoading,
    unreadCount: apiUnreadCount,
    markAsRead: apiMarkAsRead,
    markAllAsRead: apiMarkAllAsRead,
    deleteNotification: apiDeleteNotification,
    clearAll: apiClearAll,
  } = useNotifications(userId);

  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread" | "high-priority">(
    "all",
  );
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const [previousUnreadCount, setPreviousUnreadCount] = useState(0);

  // Transform real notifications to include icons
  const notifications: NotificationWithIcon[] = realNotifications.map((n) => ({
    ...n,
    description: n.message,
    icon: getIconForType(n.type),
  }));

  // Detect new notifications
  useEffect(() => {
    if (apiUnreadCount > previousUnreadCount && previousUnreadCount > 0) {
      setHasNewNotifications(true);
      playNotificationSound();

      // Show toast for new high priority notifications
      const newHighPriorityNotifications = notifications.filter(
        (n) =>
          !n.read &&
          (n.priority === "high" || n.priority === "urgent") &&
          new Date(n.timestamp).getTime() > Date.now() - 60000, // Last minute
      );

      newHighPriorityNotifications.forEach((notification) => {
        toast({
          title: notification.title,
          description: notification.description,
          action: notification.actionUrl ? (
            <Button size="sm" onClick={() => handleAction(notification)}>
              {notification.actionLabel || "View"}
            </Button>
          ) : undefined,
        });
      });
    }
    setPreviousUnreadCount(apiUnreadCount);
  }, [apiUnreadCount, previousUnreadCount, notifications, toast]);

  // Play notification sound
  const playNotificationSound = () => {
    if (soundEnabled && typeof window !== "undefined") {
      const audio = new Audio("/notification-sound.mp3");
      audio.volume = 0.5;
      audio.play().catch(() => {});
    }
  };

  // Get icon for notification type
  function getIconForType(
    type: NotificationWithIcon["type"],
  ): React.ElementType {
    const iconMap: Record<NotificationWithIcon["type"], React.ElementType> = {
      review: Star,
      insight: TrendingUp,
      achievement: Zap,
      alert: AlertCircle,
      update: CheckCircle2,
      system: Bell,
    };
    return iconMap[type] || MessageSquare;
  }

  // Mark notification as read
  const markAsRead = (notificationId: string) => {
    apiMarkAsRead(notificationId);
  };

  // Mark all as read
  const markAllAsRead = () => {
    apiMarkAllAsRead();
    setHasNewNotifications(false);
  };

  // Delete notification
  const deleteNotification = (notificationId: string) => {
    apiDeleteNotification(notificationId);
  };

  // Clear all notifications
  const clearAll = () => {
    apiClearAll();
    setHasNewNotifications(false);
  };

  // Handle action click
  const handleAction = (notification: NotificationWithIcon) => {
    markAsRead(notification.id);
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
      setIsOpen(false);
    }
  };

  // Get filtered notifications
  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "high-priority")
      return n.priority === "high" || n.priority === "urgent";
    return true;
  });

  // Get unread count (use API count as source of truth)
  const unreadCount = apiUnreadCount;

  // Get notification color
  const getNotificationColor = (type: NotificationWithIcon["type"]) => {
    switch (type) {
      case "review":
        return "blue";
      case "insight":
        return "purple";
      case "achievement":
        return "yellow";
      case "alert":
        return "red";
      case "update":
        return "green";
      case "system":
        return "gray";
      default:
        return "gray";
    }
  };

  // Get priority color
  const getPriorityColor = (priority: NotificationWithIcon["priority"]) => {
    switch (priority) {
      case "urgent":
        return "red";
      case "high":
        return "orange";
      case "medium":
        return "yellow";
      case "low":
        return "gray";
      default:
        return "gray";
    }
  };

  return (
    <>
      {/* Notification Bell Button */}
      <motion.div className="relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="relative"
        >
          <AnimatePresence mode="wait">
            {hasNewNotifications || unreadCount > 0 ? (
              <motion.div
                key="bell-ring"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <BellRing className="h-5 w-5" />
              </motion.div>
            ) : (
              <motion.div
                key="bell"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Bell className="h-5 w-5" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Notification badge */}
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}

          {/* Pulse animation for new notifications */}
          {hasNewNotifications && (
            <motion.span
              className="absolute inset-0 rounded-lg bg-orange-500"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            />
          )}
        </Button>
      </motion.div>

      {/* Notifications Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/20 z-40 md:hidden"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="absolute right-0 top-12 z-50 w-96 max-w-[calc(100vw-2rem)]"
            >
              <Card className="border-orange-500/30 bg-black/95 backdrop-blur-xl shadow-2xl">
                {/* Header */}
                <div className="p-4 border-b border-border/40">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">Notifications</h3>
                    <div className="flex items-center gap-2">
                      {/* Sound toggle */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setSoundEnabled(!soundEnabled)}
                      >
                        {soundEnabled ? (
                          <Volume2 className="h-4 w-4" />
                        ) : (
                          <VolumeX className="h-4 w-4" />
                        )}
                      </Button>

                      {/* Filter menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <Filter className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>
                            Filter notifications
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setFilter("all")}>
                            All notifications
                            {filter === "all" && (
                              <Check className="ml-auto h-4 w-4" />
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setFilter("unread")}>
                            Unread only
                            {filter === "unread" && (
                              <Check className="ml-auto h-4 w-4" />
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setFilter("high-priority")}
                          >
                            High priority
                            {filter === "high-priority" && (
                              <Check className="ml-auto h-4 w-4" />
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Settings */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          router.push("/settings");
                          setIsOpen(false);
                        }}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Quick actions */}
                  {unreadCount > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {unreadCount} unread
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={markAllAsRead}
                        className="text-xs"
                      >
                        Mark all as read
                      </Button>
                    </div>
                  )}
                </div>

                {/* Notifications list */}
                <ScrollArea className="h-[400px]">
                  {isLoading ? (
                    <div className="p-8 text-center">
                      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3" />
                      <p className="text-muted-foreground">
                        Loading notifications...
                      </p>
                    </div>
                  ) : filteredNotifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">
                        {filter === "all"
                          ? "No notifications yet"
                          : filter === "unread"
                            ? "All caught up!"
                            : "No high priority notifications"}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/40">
                      {filteredNotifications.map((notification) => {
                        const Icon = notification.icon || MessageSquare;
                        const color = getNotificationColor(notification.type);

                        return (
                          <motion.div
                            key={notification.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className={cn(
                              "p-4 hover:bg-white/5 transition-colors cursor-pointer group",
                              !notification.read && "bg-orange-500/5",
                            )}
                            onClick={() => handleAction(notification)}
                            onMouseEnter={() =>
                              !notification.read && markAsRead(notification.id)
                            }
                          >
                            <div className="flex gap-3">
                              {/* Icon */}
                              <div
                                className={cn(
                                  "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                                  `bg-${color}-500/10`,
                                )}
                              >
                                <Icon
                                  className={cn("h-5 w-5", `text-${color}-500`)}
                                />
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <p className="font-medium text-sm flex items-center gap-2">
                                      {notification.title}
                                      {!notification.read && (
                                        <span className="w-2 h-2 bg-orange-500 rounded-full" />
                                      )}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                                      {notification.description}
                                    </p>
                                  </div>

                                  {/* Priority badge */}
                                  {(notification.priority === "high" ||
                                    notification.priority === "urgent") && (
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "text-xs shrink-0",
                                        `border-${getPriorityColor(notification.priority)}-500/50`,
                                        `text-${getPriorityColor(notification.priority)}-500`,
                                      )}
                                    >
                                      {notification.priority}
                                    </Badge>
                                  )}
                                </div>

                                {/* Footer */}
                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-xs text-muted-foreground">
                                    {formatRelativeTime(notification.timestamp)}
                                  </span>

                                  {notification.actionUrl && (
                                    <motion.div
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <span className="text-xs text-orange-500 flex items-center gap-1">
                                        {notification.actionLabel || "View"}
                                        <ChevronRight className="h-3 w-3" />
                                      </span>
                                    </motion.div>
                                  )}
                                </div>
                              </div>

                              {/* Delete button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(notification.id);
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>

                {/* Footer */}
                {notifications.length > 0 && (
                  <div className="p-3 border-t border-border/40">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      onClick={clearAll}
                    >
                      Clear all notifications
                    </Button>
                  </div>
                )}
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// Helper function to format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString();
}
