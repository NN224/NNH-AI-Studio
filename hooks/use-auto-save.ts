"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  loadDraft,
  saveDraft,
  deleteDraft,
  subscribeToDraftEvents,
  recordDraftTelemetry,
  type DraftKind,
  type DraftRecord,
} from "@/lib/storage/draft-manager"
import { sanitizeHtml } from "@/lib/security/sanitize-html"

const DEFAULT_DEBOUNCE_MS = 1000

interface UseAutoSaveOptions {
  key?: string | null
  type: DraftKind
  initialValue?: string
  enabled?: boolean
  debounceMs?: number
  metadata?: Record<string, unknown>
}

interface UseAutoSaveResult {
  value: string
  setValue: React.Dispatch<React.SetStateAction<string>>
  lastSavedAt: number | null
  showRestorePrompt: boolean
  pendingDraftTimestamp: number | null
  restoreDraft: () => void
  discardDraft: () => void
  clearDraft: () => void
  isDirty: boolean
  hasDraft: boolean
}

export function useAutoSave({
  key,
  type,
  initialValue = "",
  enabled = true,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  metadata,
}: UseAutoSaveOptions): UseAutoSaveResult {
  const [value, setValue] = useState(initialValue)
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const [showRestorePrompt, setShowRestorePrompt] = useState(false)
  const [pendingDraft, setPendingDraft] = useState<DraftRecord | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [hasDraft, setHasDraft] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const latestKeyRef = useRef<string | null>(key ?? null)
  const initialValueRef = useRef(initialValue)

  const normalizedInitialValue = useMemo(() => initialValue ?? "", [initialValue])

  useEffect(() => {
    initialValueRef.current = normalizedInitialValue
  }, [normalizedInitialValue])

  useEffect(() => {
    latestKeyRef.current = key ?? null
    if (!key) {
      setValue(normalizedInitialValue)
      setPendingDraft(null)
      setShowRestorePrompt(false)
      setLastSavedAt(null)
      setHasDraft(false)
      return
    }

    const existingDraft = loadDraft(key)
    if (existingDraft) {
      setPendingDraft(existingDraft)
      setShowRestorePrompt(true)
      setHasDraft(true)
    } else {
      setPendingDraft(null)
      setShowRestorePrompt(false)
      setHasDraft(false)
    }

    setValue(normalizedInitialValue)
    setLastSavedAt(existingDraft?.updatedAt ?? null)
    setIsDirty(false)
  }, [key, normalizedInitialValue])

  useEffect(() => {
    if (!enabled || !key) {
      return
    }

    const unsubscribe = subscribeToDraftEvents((event) => {
      if (event.action === "save" && event.draft?.key === key) {
        setHasDraft(true)
        if (!showRestorePrompt) {
          setLastSavedAt(event.draft.updatedAt)
        }
      }

      if (event.action === "delete" && event.key === key) {
        setHasDraft(false)
        setPendingDraft(null)
        setShowRestorePrompt(false)
      }
    })

    return unsubscribe
  }, [key, showRestorePrompt, enabled])

  useEffect(() => {
    if (!enabled || !key) {
      return
    }

    if (pendingDraft && showRestorePrompt) {
      return
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (sanitizeHtml(value).trim() === "") {
      deleteDraft(key)
      setLastSavedAt(null)
      setIsDirty(false)
      setHasDraft(false)
      return
    }

    setIsDirty(true)
    debounceRef.current = setTimeout(() => {
      saveDraft(key, type, value, metadata)
      setLastSavedAt(Date.now())
      setIsDirty(false)
      setHasDraft(true)
    }, debounceMs)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [value, key, type, enabled, metadata, debounceMs, pendingDraft, showRestorePrompt])

  const restoreDraft = useCallback(() => {
    if (!pendingDraft) return
    setValue(pendingDraft.content)
    setLastSavedAt(pendingDraft.updatedAt)
    setShowRestorePrompt(false)
    setPendingDraft(null)
    if (key) {
      recordDraftTelemetry('draft_restored', { key, type })
    }
  }, [pendingDraft, key, type])

  const discardDraft = useCallback(() => {
    if (!key) return
    deleteDraft(key)
    setPendingDraft(null)
    setShowRestorePrompt(false)
    setHasDraft(false)
  }, [key])

  const clearDraft = useCallback(() => {
    if (!key) return
    deleteDraft(key)
    setLastSavedAt(null)
    setHasDraft(false)
    setPendingDraft(null)
    setShowRestorePrompt(false)
  }, [key])

  const pendingDraftTimestamp = pendingDraft?.updatedAt ?? null

  return {
    value,
    setValue,
    lastSavedAt,
    showRestorePrompt,
    pendingDraftTimestamp,
    restoreDraft,
    discardDraft,
    clearDraft,
    isDirty,
    hasDraft,
  }
}

