/**
 * Type guard utilities using Zod
 *
 * This module provides reusable type guards using Zod schemas
 * for validating data across the application, especially for
 * preventing unsafe type casting.
 */

import { z } from "zod";
import { logger } from "./logger";

/**
 * Options for validateWithSchema
 */
export interface ValidationOptions<T> {
  /** Context information for error logging */
  context?: Record<string, unknown>;
  /** Default value to return if validation fails */
  defaultValue?: T;
  /** Whether to log validation failures */
  logFailures?: boolean;
}

/**
 * Safely validate data with a Zod schema
 *
 * @param schema Zod schema to validate against
 * @param data Data to validate
 * @param options Validation options
 * @returns Validated data or null/default if invalid
 */
export function validateWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  options: ValidationOptions<T> = {},
): T | null {
  const { context = {}, defaultValue = null, logFailures = true } = options;

  const result = schema.safeParse(data);

  if (!result.success) {
    if (logFailures) {
      logger.warn("Data validation failed", {
        error: result.error,
        context,
      });
    }
    return defaultValue;
  }

  return result.data;
}

/**
 * Common schemas for reuse
 */
export const CommonSchemas = {
  // Account schemas
  Account: z.object({
    id: z.string().uuid(),
    account_id: z.string(),
    account_name: z.string().optional(),
    email: z.string().email().optional(),
  }),

  // Location schemas
  Location: z.object({
    id: z.string().uuid(),
    location_id: z.string(),
    name: z.string().optional(),
    address: z.record(z.string()).optional(),
    phone_number: z.string().optional(),
  }),

  // API Response schemas
  ApiError: z.object({
    error: z.object({
      message: z.string(),
      code: z.number().optional(),
      status: z.string().optional(),
    }),
  }),

  // Common data types
  UUID: z.string().uuid(),
  Email: z.string().email(),
  ISO8601Date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/),

  // User schema
  User: z.object({
    id: z.string(),
    email: z.string().email().optional(),
    user_metadata: z.record(z.unknown()).optional(),
  }),
};

/**
 * Type guard for checking if a value is an Error object
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Validate object with Zod and log details about what failed
 */
export function validateDataStructure<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context: string,
): { success: boolean; data?: T; errors?: string[] } {
  const result = schema.safeParse(data);

  if (!result.success) {
    const formattedErrors = result.error.errors.map(
      (err) => `${err.path.join(".")}: ${err.message}`,
    );

    logger.warn(`Invalid ${context} structure`, {
      errors: formattedErrors,
    });

    return { success: false, errors: formattedErrors };
  }

  return { success: true, data: result.data };
}
