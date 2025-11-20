import { NextResponse, type NextRequest } from "next/server";
import type { ZodSchema } from "zod";
import { ZodError } from "zod";
import { errorResponse } from "@/lib/utils/api-response";

type ValidationErrorResponse = {
  success: false;
  response: NextResponse;
};

type ValidationSuccess<T> = {
  success: true;
  data: T;
};

type ValidationResult<T> = ValidationErrorResponse | ValidationSuccess<T>;

function formatZodError(error: ZodError) {
  const flattened = error.flatten();
  return {
    fieldErrors: flattened.fieldErrors,
    formErrors: flattened.formErrors,
  };
}

function logValidationFailure(
  type: "body" | "query",
  request: NextRequest,
  error: ZodError,
) {
  console.warn("[Validation] Request failed", {
    type,
    path: request.nextUrl.pathname,
    method: request.method,
    issues: error.issues,
  });
}

export async function validateBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>,
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json();
    const data = await schema.parseAsync(body);
    return { success: true, data };
  } catch (error) {
    if (error instanceof SyntaxError) {
      const response = errorResponse(
        "VALIDATION_ERROR",
        "Invalid JSON payload. البيانات غير صالحة، يرجى التحقق من صيغة JSON.",
        422,
      );
      return { success: false, response };
    }

    if (error instanceof Error && "issues" in error) {
      const zodError = error as ZodError;
      logValidationFailure("body", request, zodError);
      const response = errorResponse(
        "VALIDATION_ERROR",
        "تعذر قبول البيانات المدخلة.",
        422,
        formatZodError(zodError),
      );
      return { success: false, response };
    }

    const response = errorResponse(
      "VALIDATION_ERROR",
      "Unknown validation error",
      422,
    );
    return { success: false, response };
  }
}

export function validateQuery<T>(
  request: NextRequest,
  schema: ZodSchema<T>,
): ValidationResult<T> {
  const queryObject = Object.fromEntries(
    request.nextUrl.searchParams.entries(),
  );

  try {
    const data = schema.parse(queryObject);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      logValidationFailure("query", request, error);
      const response = errorResponse(
        "VALIDATION_ERROR",
        "تعذر قبول معلمات الاستعلام.",
        422,
        formatZodError(error),
      );
      return { success: false, response };
    }

    const response = errorResponse(
      "VALIDATION_ERROR",
      "Unknown validation error",
      422,
    );
    return { success: false, response };
  }
}
