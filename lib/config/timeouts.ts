/**
 * ============================================================================
 * Unified Timeout Configuration
 * ============================================================================
 * 
 * PURPOSE:
 * Centralized timeout configuration to prevent timeout mismatches.
 * 
 * HIERARCHY (من الأصغر للأكبر):
 * GOOGLE_API (30s) < JOB (7m) < TOTAL_SYNC (8m) < PROCESS (9m) < WORKER (10m)
 * 
 * CRITICAL: يجب أن ينتهي كل مستوى قبل المستوى الأعلى منه
 * ============================================================================
 */

export const SYNC_TIMEOUTS = {
  /**
   * Google API call timeout
   * Single API request should complete quickly
   */
  GOOGLE_API: 30000, // 30 seconds

  /**
   * Individual job processing timeout
   * A single sync job (locations, reviews, etc.) for one account
   */
  JOB: 7 * 60 * 1000, // 7 minutes

  /**
   * Total sync operation timeout
   * Complete sync for one account (all data types)
   */
  TOTAL_SYNC: 8 * 60 * 1000, // 8 minutes

  /**
   * Process function timeout
   * gmb-process Edge Function that calls performTransactionalSync
   */
  PROCESS: 9 * 60 * 1000, // 9 minutes

  /**
   * Worker timeout
   * gmb-sync-worker that processes multiple jobs from queue
   */
  WORKER: 10 * 60 * 1000, // 10 minutes

  /**
   * Safety margin for early termination
   */
  MARGIN: 30000, // 30 seconds

  /**
   * Token refresh buffer
   * Refresh token this much time BEFORE expiry
   */
  TOKEN_REFRESH_BUFFER: 10 * 60 * 1000, // 10 minutes
} as const;

/**
 * Vercel-specific timeouts
 * Note: Vercel has hard limits based on plan
 */
export const VERCEL_TIMEOUTS = {
  /**
   * Vercel Hobby plan max: 10 seconds
   * Vercel Pro plan max: 60 seconds
   * Vercel Enterprise plan max: 900 seconds (15 minutes)
   */
  MAX_DURATION: 60, // seconds (for Pro plan)

  /**
   * Actual timeout we use (with safety margin)
   * Use 90% of max duration to account for cold starts
   */
  EFFECTIVE_TIMEOUT: 54000, // 54 seconds (90% of 60s)
} as const;

/**
 * Calculate remaining time for nested operations
 */
export function getRemainingTime(startTime: number, timeout: number): number {
  const elapsed = Date.now() - startTime;
  return Math.max(0, timeout - elapsed - SYNC_TIMEOUTS.MARGIN);
}

/**
 * Check if there's enough time remaining
 */
export function hasEnoughTime(startTime: number, timeout: number, required: number): boolean {
  return getRemainingTime(startTime, timeout) >= required;
}

/**
 * Create abort controller with timeout
 */
export function createTimeoutController(timeoutMs: number): {
  controller: AbortController;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  return {
    controller,
    cleanup: () => clearTimeout(timeoutId),
  };
}
