import { logger } from "@/lib/utils/logger";

/**
 * Sanitize HTML input to prevent XSS attacks
 * Allows basic formatting tags only
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return "";

  // Remove script tags and event handlers first
  let clean = dirty
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/on\w+\s*=\s*[^\s>]+/gi, "") // Handle unquoted event handlers
    .replace(/javascript:/gi, "")
    .replace(/href\s*=\s*["'][^"']*alert[^"']*["']/gi, 'href=""') // Remove alert in href
    .replace(/href\s*=\s*["'][^"']*eval[^"']*["']/gi, 'href=""'); // Remove eval in href

  // Only allow specific tags
  const allowedTags = ["b", "i", "em", "strong", "a", "p", "br"];
  const tagRegex = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;

  clean = clean.replace(tagRegex, (match, tag) => {
    return allowedTags.includes(tag.toLowerCase()) ? match : "";
  });

  return clean.trim();
}

/**
 * Sanitize text input (strip all HTML)
 */
export function sanitizeText(input: string): string {
  if (!input) return "";

  return input
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .trim();
}

/**
 * Sanitize URL to prevent javascript: and data: URIs
 */
export function sanitizeUrl(url: string): string {
  const sanitized = url.trim();

  // Block dangerous protocols
  const dangerousProtocols = ["javascript:", "data:", "vbscript:", "file:"];
  const lowerUrl = sanitized.toLowerCase();

  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return "";
    }
  }

  // Only allow http, https, mailto, tel
  if (
    !lowerUrl.startsWith("http://") &&
    !lowerUrl.startsWith("https://") &&
    !lowerUrl.startsWith("mailto:") &&
    !lowerUrl.startsWith("tel:") &&
    !lowerUrl.startsWith("/")
  ) {
    return "";
  }

  return sanitized;
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  const sanitized = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(sanitized)) {
    return "";
  }

  return sanitized;
}

/**
 * Sanitize phone number
 */
export function sanitizePhone(phone: string): string {
  // Check if starts with +
  const hasPlus = phone.trim().startsWith("+");
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");
  // Add back the + if it was there
  return hasPlus ? "+" + digits : digits;
}

/**
 * Sanitize SQL input (basic - use parameterized queries instead)
 */
export function sanitizeSql(input: string): string {
  // Remove SQL injection patterns
  return input
    .replace(/['";]/g, "")
    .replace(/--/g, "")
    .replace(/\/\*/g, "")
    .replace(/\*\//g, "")
    .replace(/xp_/gi, "")
    .replace(/sp_/gi, "");
}

/**
 * Sanitize file name
 */
export function sanitizeFileName(fileName: string): string {
  // Remove path traversal attempts
  let sanitized = fileName.replace(/\.\./g, "");

  // Remove special characters
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, "_");

  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.split(".").pop();
    const name = sanitized.substring(0, 250 - (ext?.length || 0));
    sanitized = ext ? `${name}.${ext}` : name;
  }

  return sanitized;
}

/**
 * Sanitize JSON input
 */
export function sanitizeJson<T = any>(input: string): T | null {
  try {
    const parsed = JSON.parse(input);

    // Recursively sanitize string values
    const sanitizeObject = (obj: any): any => {
      if (typeof obj === "string") {
        return sanitizeText(obj);
      }

      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }

      if (obj !== null && typeof obj === "object") {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          sanitized[sanitizeText(key)] = sanitizeObject(value);
        }
        return sanitized;
      }

      return obj;
    };

    return sanitizeObject(parsed);
  } catch (error) {
    logger.error(
      "JSON sanitization error",
      error instanceof Error ? error : new Error(String(error)),
    );
    return null;
  }
}

/**
 * Validate and sanitize user input based on type
 */
export function sanitizeInput(
  input: string,
  type: "html" | "text" | "url" | "email" | "phone" | "sql" | "filename",
): string {
  switch (type) {
    case "html":
      return sanitizeHtml(input);
    case "text":
      return sanitizeText(input);
    case "url":
      return sanitizeUrl(input);
    case "email":
      return sanitizeEmail(input);
    case "phone":
      return sanitizePhone(input);
    case "sql":
      return sanitizeSql(input);
    case "filename":
      return sanitizeFileName(input);
    default:
      return sanitizeText(input);
  }
}

/**
 * Validate input length
 */
export function validateLength(
  input: string,
  min: number,
  max: number,
): { valid: boolean; message?: string } {
  if (input.length < min) {
    return {
      valid: false,
      message: `Input must be at least ${min} characters`,
    };
  }

  if (input.length > max) {
    return {
      valid: false,
      message: `Input must be at most ${max} characters`,
    };
  }

  return { valid: true };
}

/**
 * Validate input against regex pattern
 */
export function validatePattern(
  input: string,
  pattern: RegExp,
  message?: string,
): { valid: boolean; message?: string } {
  if (!pattern.test(input)) {
    return {
      valid: false,
      message: message || "Input does not match required pattern",
    };
  }

  return { valid: true };
}

/**
 * Common validation patterns
 */
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s-()]+$/,
  URL: /^https?:\/\/.+/,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  ALPHA: /^[a-zA-Z]+$/,
  NUMERIC: /^[0-9]+$/,
  USERNAME: /^[a-zA-Z0-9_-]{3,20}$/,
  PASSWORD:
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
} as const;

/**
 * Sanitize object with multiple fields
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  schema: Record<
    keyof T,
    "html" | "text" | "url" | "email" | "phone" | "sql" | "filename"
  >,
): T {
  const sanitized = { ...obj } as Record<string, any>;

  for (const [key, type] of Object.entries(schema)) {
    if (typeof sanitized[key] === "string") {
      sanitized[key] = sanitizeInput(sanitized[key], type as any);
    }
  }

  return sanitized as T;
}
