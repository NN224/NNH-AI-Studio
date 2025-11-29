// Centralized Error Handling for Dashboard
import type { DashboardError, ServiceResponse } from '../types'

export class DashboardServiceError extends Error implements DashboardError {
  public code?: string
  public context?: Record<string, unknown>

  constructor(message: string, code?: string, context?: Record<string, unknown>) {
    super(message)
    this.name = 'DashboardServiceError'
    this.code = code
    this.context = context
  }
}

export function createServiceResponse<T>(
  data?: T,
  error?: string,
  code?: string,
): ServiceResponse<T> {
  return {
    success: !error,
    data,
    error,
    code,
  }
}

export function handleServiceError(error: unknown, context?: string): never {
  if (error instanceof DashboardServiceError) {
    throw error
  }

  if (error instanceof Error) {
    throw new DashboardServiceError(
      `${context ? `[${context}] ` : ''}${error.message}`,
      'UNKNOWN_ERROR',
      { originalError: error.name },
    )
  }

  throw new DashboardServiceError(
    `${context ? `[${context}] ` : ''}Unknown error occurred`,
    'UNKNOWN_ERROR',
    { originalError: String(error) },
  )
}

export function isSupabaseError(error: unknown): error is { code: string; message: string } {
  return typeof error === 'object' && error !== null && 'code' in error && 'message' in error
}

export function handleSupabaseError(error: unknown, operation: string): never {
  if (isSupabaseError(error)) {
    throw new DashboardServiceError(`Database operation failed: ${error.message}`, error.code, {
      operation,
    })
  }

  handleServiceError(error, operation)
}
