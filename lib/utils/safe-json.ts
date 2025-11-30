/**
 * ============================================================================
 * Safe JSON Utilities
 * ============================================================================
 *
 * Provides safe JSON parsing and stringification functions that never throw.
 * Use these instead of raw JSON.parse() to prevent server crashes.
 *
 * @security CRITICAL - Unhandled JSON.parse errors can crash the server
 */

import type { ZodSchema } from "zod";

/**
 * Safely parses JSON string with error handling.
 * Returns null if parsing fails instead of throwing.
 *
 * @example
 * ```ts
 * const data = safeJsonParse<User>(jsonString);
 * if (data === null) {
 *   // Handle invalid JSON
 * }
 * ```
 */
export function safeJsonParse<T>(
  json: string | null | undefined,
  fallback?: T,
): T | null {
  if (json === null || json === undefined || json === "") {
    return fallback ?? null;
  }

  try {
    return JSON.parse(json) as T;
  } catch {
    // Silent fail - return fallback
    return fallback ?? null;
  }
}

/**
 * Safely parses JSON with logging for debugging.
 * Use this when you need to track parsing failures.
 */
export function safeJsonParseWithLog<T>(
  json: string | null | undefined,
  context: string,
  fallback?: T,
): T | null {
  if (json === null || json === undefined || json === "") {
    return fallback ?? null;
  }

  try {
    return JSON.parse(json) as T;
  } catch (error) {
    console.warn(`[safeJsonParse] Failed to parse JSON in ${context}:`, {
      preview: json.substring(0, 100),
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return fallback ?? null;
  }
}

/**
 * Safely parses JSON with validation using Zod schema.
 * Returns typed result or null if invalid.
 *
 * @example
 * ```ts
 * const user = safeJsonParseWithSchema(jsonString, userSchema);
 * ```
 */
export function safeJsonParseWithSchema<T>(
  json: string | null | undefined,
  schema: ZodSchema<T>,
): T | null {
  const parsed = safeJsonParse<unknown>(json);

  if (parsed === null) {
    return null;
  }

  const result = schema.safeParse(parsed);

  if (!result.success) {
    return null;
  }

  return result.data;
}

/**
 * Safely stringifies value to JSON.
 * Returns null if stringification fails (e.g., circular references).
 */
export function safeJsonStringify(
  value: unknown,
  space?: number,
): string | null {
  try {
    return JSON.stringify(value, null, space);
  } catch {
    return null;
  }
}

/**
 * Parses JSON from Request body safely.
 * Returns error message if parsing fails.
 *
 * @example
 * ```ts
 * const { data, error } = await parseRequestJson<MyType>(request);
 * if (error) {
 *   return NextResponse.json({ error }, { status: 400 });
 * }
 * ```
 */
export async function parseRequestJson<T>(
  request: Request,
): Promise<{ data: T; error: null } | { data: null; error: string }> {
  try {
    const text = await request.text();

    if (!text || text.trim() === "") {
      return { data: null, error: "Request body is empty" };
    }

    const data = JSON.parse(text) as T;
    return { data, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON";
    return { data: null, error: `Failed to parse JSON: ${message}` };
  }
}

/**
 * Attempts to parse a string that might be JSON or might be plain text.
 * Returns the parsed object if valid JSON, otherwise returns null.
 */
export function tryParseJson<T>(value: string): T | null {
  // Quick check - if it doesn't look like JSON, don't try
  const trimmed = value.trim();
  if (
    !trimmed.startsWith("{") &&
    !trimmed.startsWith("[") &&
    !trimmed.startsWith('"')
  ) {
    return null;
  }

  return safeJsonParse<T>(value);
}

/**
 * Parses JSON from localStorage safely.
 * Returns fallback if key doesn't exist or JSON is invalid.
 */
export function getLocalStorageJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  const stored = localStorage.getItem(key);
  if (!stored) {
    return fallback;
  }

  const parsed = safeJsonParse<T>(stored);
  return parsed ?? fallback;
}

/**
 * Saves value to localStorage as JSON safely.
 * Returns true if successful, false if stringification failed.
 */
export function setLocalStorageJson(key: string, value: unknown): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const stringified = safeJsonStringify(value);
  if (stringified === null) {
    return false;
  }

  try {
    localStorage.setItem(key, stringified);
    return true;
  } catch {
    // localStorage might be full or disabled
    return false;
  }
}
