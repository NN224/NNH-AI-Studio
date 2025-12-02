"use client";

import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

type PostgresChangeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

interface RealtimeConfig<T> {
  /** Table name to subscribe to */
  table: string;
  /** Schema name (default: public) */
  schema?: string;
  /** Event types to listen for */
  events?: PostgresChangeEvent[];
  /** Filter by column (e.g., "user_id=eq.xxx") */
  filter?: string;
  /** Callback when new record is inserted */
  onInsert?: (record: T) => void;
  /** Callback when record is updated */
  onUpdate?: (record: T, old: T) => void;
  /** Callback when record is deleted */
  onDelete?: (old: T) => void;
  /** Show toast notifications */
  showToasts?: boolean;
  /** Custom toast messages */
  toastMessages?: {
    insert?: string;
    update?: string;
    delete?: string;
  };
  /** Enable/disable subscription */
  enabled?: boolean;
}

interface RealtimeState {
  isConnected: boolean;
  lastEvent: Date | null;
  eventsReceived: number;
  error: string | null;
}

interface PostgresPayload<T> {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: T;
  old: T;
}

// ============================================================================
// Hook: useRealtime
// ============================================================================

/**
 * Hook for Supabase Realtime subscriptions
 */
export function useRealtime<T extends Record<string, unknown>>(
  config: RealtimeConfig<T>,
): RealtimeState {
  const {
    table,
    schema = "public",
    events = ["*"],
    filter,
    onInsert,
    onUpdate,
    onDelete,
    showToasts = false,
    toastMessages,
    enabled = true,
  } = config;

  const [state, setState] = useState<RealtimeState>({
    isConnected: false,
    lastEvent: null,
    eventsReceived: 0,
    error: null,
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = createClient();

  // Handle payload based on event type
  const handlePayload = useCallback(
    (payload: PostgresPayload<T>) => {
      const eventType = payload.eventType;
      const newRecord = payload.new;
      const oldRecord = payload.old;

      setState((prev) => ({
        ...prev,
        lastEvent: new Date(),
        eventsReceived: prev.eventsReceived + 1,
      }));

      switch (eventType) {
        case "INSERT":
          onInsert?.(newRecord);
          if (showToasts) {
            toast.success(
              toastMessages?.insert || `New ${table} record added`,
              {
                duration: 4000,
              },
            );
          }
          break;

        case "UPDATE":
          onUpdate?.(newRecord, oldRecord);
          if (showToasts) {
            toast.info(toastMessages?.update || `${table} record updated`, {
              duration: 3000,
            });
          }
          break;

        case "DELETE":
          onDelete?.(oldRecord);
          if (showToasts) {
            toast.warning(toastMessages?.delete || `${table} record deleted`, {
              duration: 3000,
            });
          }
          break;
      }
    },
    [table, onInsert, onUpdate, onDelete, showToasts, toastMessages],
  );

  useEffect(() => {
    if (!enabled || !supabase) {
      return;
    }

    // Create unique channel name
    const channelName = `realtime:${schema}:${table}:${filter || "all"}`;

    // Create channel with postgres_changes listener
    const channel = supabase.channel(channelName);

    // Add listener for postgres changes
    channel.on(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      "postgres_changes" as any,
      {
        event: events.length === 1 ? events[0] : "*",
        schema,
        table,
        filter,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (payload: any) => {
        handlePayload(payload as PostgresPayload<T>);
      },
    );

    // Subscribe to channel
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setState((prev) => ({
          ...prev,
          isConnected: true,
          error: null,
        }));
        console.log(`[Realtime] ✅ Subscribed to ${table}`);
      } else if (status === "CHANNEL_ERROR") {
        setState((prev) => ({
          ...prev,
          isConnected: false,
          error: "Channel error",
        }));
        console.error(`[Realtime] ❌ Channel error for ${table}`);
      } else if (status === "TIMED_OUT") {
        setState((prev) => ({
          ...prev,
          isConnected: false,
          error: "Connection timed out",
        }));
        console.error(`[Realtime] ⏱️ Timeout for ${table}`);
      } else if (status === "CLOSED") {
        setState((prev) => ({
          ...prev,
          isConnected: false,
        }));
        console.log(`[Realtime] 🔌 Closed ${table}`);
      }
    });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        console.log(`[Realtime] 🔌 Unsubscribing from ${table}`);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, supabase, table, schema, filter, events, handlePayload]);

  return state;
}

// ============================================================================
// Specialized Hooks
// ============================================================================

/**
 * Hook for realtime reviews updates
 */
export function useRealtimeReviews(
  userId: string | undefined,
  options: {
    onNewReview?: (review: unknown) => void;
    onReviewUpdate?: (review: unknown) => void;
    showToasts?: boolean;
  } = {},
) {
  return useRealtime({
    table: "gmb_reviews",
    filter: userId ? `user_id=eq.${userId}` : undefined,
    onInsert: options.onNewReview,
    onUpdate: options.onReviewUpdate,
    showToasts: options.showToasts ?? true,
    toastMessages: {
      insert: "🆕 New review received!",
      update: "📝 Review updated",
    },
    enabled: !!userId,
  });
}

/**
 * Hook for realtime questions updates
 */
export function useRealtimeQuestions(
  userId: string | undefined,
  options: {
    onNewQuestion?: (question: unknown) => void;
    onQuestionUpdate?: (question: unknown) => void;
    showToasts?: boolean;
  } = {},
) {
  return useRealtime({
    table: "gmb_questions",
    filter: userId ? `user_id=eq.${userId}` : undefined,
    onInsert: options.onNewQuestion,
    onUpdate: options.onQuestionUpdate,
    showToasts: options.showToasts ?? true,
    toastMessages: {
      insert: "❓ New question received!",
      update: "💬 Question updated",
    },
    enabled: !!userId,
  });
}

/**
 * Hook for realtime notifications
 */
export function useRealtimeNotifications(
  userId: string | undefined,
  options: {
    onNewNotification?: (notification: unknown) => void;
    showToasts?: boolean;
  } = {},
) {
  return useRealtime({
    table: "notifications",
    filter: userId ? `user_id=eq.${userId}` : undefined,
    events: ["INSERT"],
    onInsert: options.onNewNotification,
    showToasts: options.showToasts ?? false,
    enabled: !!userId,
  });
}

/**
 * Hook for realtime sync status updates
 */
export function useRealtimeSyncStatus(
  accountId: string | undefined,
  options: {
    onStatusChange?: (status: unknown) => void;
  } = {},
) {
  return useRealtime({
    table: "sync_status",
    filter: accountId ? `account_id=eq.${accountId}` : undefined,
    events: ["UPDATE"],
    onUpdate: options.onStatusChange,
    showToasts: false,
    enabled: !!accountId,
  });
}
