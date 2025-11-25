"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";

export interface RealtimeUpdate<T = Record<string, unknown>> {
  type: "review" | "post" | "question" | "location" | "activity";
  action: "INSERT" | "UPDATE" | "DELETE";
  data: T;
  timestamp: string;
}

type RealtimePayload = RealtimePostgresChangesPayload<Record<string, unknown>>;

export interface UseDashboardRealtimeOptions {
  userId: string;
  onReviewUpdate?: (data: RealtimePayload) => void;
  onPostUpdate?: (data: RealtimePayload) => void;
  onQuestionUpdate?: (data: RealtimePayload) => void;
  onLocationUpdate?: (data: RealtimePayload) => void;
  onActivityUpdate?: (data: RealtimePayload) => void;
  enabled?: boolean;
}

export function useDashboardRealtime({
  userId,
  onReviewUpdate,
  onPostUpdate,
  onQuestionUpdate,
  onLocationUpdate,
  onActivityUpdate,
  enabled = true,
}: UseDashboardRealtimeOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<RealtimeUpdate | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClient());

  const handleUpdate = useCallback(
    (
      type: RealtimeUpdate["type"],
      action: RealtimeUpdate["action"],
      payload: RealtimePayload,
    ) => {
      const update: RealtimeUpdate = {
        type,
        action,
        data: payload.new || payload.old,
        timestamp: new Date().toISOString(),
      };

      setLastUpdate(update);
      setUpdateCount((prev) => prev + 1);

      // Call specific handlers
      switch (type) {
        case "review":
          onReviewUpdate?.(payload);
          break;
        case "post":
          onPostUpdate?.(payload);
          break;
        case "question":
          onQuestionUpdate?.(payload);
          break;
        case "location":
          onLocationUpdate?.(payload);
          break;
        case "activity":
          onActivityUpdate?.(payload);
          break;
      }
    },
    [
      onReviewUpdate,
      onPostUpdate,
      onQuestionUpdate,
      onLocationUpdate,
      onActivityUpdate,
    ],
  );

  useEffect(() => {
    if (!enabled || !userId) return;

    const supabase = supabaseRef.current;

    // Create channel for dashboard updates
    const channel = supabase!
      .channel(`dashboard-updates-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "gmb_reviews",
          filter: `user_id=eq.${userId}`,
        },
        (payload) =>
          handleUpdate(
            "review",
            payload.eventType as RealtimeUpdate["action"],
            payload,
          ),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "gmb_posts",
          filter: `user_id=eq.${userId}`,
        },
        (payload) =>
          handleUpdate(
            "post",
            payload.eventType as RealtimeUpdate["action"],
            payload,
          ),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "gmb_questions",
          filter: `user_id=eq.${userId}`,
        },
        (payload) =>
          handleUpdate(
            "question",
            payload.eventType as RealtimeUpdate["action"],
            payload,
          ),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "gmb_locations",
          filter: `user_id=eq.${userId}`,
        },
        (payload) =>
          handleUpdate(
            "location",
            payload.eventType as RealtimeUpdate["action"],
            payload,
          ),
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_logs",
          filter: `user_id=eq.${userId}`,
        },
        (payload) =>
          handleUpdate(
            "activity",
            payload.eventType as RealtimeUpdate["action"],
            payload,
          ),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsConnected(true);
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setIsConnected(false);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase!.removeChannel(channelRef.current);
        channelRef.current = null;
        setIsConnected(false);
      }
    };
  }, [userId, enabled, handleUpdate]);

  const reconnect = useCallback(() => {
    if (channelRef.current) {
      const supabase = supabaseRef.current;
      supabase!.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    // Trigger re-subscription by toggling enabled
    setIsConnected(false);
  }, []);

  return {
    isConnected,
    lastUpdate,
    updateCount,
    reconnect,
  };
}
