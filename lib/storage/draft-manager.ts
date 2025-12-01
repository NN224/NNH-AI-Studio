import { sanitizeHtml } from "@/lib/security/sanitize-html";
import { logger } from "@/lib/utils/logger";

const DRAFT_PREFIX = "nnh:draft:";
const DRAFT_CHANNEL = "nnh:draft-sync";
const DRAFT_VERSION = 1;
const DRAFT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type DraftTelemetryEvent =
  | "draft_saved"
  | "draft_deleted"
  | "draft_restored"
  | "draft_imported"
  | "draft_exported";

export type DraftKind = "review_reply" | "question_answer" | string;

export interface DraftRecord {
  key: string;
  type: DraftKind;
  content: string;
  version: number;
  updatedAt: number;
  metadata?: Record<string, unknown>;
}

type DraftEvent =
  | { action: "save"; draft: DraftRecord }
  | { action: "delete"; key: string }
  | { action: "clear" }
  | { action: "import"; drafts: DraftRecord[] };

const isBrowser = typeof window !== "undefined";
const listeners = new Set<(event: DraftEvent) => void>();
let broadcast: BroadcastChannel | null = null;

if (isBrowser && "BroadcastChannel" in window) {
  broadcast = new BroadcastChannel(DRAFT_CHANNEL);
  broadcast.addEventListener("message", (event) => {
    const data = event.data as DraftEvent;
    if (!data) return;
    if (data.action === "save" && data.draft) {
      listeners.forEach((handler) => handler(data));
    } else if (data.action === "delete") {
      listeners.forEach((handler) => handler(data));
    } else if (data.action === "clear" || data.action === "import") {
      listeners.forEach((handler) => handler(data));
    }
  });
}

function getStorage(): Storage | null {
  if (!isBrowser) return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function storageKey(key: string) {
  return `${DRAFT_PREFIX}${key}`;
}

function emit(event: DraftEvent, broadcastEvent = true) {
  listeners.forEach((handler) => handler(event));
  if (broadcastEvent && broadcast) {
    broadcast.postMessage(event);
  }
}

function telemetry(
  event: DraftTelemetryEvent,
  payload?: Record<string, unknown>,
) {
  if (process.env.NODE_ENV !== "production") {
    logger.debug(`DraftTelemetry: ${event}`, payload ?? {});
  }
  if (isBrowser) {
    try {
      window.dispatchEvent(
        new CustomEvent("draft-telemetry", {
          detail: {
            event,
            payload,
            timestamp: Date.now(),
          },
        }),
      );
    } catch {
      // ignore
    }
  }
}

export function subscribeToDraftEvents(handler: (event: DraftEvent) => void) {
  listeners.add(handler);
  return () => listeners.delete(handler);
}

export function loadDraft(key: string): DraftRecord | null {
  const storage = getStorage();
  if (!storage) return null;
  const raw = storage.getItem(storageKey(key));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DraftRecord;
    if (!parsed || typeof parsed !== "object") {
      storage.removeItem(storageKey(key));
      return null;
    }
    if (parsed.version !== DRAFT_VERSION) {
      storage.removeItem(storageKey(key));
      telemetry("draft_deleted", { reason: "version_mismatch", key });
      return null;
    }
    if (Date.now() - parsed.updatedAt > DRAFT_EXPIRY_MS) {
      storage.removeItem(storageKey(key));
      telemetry("draft_deleted", { reason: "expired", key });
      return null;
    }
    return parsed;
  } catch {
    storage.removeItem(storageKey(key));
    return null;
  }
}

export function saveDraft(
  key: string,
  type: DraftKind,
  content: string,
  metadata?: Record<string, unknown>,
) {
  const storage = getStorage();
  if (!storage || !key) return;

  const sanitizedContent = sanitizeHtml(content ?? "");

  if (!sanitizedContent.trim()) {
    storage.removeItem(storageKey(key));
    emit({ action: "delete", key });
    telemetry("draft_deleted", { key, reason: "empty_content" });
    return;
  }

  const record: DraftRecord = {
    key,
    type,
    content: sanitizedContent,
    version: DRAFT_VERSION,
    updatedAt: Date.now(),
    metadata,
  };

  storage.setItem(storageKey(key), JSON.stringify(record));
  emit({ action: "save", draft: record });
  telemetry("draft_saved", { key, type });
}

export function deleteDraft(key: string) {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(storageKey(key));
  emit({ action: "delete", key });
  telemetry("draft_deleted", { key });
}

export function clearAllDrafts() {
  const storage = getStorage();
  if (!storage) return;
  Object.keys(storage).forEach((k) => {
    if (k.startsWith(DRAFT_PREFIX)) {
      storage.removeItem(k);
    }
  });
  emit({ action: "clear" });
}

export function cleanupDrafts() {
  const storage = getStorage();
  if (!storage) return;
  const now = Date.now();
  Object.keys(storage).forEach((key) => {
    if (!key.startsWith(DRAFT_PREFIX)) return;
    const raw = storage.getItem(key);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as DraftRecord;
      if (!parsed) {
        storage.removeItem(key);
        return;
      }
      if (
        now - parsed.updatedAt > DRAFT_EXPIRY_MS ||
        parsed.version !== DRAFT_VERSION
      ) {
        storage.removeItem(key);
        telemetry("draft_deleted", { key, reason: "cleanup" });
      }
    } catch {
      storage.removeItem(key);
    }
  });
}

export function exportDrafts(): DraftRecord[] {
  const storage = getStorage();
  if (!storage) return [];
  const drafts: DraftRecord[] = [];
  Object.keys(storage).forEach((key) => {
    if (!key.startsWith(DRAFT_PREFIX)) return;
    const record = loadDraft(key.replace(DRAFT_PREFIX, ""));
    if (record) {
      drafts.push(record);
    }
  });
  telemetry("draft_exported", { count: drafts.length });
  return drafts;
}

export function importDrafts(
  records: DraftRecord[],
  { merge = true }: { merge?: boolean } = {},
) {
  const storage = getStorage();
  if (!storage || !Array.isArray(records)) return;

  if (!merge) {
    clearAllDrafts();
  }

  records.forEach((draft) => {
    if (!draft?.key || !draft.content) return;
    storage.setItem(
      storageKey(draft.key),
      JSON.stringify({ ...draft, version: DRAFT_VERSION }),
    );
  });

  emit({ action: "import", drafts: records });
  telemetry("draft_imported", { count: records.length });
}

cleanupDrafts();

export function recordDraftTelemetry(
  event: DraftTelemetryEvent,
  payload?: Record<string, unknown>,
) {
  telemetry(event, payload);
}
