/**
 * ============================================================================
 * Input Validation Helpers
 * ============================================================================
 *
 * Lightweight validation utilities for API routes.
 * Use withSecureApi for full validation + auth, or these helpers for simpler cases.
 */

import { NextResponse } from "next/server";
import { ZodError, ZodSchema } from "zod";

/**
 * Validation error response type
 */
interface ValidationErrorResponse {
  error: string;
  details: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * Validates request body against a Zod schema.
 * Returns either validated data or an error response.
 *
 * @example
 * ```ts
 * const { data, error } = await validateBody(request, aiChatSchema);
 * if (error) return error;
 * // data is now typed and validated
 * ```
 */
export async function validateBody<T>(
  request: Request,
  schema: ZodSchema<T>,
): Promise<
  | { data: T; error: null }
  | { data: null; error: NextResponse<ValidationErrorResponse> }
> {
  try {
    // Check content type
    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return {
        data: null,
        error: NextResponse.json(
          {
            error: "Content-Type must be application/json",
            details: [],
          },
          { status: 415 },
        ),
      };
    }

    // Parse JSON
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return {
        data: null,
        error: NextResponse.json(
          {
            error: "Invalid JSON body",
            details: [],
          },
          { status: 400 },
        ),
      };
    }

    // Validate with Zod
    const data = schema.parse(body);
    return { data, error: null };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        data: null,
        error: NextResponse.json(
          {
            error: "Validation failed",
            details: error.errors.map((e) => ({
              field: e.path.join(".") || "_root",
              message: e.message,
            })),
          },
          { status: 400 },
        ),
      };
    }

    return {
      data: null,
      error: NextResponse.json(
        {
          error: "Invalid request body",
          details: [],
        },
        { status: 400 },
      ),
    };
  }
}

/**
 * Validates query parameters against a Zod schema.
 *
 * @example
 * ```ts
 * const { data, error } = validateQuery(request, paginationSchema);
 * if (error) return error;
 * ```
 */
export function validateQuery<T>(
  request: Request,
  schema: ZodSchema<T>,
):
  | { data: T; error: null }
  | { data: null; error: NextResponse<ValidationErrorResponse> } {
  try {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());
    const data = schema.parse(params);
    return { data, error: null };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        data: null,
        error: NextResponse.json(
          {
            error: "Invalid query parameters",
            details: error.errors.map((e) => ({
              field: e.path.join(".") || "_root",
              message: e.message,
            })),
          },
          { status: 400 },
        ),
      };
    }

    return {
      data: null,
      error: NextResponse.json(
        {
          error: "Invalid query parameters",
          details: [],
        },
        { status: 400 },
      ),
    };
  }
}

/**
 * Validates path parameters against a Zod schema.
 *
 * @example
 * ```ts
 * const { data, error } = validateParams({ id: params.id }, uuidParamSchema);
 * if (error) return error;
 * ```
 */
export function validateParams<T>(
  params: Record<string, string | undefined>,
  schema: ZodSchema<T>,
):
  | { data: T; error: null }
  | { data: null; error: NextResponse<ValidationErrorResponse> } {
  try {
    const data = schema.parse(params);
    return { data, error: null };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        data: null,
        error: NextResponse.json(
          {
            error: "Invalid path parameters",
            details: error.errors.map((e) => ({
              field: e.path.join(".") || "_root",
              message: e.message,
            })),
          },
          { status: 400 },
        ),
      };
    }

    return {
      data: null,
      error: NextResponse.json(
        {
          error: "Invalid path parameters",
          details: [],
        },
        { status: 400 },
      ),
    };
  }
}
