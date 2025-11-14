"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

export type SyncProgressStage =
  | "init"
  | "locations_fetch"
  | "reviews_fetch"
  | "questions_fetch"
  | "transaction"
  | "cache_refresh"
  | "complete"

export type SyncProgressStatus = "pending" | "running" | "completed" | "error"

export type SyncProgressState = {
  syncId?: string
  accountId?: string
  stage: SyncProgressStage
  status: SyncProgressStatus
  percentage: number
  message?: string
  counts?: Record<string, number | undefined>
  error?: string
  timestamp?: string
}

type ProgressEventPayload = {
  type: string
  payload: SyncProgressState
}

type StartOptions = {
  accountId: string
  syncId?: string
}

export function useSyncProgress() {
  const [params, setParams] = useState<StartOptions | null>(null)
  const [progress, setProgress] = useState<SyncProgressState | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [usingPolling, setUsingPolling] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [lastUpdate, setLastUpdate] = useState<number | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const supportsSSE = useMemo(() => {
    return typeof window !== "undefined" && "EventSource" in window
  }, [])

  const resetTimers = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
  }

  const handleProgressPayload = useCallback((payload?: SyncProgressState | null) => {
    if (!payload) {
      return
    }
    setProgress(payload)
    setIsConnected(true)
    setLastUpdate(Date.now())

    if (payload.status === "running" && !startTime) {
      setStartTime(Date.now())
    } else if (!startTime) {
      setStartTime(Date.now())
    }
  }, [startTime])

  const pollLatestProgress = useCallback(async (options: StartOptions) => {
    if (typeof window === "undefined") {
      return
    }
    try {
      const url = new URL("/api/sync/progress", window.location.origin)
      url.searchParams.set("mode", "poll")
      url.searchParams.set("accountId", options.accountId)
      if (options.syncId) {
        url.searchParams.set("syncId", options.syncId)
      }
      const response = await fetch(url.toString(), { cache: "no-store" })
      if (!response.ok) {
        setIsConnected(false)
        return
      }
      const data = (await response.json()) as { event?: SyncProgressState | null }
      handleProgressPayload(data.event ?? null)
      setIsConnected(true)
    } catch (error) {
      console.warn("[useSyncProgress] Poll error", error)
      setIsConnected(false)
    }
  }, [handleProgressPayload])

  useEffect(() => {
    if (!params) {
      resetTimers()
      setProgress(null)
      setIsConnected(false)
      setUsingPolling(false)
      setStartTime(null)
      setLastUpdate(null)
      return
    }

    let eventSource: EventSource | null = null
    let cancelled = false

    const initEventSource = () => {
      if (!supportsSSE) {
        setUsingPolling(true)
        pollLatestProgress(params)
        pollTimerRef.current = setInterval(() => pollLatestProgress(params), 5_000)
        return
      }

      try {
        const url = new URL("/api/sync/progress", window.location.origin)
        url.searchParams.set("accountId", params.accountId)
        if (params.syncId) {
          url.searchParams.set("syncId", params.syncId)
        }
        eventSource = new EventSource(url.toString())
        eventSource.onmessage = (event) => {
          if (cancelled) return
          try {
            const parsed = JSON.parse(event.data) as ProgressEventPayload | { type: string; payload?: SyncProgressState }
            if (parsed?.payload) {
              handleProgressPayload(parsed.payload)
            }
          } catch (error) {
            console.warn("[useSyncProgress] Failed to parse progress event", error)
          }
        }
        eventSource.onerror = () => {
          setIsConnected(false)
          eventSource?.close()
          resetTimers()
          reconnectTimerRef.current = setTimeout(() => {
            if (!cancelled) {
              initEventSource()
            }
          }, 5_000)
        }
        setUsingPolling(false)
      } catch (error) {
        console.warn("[useSyncProgress] SSE not available, falling back to polling", error)
        setUsingPolling(true)
        pollLatestProgress(params)
        pollTimerRef.current = setInterval(() => pollLatestProgress(params), 5_000)
      }
    }

    initEventSource()

    return () => {
      cancelled = true
      eventSource?.close()
      resetTimers()
    }
  }, [params, supportsSSE, pollLatestProgress, handleProgressPayload])

  const startTracking = useCallback((options: StartOptions) => {
    setParams(options)
  }, [])

  const stopTracking = useCallback(() => {
    setParams(null)
  }, [])

  const elapsedMs = startTime && lastUpdate ? lastUpdate - startTime : null
  const etaMs =
    elapsedMs && progress?.percentage && progress.percentage > 0 && progress.percentage < 100
      ? Math.max(0, Math.round((elapsedMs / progress.percentage) * (100 - progress.percentage)))
      : null

  return {
    progress,
    startTracking,
    stopTracking,
    isConnected,
    elapsedMs,
    etaMs,
    usingPolling,
    active: Boolean(params),
  }
}

