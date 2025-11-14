import { NextResponse, type NextRequest } from 'next/server'
import type { ZodSchema, ZodError } from 'zod'

type ValidationErrorResponse = {
  success: false
  response: NextResponse
}

type ValidationSuccess<T> = {
  success: true
  data: T
}

type ValidationResult<T> = ValidationErrorResponse | ValidationSuccess<T>

function formatZodError(error: ZodError) {
  const flattened = error.flatten()
  return {
    fieldErrors: flattened.fieldErrors,
    formErrors: flattened.formErrors,
  }
}

function logValidationFailure(type: 'body' | 'query', request: NextRequest, error: ZodError) {
  console.warn('[Validation] Request failed', {
    type,
    path: request.nextUrl.pathname,
    method: request.method,
    issues: error.issues,
  })
}

export async function validateBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json()
    const data = await schema.parseAsync(body)
    return { success: true, data }
  } catch (error) {
    if (error instanceof SyntaxError) {
      const response = NextResponse.json(
        {
          error: 'Invalid JSON payload',
          message: 'البيانات غير صالحة، يرجى التحقق من صيغة JSON.',
        },
        { status: 422 }
      )
      return { success: false, response }
    }

    if (error instanceof Error && 'issues' in error) {
      const zodError = error as ZodError
      logValidationFailure('body', request, zodError)
      const response = NextResponse.json(
        {
          error: 'Validation failed',
          message: 'تعذر قبول البيانات المدخلة.',
          details: formatZodError(zodError),
        },
        { status: 422 }
      )
      return { success: false, response }
    }

    const response = NextResponse.json(
      { error: 'Unknown validation error' },
      { status: 422 }
    )
    return { success: false, response }
  }
}

export function validateQuery<T>(request: NextRequest, schema: ZodSchema<T>): ValidationResult<T> {
  const queryObject = Object.fromEntries(request.nextUrl.searchParams.entries())

  try {
    const data = schema.parse(queryObject)
    return { success: true, data }
  } catch (error) {
    if (error instanceof ZodError) {
      logValidationFailure('query', request, error)
      const response = NextResponse.json(
        {
          error: 'Invalid query parameters',
          message: 'تعذر قبول معلمات الاستعلام.',
          details: formatZodError(error),
        },
        { status: 422 }
      )
      return { success: false, response }
    }

    const response = NextResponse.json(
      { error: 'Unknown validation error' },
      { status: 422 }
    )
    return { success: false, response }
  }
}

