/**
 * ============================================================================
 * Secure API Handler
 * ============================================================================
 *
 * A higher-order function that wraps API route handlers with:
 * - Automatic error catching and sanitization
 * - Zod validation enforcement
 * - Production-safe error responses (no stack traces or DB details)
 * - Structured logging for debugging
 *
 * Usage:
 * ```ts
 * import { withSecureApi, ValidationError } from '@/lib/api/secure-handler';
 * import { z } from 'zod';
 *
 * const CreatePostSchema = z.object({
 *   title: z.string().min(1),
 *   content: z.string().min(10),
 * });
 *
 * export const POST = withSecureApi(
 *   async (req, { body, user }) => {
 *     // body is already validated and typed
 *     const post = await createPost(body);
 *     return { success: true, data: post };
 *   },
 *   {
 *     bodySchema: CreatePostSchema,
 *     requireAuth: true,
 *   }
 * );
 * ```
 */

import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { ZodError, ZodSchema } from "zod";

// ============================================================================
// Types
// ============================================================================

const IS_PRODUCTION = process.env.NODE_ENV === "production";

/** Error codes for API responses */
export const ErrorCode = {
  // Validation errors (4xx)
  VALIDATION_ERROR: "ERR_VALIDATION",
  INVALID_JSON: "ERR_INVALID_JSON",
  MISSING_FIELDS: "ERR_MISSING_FIELDS",
  INVALID_FORMAT: "ERR_INVALID_FORMAT",

  // Authentication errors (401)
  UNAUTHORIZED: "ERR_UNAUTHORIZED",
  SESSION_EXPIRED: "ERR_SESSION_EXPIRED",

  // Authorization errors (403)
  FORBIDDEN: "ERR_FORBIDDEN",
  INSUFFICIENT_PERMISSIONS: "ERR_INSUFFICIENT_PERMISSIONS",

  // Resource errors (404)
  NOT_FOUND: "ERR_NOT_FOUND",
  RESOURCE_NOT_FOUND: "ERR_RESOURCE_NOT_FOUND",

  // Conflict errors (409)
  CONFLICT: "ERR_CONFLICT",
  DUPLICATE_RESOURCE: "ERR_DUPLICATE",

  // Rate limiting (429)
  RATE_LIMITED: "ERR_RATE_LIMITED",

  // Server errors (5xx)
  INTERNAL_ERROR: "ERR_INTERNAL",
  DATABASE_ERROR: "ERR_DATABASE",
  EXTERNAL_SERVICE_ERROR: "ERR_EXTERNAL_SERVICE",
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

/** Structured API error for client responses */
export interface SecureApiError {
  success: false;
  error: {
    code: ErrorCodeType;
    message: string;
    details?: Record<string, string[]>; // Only for validation errors
  };
}

/** Successful API response */
export interface SecureApiSuccess<T = unknown> {
  success: true;
  data: T;
}

export type SecureApiResponse<T = unknown> =
  | SecureApiSuccess<T>
  | SecureApiError;

/** Context passed to the handler */
export interface HandlerContext<TBody = unknown, TQuery = unknown> {
  user: User | null;
  body: TBody;
  query: TQuery;
  request: NextRequest;
}

/** Handler function type */
export type SecureHandler<
  TBody = unknown,
  TQuery = unknown,
  TResponse = unknown,
> = (
  request: NextRequest,
  context: HandlerContext<TBody, TQuery>,
) => Promise<SecureApiResponse<TResponse> | NextResponse>;

/** Options for the secure handler */
export interface SecureHandlerOptions {
  /** Zod schema for request body validation (POST/PUT/PATCH) */
  bodySchema?: ZodSchema;
  /** Zod schema for query parameters validation (GET) */
  querySchema?: ZodSchema;
  /** Require authentication (default: true) */
  requireAuth?: boolean;
  /** Custom rate limit key generator */
  rateLimitKey?: (req: NextRequest, user: User | null) => string;
  /** Maximum requests per window */
  rateLimit?: number;
  /** Rate limit window in milliseconds */
  rateLimitWindow?: number;
}

// ============================================================================
// Custom Error Classes
// ============================================================================

/**
 * Base class for API errors that should be returned to the client
 */
export class ApiError extends Error {
  public readonly code: ErrorCodeType;
  public readonly statusCode: number;
  public readonly details?: Record<string, string[]>;
  public readonly isOperational: boolean = true;

  constructor(
    code: ErrorCodeType,
    message: string,
    statusCode: number = 500,
    details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Validation error - thrown when request data fails schema validation
 */
export class ValidationError extends ApiError {
  constructor(message: string, details?: Record<string, string[]>) {
    super(ErrorCode.VALIDATION_ERROR, message, 400, details);
    this.name = "ValidationError";
    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  static fromZodError(error: ZodError): ValidationError {
    const details: Record<string, string[]> = {};

    for (const issue of error.issues) {
      const path = issue.path.join(".") || "_root";
      if (!details[path]) {
        details[path] = [];
      }
      details[path].push(issue.message);
    }

    return new ValidationError("Validation failed", details);
  }
}

/**
 * Authentication error - user is not authenticated
 */
export class AuthenticationError extends ApiError {
  constructor(message: string = "Authentication required") {
    super(ErrorCode.UNAUTHORIZED, message, 401);
    this.name = "AuthenticationError";
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Authorization error - user lacks permission
 */
export class AuthorizationError extends ApiError {
  constructor(message: string = "Access denied") {
    super(ErrorCode.FORBIDDEN, message, 403);
    this.name = "AuthorizationError";
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * Not found error - resource doesn't exist
 */
export class NotFoundError extends ApiError {
  constructor(resource: string = "Resource") {
    super(ErrorCode.NOT_FOUND, `${resource} not found`, 404);
    this.name = "NotFoundError";
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Conflict error - duplicate resource or state conflict
 */
export class ConflictError extends ApiError {
  constructor(message: string = "Resource already exists") {
    super(ErrorCode.CONFLICT, message, 409);
    this.name = "ConflictError";
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

// ============================================================================
// Error Sanitization
// ============================================================================

/** Patterns that indicate sensitive database information */
const SENSITIVE_PATTERNS = [
  /column "[\w_]+" does not exist/i,
  /relation "[\w_]+" does not exist/i,
  /foreign key constraint/i,
  /duplicate key value/i,
  /violates unique constraint/i,
  /violates foreign key constraint/i,
  /null value in column/i,
  /invalid input syntax/i,
  /permission denied for/i,
  /role "[\w_]+" does not exist/i,
  /database "[\w_]+" does not exist/i,
  /connection refused/i,
  /ECONNREFUSED/i,
  /timeout expired/i,
  /deadlock detected/i,
  /out of memory/i,
  /stack trace/i,
  /at [\w.]+\s*\(/i, // Stack trace pattern
  /node_modules/i,
  /\.ts:\d+:\d+/i, // TypeScript file references
  /\.js:\d+:\d+/i, // JavaScript file references
];

/**
 * Check if an error message contains sensitive information
 */
function containsSensitiveInfo(message: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Sanitize error for client response
 * In production, removes all sensitive details
 */
function sanitizeError(error: unknown): SecureApiError {
  // Handle our custom API errors
  if (error instanceof ApiError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details && { details: error.details }),
      },
    };
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const validationError = ValidationError.fromZodError(error);
    return {
      success: false,
      error: {
        code: validationError.code,
        message: validationError.message,
        details: validationError.details,
      },
    };
  }

  // Handle generic errors
  if (error instanceof Error) {
    const message = error.message;

    // In production, sanitize sensitive information
    if (IS_PRODUCTION || containsSensitiveInfo(message)) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "An unexpected error occurred. Please try again later.",
        },
      };
    }

    // In development, include more details
    return {
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: message,
      },
    };
  }

  // Unknown error type
  return {
    success: false,
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: "An unexpected error occurred. Please try again later.",
    },
  };
}

/**
 * Get HTTP status code from error
 */
function getStatusCode(error: unknown): number {
  if (error instanceof ApiError) {
    return error.statusCode;
  }
  if (error instanceof ZodError) {
    return 400;
  }
  return 500;
}

// ============================================================================
// Internal Logging
// ============================================================================

interface ErrorLogContext {
  requestId: string;
  method: string;
  path: string;
  userId?: string;
  timestamp: string;
}

/**
 * Generate a unique request ID for tracking
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Log error internally with full details (never sent to client)
 */
function logErrorInternal(
  error: unknown,
  context: ErrorLogContext,
  body?: unknown,
): void {
  const errorDetails = {
    requestId: context.requestId,
    timestamp: context.timestamp,
    request: {
      method: context.method,
      path: context.path,
      userId: context.userId,
    },
    error: {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...(error instanceof ApiError && {
        code: error.code,
        statusCode: error.statusCode,
        isOperational: error.isOperational,
      }),
      ...(error instanceof ZodError && {
        issues: error.issues,
      }),
    },
    // Only log body in development to avoid PII in logs
    ...(!IS_PRODUCTION && body ? { requestBody: body } : {}),
  };

  // Use console.error for errors (allowed by lint rules)
  console.error("[API Error]", JSON.stringify(errorDetails, null, 2));
}

// ============================================================================
// Main Handler Wrapper
// ============================================================================

/**
 * Wrap an API route handler with secure error handling and validation
 */
export function withSecureApi<
  TBody = unknown,
  TQuery = unknown,
  TResponse = unknown,
>(
  handler: SecureHandler<TBody, TQuery, TResponse>,
  options: SecureHandlerOptions = {},
): (request: NextRequest) => Promise<NextResponse> {
  const { bodySchema, querySchema, requireAuth = true } = options;

  return async (request: NextRequest): Promise<NextResponse> => {
    const requestId = generateRequestId();
    const timestamp = new Date().toISOString();
    const url = new URL(request.url);

    let user: User | null = null;
    let parsedBody: TBody = undefined as TBody;
    let parsedQuery: TQuery = undefined as TQuery;

    try {
      // -----------------------------------------------------------------------
      // 1. Authentication
      // -----------------------------------------------------------------------
      const supabase = await createClient();
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) {
        console.error("[Auth Error]", authError.message);
      }

      user = authData?.user ?? null;

      if (requireAuth && !user) {
        throw new AuthenticationError();
      }

      // -----------------------------------------------------------------------
      // 2. Body Validation (for POST/PUT/PATCH)
      // -----------------------------------------------------------------------
      if (bodySchema && ["POST", "PUT", "PATCH"].includes(request.method)) {
        let rawBody: unknown;

        try {
          rawBody = await request.json();
        } catch {
          throw new ApiError(
            ErrorCode.INVALID_JSON,
            "Invalid JSON in request body",
            400,
          );
        }

        try {
          parsedBody = bodySchema.parse(rawBody);
        } catch (error) {
          if (error instanceof ZodError) {
            throw ValidationError.fromZodError(error);
          }
          throw error;
        }
      }

      // -----------------------------------------------------------------------
      // 3. Query Validation (for GET requests)
      // -----------------------------------------------------------------------
      if (querySchema) {
        const queryParams = Object.fromEntries(url.searchParams.entries());

        try {
          parsedQuery = querySchema.parse(queryParams);
        } catch (error) {
          if (error instanceof ZodError) {
            throw ValidationError.fromZodError(error);
          }
          throw error;
        }
      }

      // -----------------------------------------------------------------------
      // 4. Execute Handler
      // -----------------------------------------------------------------------
      const result = await handler(request, {
        user,
        body: parsedBody,
        query: parsedQuery,
        request,
      });

      // If handler returns NextResponse directly, pass it through
      if (result instanceof NextResponse) {
        return result;
      }

      // Return JSON response
      return NextResponse.json(result, {
        status: result.success ? 200 : 400,
        headers: {
          "X-Request-Id": requestId,
        },
      });
    } catch (error) {
      // Log full error internally
      logErrorInternal(
        error,
        {
          requestId,
          method: request.method,
          path: url.pathname,
          userId: user?.id,
          timestamp,
        },
        parsedBody,
      );

      // Return sanitized error to client
      const sanitizedError = sanitizeError(error);
      const statusCode = getStatusCode(error);

      return NextResponse.json(sanitizedError, {
        status: statusCode,
        headers: {
          "X-Request-Id": requestId,
        },
      });
    }
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a success response
 */
export function success<T>(data: T): SecureApiSuccess<T> {
  return { success: true, data };
}

/**
 * Throw a validation error with custom message
 */
export function throwValidationError(message: string, field?: string): never {
  const details = field ? { [field]: [message] } : undefined;
  throw new ValidationError(message, details);
}

/**
 * Assert a condition, throwing NotFoundError if false
 */
export function assertFound<T>(
  value: T | null | undefined,
  resource: string = "Resource",
): asserts value is T {
  if (value === null || value === undefined) {
    throw new NotFoundError(resource);
  }
}

/**
 * Assert user is authenticated
 */
export function assertAuthenticated(user: User | null): asserts user is User {
  if (!user) {
    throw new AuthenticationError();
  }
}
