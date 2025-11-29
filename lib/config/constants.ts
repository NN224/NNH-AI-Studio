/**
 * ============================================================================
 * Application Constants
 * ============================================================================
 *
 * Centralized configuration values to avoid magic numbers scattered
 * throughout the codebase. Import these instead of hardcoding values.
 */

// ============================================================================
// Pagination
// ============================================================================

export const PAGINATION = {
  /** Default page size for list endpoints */
  DEFAULT_PAGE_SIZE: 20,
  /** Maximum allowed page size */
  MAX_PAGE_SIZE: 100,
  /** Minimum page size */
  MIN_PAGE_SIZE: 1,
  /** Default page number */
  DEFAULT_PAGE: 1,
} as const;

// ============================================================================
// Rate Limiting
// ============================================================================

export const RATE_LIMITS = {
  /** Default requests per minute for authenticated users */
  DEFAULT_REQUESTS_PER_MINUTE: 60,
  /** Requests per minute for bulk operations */
  BULK_OPERATIONS_PER_MINUTE: 10,
  /** Requests per minute for AI endpoints */
  AI_REQUESTS_PER_MINUTE: 30,
  /** Requests per minute for sync operations */
  SYNC_REQUESTS_PER_MINUTE: 5,
} as const;

// ============================================================================
// Timeouts (in milliseconds)
// ============================================================================

export const TIMEOUTS = {
  /** Default API request timeout */
  API_REQUEST: 30_000,
  /** Timeout for external API calls (GMB, etc.) */
  EXTERNAL_API: 60_000,
  /** Timeout for database operations */
  DATABASE_OPERATION: 10_000,
  /** Timeout for AI generation requests */
  AI_GENERATION: 120_000,
  /** OAuth state expiration */
  OAUTH_STATE_EXPIRY: 600_000, // 10 minutes
  /** Session refresh threshold */
  SESSION_REFRESH_THRESHOLD: 300_000, // 5 minutes
} as const;

// ============================================================================
// Retry Configuration
// ============================================================================

export const RETRY = {
  /** Default number of retry attempts */
  DEFAULT_ATTEMPTS: 3,
  /** Maximum retry attempts for critical operations */
  MAX_ATTEMPTS: 5,
  /** Base delay between retries (ms) */
  BASE_DELAY: 1000,
  /** Maximum delay between retries (ms) */
  MAX_DELAY: 30_000,
  /** Exponential backoff multiplier */
  BACKOFF_MULTIPLIER: 2,
} as const;

// ============================================================================
// Batch Operations
// ============================================================================

export const BATCH = {
  /** Maximum locations per bulk sync */
  MAX_BULK_SYNC_LOCATIONS: 50,
  /** Maximum items per bulk delete */
  MAX_BULK_DELETE: 100,
  /** Maximum items per bulk update */
  MAX_BULK_UPDATE: 100,
  /** Batch size for database operations */
  DB_BATCH_SIZE: 500,
} as const;

// ============================================================================
// Cache TTL (in seconds)
// ============================================================================

export const CACHE_TTL = {
  /** Dashboard overview cache */
  DASHBOARD_OVERVIEW: 300, // 5 minutes
  /** Location list cache */
  LOCATIONS_LIST: 60, // 1 minute
  /** Review stats cache */
  REVIEW_STATS: 120, // 2 minutes
  /** User settings cache */
  USER_SETTINGS: 600, // 10 minutes
  /** Static data cache (categories, etc.) */
  STATIC_DATA: 3600, // 1 hour
} as const;

// ============================================================================
// Data Limits
// ============================================================================

export const DATA_LIMITS = {
  /** Maximum recent items to fetch */
  RECENT_ITEMS_LIMIT: 5,
  /** Maximum activity log entries */
  ACTIVITY_LOG_LIMIT: 50,
  /** Maximum automation logs to display */
  AUTOMATION_LOGS_LIMIT: 50,
  /** Maximum weekly tasks to fetch */
  WEEKLY_TASKS_LIMIT: 100,
  /** Maximum search results */
  SEARCH_RESULTS_LIMIT: 50,
} as const;

// ============================================================================
// Validation Limits
// ============================================================================

export const VALIDATION = {
  /** Maximum location name length */
  LOCATION_NAME_MAX: 200,
  /** Maximum address length */
  ADDRESS_MAX: 500,
  /** Maximum phone number length */
  PHONE_MAX: 50,
  /** Maximum category name length */
  CATEGORY_MAX: 100,
  /** Maximum review reply length */
  REVIEW_REPLY_MAX: 4096,
  /** Maximum post content length */
  POST_CONTENT_MAX: 1500,
  /** Maximum search query length */
  SEARCH_QUERY_MAX: 200,
} as const;

// ============================================================================
// Sync Configuration
// ============================================================================

export const SYNC = {
  /** Hours before data is considered stale */
  STALE_DATA_HOURS: 24,
  /** GMB API page size for reviews/media */
  GMB_PAGE_SIZE: 50,
  /** Maximum concurrent sync operations */
  MAX_CONCURRENT_SYNCS: 3,
} as const;

// ============================================================================
// Health Score Thresholds
// ============================================================================

export const HEALTH_THRESHOLDS = {
  /** Minimum acceptable average rating */
  MIN_ACCEPTABLE_RATING: 4.0,
  /** Target response rate percentage */
  TARGET_RESPONSE_RATE: 80,
  /** Reviews threshold for rating warnings */
  REVIEWS_FOR_RATING_WARNING: 10,
  /** Reviews threshold for response rate warnings */
  REVIEWS_FOR_RESPONSE_WARNING: 5,
} as const;

// ============================================================================
// HTTP Status Codes (for consistency)
// ============================================================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;
