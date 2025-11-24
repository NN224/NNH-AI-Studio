import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export interface Notification {
  id: string;
  type: "review" | "insight" | "achievement" | "alert" | "update" | "system";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: "low" | "medium" | "high" | "urgent";
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
}

interface NotificationsResponse {
  notifications: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    metadata: Record<string, unknown>;
  }>;
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
  lastUpdated: string;
}

/**
 * Hook for fetching and managing notifications
 */
export function useNotifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch notifications from API
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<NotificationsResponse>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await fetch("/api/notifications?limit=20");
      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }
      return response.json();
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every 60 seconds for real-time updates
    refetchIntervalInBackground: false,
  });

  // Transform API response to Notification format
  const notifications: Notification[] =
    data?.notifications.map((n) => ({
      id: n.id,
      type: mapNotificationType(n.type),
      title: n.title,
      message: n.message,
      timestamp: new Date(n.timestamp),
      read: n.read,
      priority: inferPriority(n.type, n.metadata),
      actionUrl: n.metadata?.actionUrl as string | undefined,
      actionLabel: n.metadata?.actionLabel as string | undefined,
      metadata: n.metadata,
    })) || [];

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
      });
      if (!response.ok) {
        throw new Error("Failed to mark notification as read");
      }
      return response.json();
    },
    onSuccess: (_, notificationId) => {
      // Update cache optimistically
      queryClient.setQueryData<NotificationsResponse>(
        ["notifications"],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            notifications: old.notifications.map((n) =>
              n.id === notificationId ? { ...n, read: true } : n
            ),
          };
        }
      );
    },
    onError: (_error) => {
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/notifications/read-all", {
        method: "PATCH",
      });
      if (!response.ok) {
        throw new Error("Failed to mark all notifications as read");
      }
      return response.json();
    },
    onSuccess: () => {
      // Update cache optimistically
      queryClient.setQueryData<NotificationsResponse>(
        ["notifications"],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            notifications: old.notifications.map((n) => ({ ...n, read: true })),
          };
        }
      );
    },
    onError: (_error) => {
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    },
  });

  // Delete notification
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete notification");
      }
      return response.json();
    },
    onSuccess: (_, notificationId) => {
      // Update cache optimistically
      queryClient.setQueryData<NotificationsResponse>(
        ["notifications"],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            notifications: old.notifications.filter((n) => n.id !== notificationId),
            pagination: {
              ...old.pagination,
              total: old.pagination.total - 1,
            },
          };
        }
      );
    },
    onError: (_error) => {
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive",
      });
    },
  });

  // Clear all notifications
  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/notifications/clear-all", {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to clear all notifications");
      }
      return response.json();
    },
    onSuccess: () => {
      // Update cache optimistically
      queryClient.setQueryData<NotificationsResponse>(
        ["notifications"],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            notifications: [],
            pagination: {
              ...old.pagination,
              total: 0,
            },
          };
        }
      );
    },
    onError: (_error) => {
      toast({
        title: "Error",
        description: "Failed to clear all notifications",
        variant: "destructive",
      });
    },
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    isLoading,
    error,
    unreadCount,
    refetch,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,
    clearAll: clearAllMutation.mutate,
  };
}

/**
 * Map API notification type to component type
 */
function mapNotificationType(
  type: string
): Notification["type"] {
  const typeMap: Record<string, Notification["type"]> = {
    system: "system",
    review_reply: "review",
    question_answer: "review",
    sync_complete: "update",
    sync_error: "alert",
    auto_reply: "review",
    settings_update: "update",
    location_update: "update",
    achievement: "achievement",
    insight: "insight",
  };

  return typeMap[type] || "update";
}

/**
 * Infer notification priority from type and metadata
 */
function inferPriority(
  type: string,
  metadata: Record<string, unknown>
): Notification["priority"] {
  // High priority types
  if (type === "sync_error" || type === "alert") {
    return "high";
  }

  // Urgent if specified in metadata
  if (metadata?.priority === "urgent") {
    return "urgent";
  }

  // Medium priority for reviews and questions
  if (type === "review_reply" || type === "question_answer") {
    return "medium";
  }

  // Low priority for everything else
  return "low";
}
