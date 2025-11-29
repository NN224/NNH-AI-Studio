// Advanced Type Guards for Dashboard Services
import type {
  DashboardStats,
  LocationWithGMBAccount,
  TokenRefreshResult,
} from "../types";

/**
 * Type guard for DashboardStats
 */
export function isDashboardStats(data: unknown): data is DashboardStats {
  if (!data || typeof data !== "object") return false;

  const stats = data as Record<string, unknown>;

  return (
    typeof stats.response_rate_percent === "number" &&
    typeof stats.reviews_count === "number" &&
    typeof stats.average_rating === "number" &&
    typeof stats.replied_reviews_count === "number" &&
    typeof stats.locations_count === "number" &&
    typeof stats.accounts_count === "number" &&
    typeof stats.today_reviews_count === "number" &&
    typeof stats.weekly_growth === "number" &&
    Array.isArray(stats.reviews_trend) &&
    (stats.youtube_subs === null || typeof stats.youtube_subs === "string") &&
    typeof stats.has_youtube === "boolean" &&
    typeof stats.has_accounts === "boolean" &&
    typeof stats.streak === "number"
  );
}

/**
 * Type guard for LocationWithGMBAccount
 */
export function isLocationWithGMBAccount(
  data: unknown,
): data is LocationWithGMBAccount {
  if (!data || typeof data !== "object") return false;

  const location = data as Record<string, unknown>;

  return (
    typeof location.id === "string" &&
    typeof location.user_id === "string" &&
    typeof location.location_name === "string" &&
    typeof location.location_id === "string" &&
    (location.address === null || typeof location.address === "string") &&
    (location.phone === null || typeof location.phone === "string") &&
    (location.website === null || typeof location.website === "string") &&
    typeof location.is_active === "boolean" &&
    typeof location.metadata === "object" &&
    location.metadata !== null &&
    isGMBAccount(location.gmb_accounts)
  );
}

/**
 * Type guard for GMB Account
 */
export function isGMBAccount(
  data: unknown,
): data is LocationWithGMBAccount["gmb_accounts"] {
  if (!data || typeof data !== "object") return false;

  const account = data as Record<string, unknown>;

  return (
    typeof account.id === "string" &&
    typeof account.user_id === "string" &&
    typeof account.access_token === "string" &&
    typeof account.refresh_token === "string" &&
    typeof account.token_expires_at === "string"
  );
}

/**
 * Type guard for TokenRefreshResult
 */
export function isTokenRefreshResult(
  data: unknown,
): data is TokenRefreshResult {
  if (!data || typeof data !== "object") return false;

  const result = data as Record<string, unknown>;

  return (
    typeof result.access_token === "string" &&
    typeof result.expires_in === "number" &&
    (result.refresh_token === undefined ||
      typeof result.refresh_token === "string")
  );
}

/**
 * Type guard for Supabase error
 */
export function isSupabaseError(
  error: unknown,
): error is { code: string; message: string; details?: string } {
  if (!error || typeof error !== "object") return false;

  const err = error as Record<string, unknown>;

  return typeof err.code === "string" && typeof err.message === "string";
}

/**
 * Type guard for API response
 */
export function isApiResponse<T>(
  data: unknown,
  validator: (data: unknown) => data is T,
): data is { success: boolean; data?: T; error?: string } {
  if (!data || typeof data !== "object") return false;

  const response = data as Record<string, unknown>;

  return (
    typeof response.success === "boolean" &&
    (response.data === undefined || validator(response.data)) &&
    (response.error === undefined || typeof response.error === "string")
  );
}

/**
 * Safe type assertion with validation
 */
export function assertType<T>(
  data: unknown,
  validator: (data: unknown) => data is T,
  errorMessage: string,
): T {
  if (!validator(data)) {
    throw new TypeError(errorMessage);
  }
  return data;
}

/**
 * Safe property access with type checking
 */
export function safeGet<T>(
  obj: Record<string, unknown>,
  key: string,
  validator: (value: unknown) => value is T,
  defaultValue: T,
): T {
  const value = obj[key];
  return validator(value) ? value : defaultValue;
}

/**
 * Type-safe array filter
 */
export function filterByType<T>(
  array: unknown[],
  validator: (item: unknown) => item is T,
): T[] {
  return array.filter(validator);
}

/**
 * Validate and transform unknown data to known type
 */
export function validateAndTransform<T, U>(
  data: T,
  transformer: (data: T) => U,
  validator: (result: unknown) => result is U,
): U {
  const result = transformer(data);
  if (!validator(result)) {
    throw new TypeError("Transformation resulted in invalid type");
  }
  return result;
}
