/**
 * Unified API Response Utilities
 * Provides consistent error handling across all API routes
 */

import { NextResponse } from 'next/server';

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
    userMessage: string;
  };
}

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

/**
 * Create a success response
 */
export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Create an error response
 */
export function errorResponse(
  code: string,
  message: string,
  status = 400,
  details?: unknown
) {
  return NextResponse.json({
    success: false,
    error: {
      code,
      message,
      details,
      userMessage: getUserFriendlyMessage(code),
    },
  } as ApiError, { status });
}

/**
 * Get user-friendly error message based on error code
 */
function getUserFriendlyMessage(code: string): string {
  const messages: Record<string, string> = {
    VALIDATION_ERROR: 'Please check your input data',
    UNAUTHORIZED: 'You are not authorized to access this resource',
    FORBIDDEN: 'Access denied',
    NOT_FOUND: 'Resource not found',
    RATE_LIMIT_EXCEEDED: 'Too many requests, please try again later',
    INTERNAL_ERROR: 'An internal error occurred, please try again later',
    TOKEN_EXPIRED: 'Your session has expired, please sign in again',
    TOKEN_REFRESH_FAILED: 'Failed to refresh session. Please reconnect your account.',
    TOKEN_REFRESH_ERROR: 'Authentication error. Please reconnect your account.',
    DUPLICATE_LOCATION: 'This location already exists',
    INVALID_LOCATION: 'Invalid location data',
    ACCOUNT_NOT_FOUND: 'Account not found',
    LOCATION_NOT_FOUND: 'Location not found',
    INVALID_GRANT: 'Authentication expired. Please reconnect your Google account.',
    INSUFFICIENT_SCOPES: 'Insufficient permissions. Please reconnect with required permissions.',
    DATABASE_SCHEMA_ERROR: 'Database configuration error. Please contact support.',
    DUPLICATE_ERROR: 'This record already exists',
    REFERENCE_ERROR: 'Invalid reference',
    AUTH_ERROR: 'Authentication failed',
    MISSING_FIELDS: 'Required fields are missing',
    INVALID_DATA: 'Invalid data format',
    SYNC_FAILED: 'Synchronization failed. Please try again.',
    NO_REFRESH_TOKEN: 'No refresh token available. Please reconnect your account.',
    ACCOUNT_INACTIVE: 'Account is inactive',
    UNSUPPORTED_POST_TYPE: 'This post type is not supported',
  };

  return messages[code] || message;
}

/**
 * Get error code from internal error
 */
export function getErrorCode(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'INTERNAL_ERROR';
  }

  const message = error.message.toLowerCase();

  // Database errors
  if (message.includes('column') && message.includes('does not exist')) {
    return 'DATABASE_SCHEMA_ERROR';
  }
  if (message.includes('duplicate key')) {
    return 'DUPLICATE_ERROR';
  }
  if (message.includes('foreign key')) {
    return 'REFERENCE_ERROR';
  }

  // Authentication errors
  if (message.includes('invalid_grant') || message.includes('invalid grant')) {
    return 'INVALID_GRANT';
  }
  if (message.includes('refresh_token') && message.includes('not available')) {
    return 'NO_REFRESH_TOKEN';
  }
  if (message.includes('authentication') || message.includes('unauthorized')) {
    return 'AUTH_ERROR';
  }

  // Token errors
  if (message.includes('token')) {
    if (message.includes('expired')) {
      return 'TOKEN_EXPIRED';
    }
    if (message.includes('refresh')) {
      return 'TOKEN_REFRESH_ERROR';
    }
  }

  // Google API errors
  if (message.includes('insufficient') && message.includes('scope')) {
    return 'INSUFFICIENT_SCOPES';
  }

  return 'INTERNAL_ERROR';
}

