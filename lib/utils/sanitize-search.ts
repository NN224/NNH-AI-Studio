/**
 * SQL Injection Prevention for ILIKE/LIKE Queries
 *
 * @security CRITICAL - Prevents SQL operator injection in search queries
 * @see https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
 */

import { logger } from "@/lib/utils/logger";

interface SanitizeOptions {
  maxLength?: number;
  allowWildcards?: boolean;
  logSuspicious?: boolean;
}

/**
 * Validates that a search query doesn't contain obvious SQL injection attempts
 */
export function validateSearchQuery(query: string): {
  valid: boolean;
  reason?: string;
} {
  if (!query) return { valid: true };

  const upperQuery = query.toUpperCase();

  // Check for SQL keywords
  const sqlKeywords = [
    "SELECT",
    "INSERT",
    "UPDATE",
    "DELETE",
    "DROP",
    "UNION",
    "EXEC",
    "EXECUTE",
    "TRUNCATE",
    "ALTER",
    "CREATE",
    "GRANT",
    "REVOKE",
  ];

  for (const keyword of sqlKeywords) {
    // Check for keyword as whole word (with word boundaries)
    const regex = new RegExp(`\\b${keyword}\\b`);
    if (regex.test(upperQuery)) {
      return {
        valid: false,
        reason: `Query contains potentially dangerous keyword: ${keyword}`,
      };
    }
  }

  // Check for SQL comment markers
  if (query.includes("/*") || query.includes("*/") || query.includes("--")) {
    return {
      valid: false,
      reason: "Query contains SQL comment markers",
    };
  }

  // Check for hex encoding attempts
  if (/0x[0-9a-fA-F]+/.test(query)) {
    return {
      valid: false,
      reason: "Query contains hex encoding",
    };
  }

  return { valid: true };
}

/**
 * Sanitizes user input for SQL ILIKE/LIKE queries to prevent operator injection.
 *
 * @param input - The user's search query
 * @param options - Sanitization options
 * @returns Sanitized search string safe for ILIKE queries
 *
 * @security CRITICAL - This prevents SQL injection in ILIKE queries
 */
export function sanitizeSearchQuery(
  input: string | null | undefined,
  options: SanitizeOptions = {},
): string {
  const {
    maxLength = 100,
    allowWildcards = false,
    logSuspicious = true,
  } = options;

  // Handle null/undefined
  if (!input) return "";

  // Normalize unicode
  let s = String(input).normalize("NFKC");

  // Remove null bytes (PostgreSQL safety)
  s = s.replace(/\0/g, "");

  // Remove control chars (C0 control codes and DEL)
  // eslint-disable-next-line no-control-regex
  s = s.replace(/[\x00-\x1F\x7F]/g, "");

  // Remove SQL comment markers
  s = s.replace(/--/g, "");
  s = s.replace(/\/\*/g, "");
  s = s.replace(/\*\//g, "");

  // Remove characters that can break PostgREST filter syntax
  s = s.replace(/[',";()]/g, "");

  // Handle wildcards
  if (allowWildcards) {
    // Escape backslashes first
    s = s.replace(/\\/g, "\\\\");

    // Check for wildcard-only queries (suspicious)
    if (/^[%_]+$/.test(s)) {
      if (logSuspicious) {
        logger.warn("Suspicious wildcard-only query blocked");
      }
      return "";
    }
  } else {
    // Escape SQL LIKE wildcards and backslash
    // Order matters: backslash first, then others
    s = s.replace(/\\/g, "\\\\");
    s = s.replace(/%/g, "\\%");
    s = s.replace(/_/g, "\\_");
  }

  // Trim whitespace
  s = s.trim();

  // Enforce max length (prevent DoS)
  if (s.length > maxLength) {
    s = s.slice(0, maxLength);
  }

  return s;
}

/**
 * Builds a safe ILIKE pattern from sanitized input
 */
export function buildIlikePattern(sanitized: string): string {
  if (!sanitized) return "";
  return `%${sanitized}%`;
}

/**
 * Combined validation and sanitization for search queries.
 * Use this for maximum security.
 *
 * @returns Object with sanitized query or error
 */
export function processSearchQuery(
  input: string | null | undefined,
  options: SanitizeOptions = {},
): { success: true; query: string } | { success: false; error: string } {
  if (!input) {
    return { success: true, query: "" };
  }

  // Validate first
  const validation = validateSearchQuery(input);
  if (!validation.valid) {
    logger.warn("Invalid query rejected", { reason: validation.reason });
    return {
      success: false,
      error: validation.reason || "Invalid search query",
    };
  }

  // Then sanitize
  const sanitized = sanitizeSearchQuery(input, options);

  return { success: true, query: sanitized };
}
