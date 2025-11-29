/**
 * ============================================================================
 * Distributed Lock Manager
 * ============================================================================
 *
 * Production-grade distributed locking using the Redlock algorithm pattern.
 * Uses Upstash Redis with proper TTL handling to prevent deadlocks.
 *
 * Features:
 * - Atomic lock acquisition with NX (set if not exists)
 * - Safe release with token verification (Lua script)
 * - Lock extension for long-running operations
 * - Automatic TTL to prevent deadlocks
 * - In-memory fallback for development/testing
 *
 * Usage:
 * ```ts
 * const lock = await acquireLock('my-resource', 30);
 * if (lock) {
 *   try {
 *     // Do work...
 *     await extendLock('my-resource', lock.token, 30); // Extend if needed
 *   } finally {
 *     await releaseLock('my-resource', lock.token);
 *   }
 * }
 *
 * // Or use the withLock helper:
 * await withLock('my-resource', 30, async () => {
 *   // Do work...
 * });
 * ```
 */

import { getRedisClient, markRedisAsUnavailable } from "@/lib/redis/client";
import { randomUUID } from "crypto";

// ============================================================================
// Types
// ============================================================================

export interface Lock {
  /** Unique token for this lock instance */
  token: string;
  /** Key that was locked */
  key: string;
  /** When the lock expires (Unix timestamp in ms) */
  expiresAt: number;
}

export interface LockOptions {
  /** Time-to-live in seconds (default: 30) */
  ttlSeconds?: number;
  /** Number of retry attempts (default: 3) */
  retryCount?: number;
  /** Delay between retries in ms (default: 200) */
  retryDelayMs?: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Default lock TTL in seconds */
const DEFAULT_TTL_SECONDS = 30;

/** Maximum lock TTL to prevent indefinite locks */
const MAX_TTL_SECONDS = 300; // 5 minutes

/** Minimum lock TTL */
const MIN_TTL_SECONDS = 1;

/** Clock drift factor for safety margin */
const CLOCK_DRIFT_FACTOR = 0.01;

/** Lock key prefix for namespacing */
const LOCK_PREFIX = "lock:";

// ============================================================================
// In-Memory Fallback (for development/testing)
// ============================================================================

interface MemoryLock {
  token: string;
  expiresAt: number;
}

const memoryLocks = new Map<string, MemoryLock>();

function cleanupExpiredLocks(): void {
  const now = Date.now();
  for (const [key, lock] of memoryLocks.entries()) {
    if (lock.expiresAt <= now) {
      memoryLocks.delete(key);
    }
  }
}

// ============================================================================
// Lua Scripts (Atomic Operations)
// ============================================================================

/**
 * Lua script for safe lock release.
 * Only deletes the key if the token matches (prevents releasing someone else's lock).
 */
const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`;

/**
 * Lua script for lock extension.
 * Only extends TTL if the token matches.
 */
const EXTEND_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("pexpire", KEYS[1], ARGV[2])
end
return 0
`;

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Acquire a distributed lock on a resource.
 *
 * @param key - Resource identifier to lock
 * @param ttlSeconds - Lock TTL in seconds (1-300, default: 30)
 * @returns Lock object if acquired, null if resource is already locked
 */
export async function acquireLock(
  key: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<Lock | null> {
  const ttl = Math.min(MAX_TTL_SECONDS, Math.max(MIN_TTL_SECONDS, ttlSeconds));
  const token = randomUUID();
  const lockKey = `${LOCK_PREFIX}${key}`;
  const ttlMs = ttl * 1000;
  const redis = getRedisClient();

  if (redis) {
    try {
      // Use SET with NX (only set if not exists) and PX (TTL in milliseconds)
      const result = await redis.set(lockKey, token, { nx: true, px: ttlMs });

      if (result === "OK") {
        // Calculate validity time with clock drift safety margin
        const drift = Math.floor(ttlMs * CLOCK_DRIFT_FACTOR) + 2;
        const expiresAt = Date.now() + ttlMs - drift;

        return { token, key: lockKey, expiresAt };
      }

      return null; // Lock already held
    } catch (error) {
      console.error("[LockManager] Redis acquire error:", error);
      markRedisAsUnavailable(error);
    }
  }

  // Fallback to in-memory locks
  cleanupExpiredLocks();
  const existing = memoryLocks.get(lockKey);

  if (existing && existing.expiresAt > Date.now()) {
    return null; // Lock already held
  }

  const expiresAt = Date.now() + ttlMs;
  memoryLocks.set(lockKey, { token, expiresAt });

  return { token, key: lockKey, expiresAt };
}

/**
 * Release a distributed lock.
 *
 * @param key - Resource identifier (without prefix)
 * @param token - Lock token from acquireLock
 * @returns true if lock was released, false if lock was not held or token mismatch
 */
export async function releaseLock(
  key: string,
  token: string,
): Promise<boolean> {
  const lockKey = key.startsWith(LOCK_PREFIX) ? key : `${LOCK_PREFIX}${key}`;
  const redis = getRedisClient();

  if (redis) {
    try {
      const result = await redis.eval(RELEASE_SCRIPT, [lockKey], [token]);
      return result === 1 || result === "1";
    } catch (error) {
      console.error("[LockManager] Redis release error:", error);
      markRedisAsUnavailable(error);
    }
  }

  // Fallback to in-memory
  const current = memoryLocks.get(lockKey);
  if (current && current.token === token) {
    memoryLocks.delete(lockKey);
    return true;
  }

  return false;
}

/**
 * Extend a lock's TTL.
 * Use this for long-running operations to prevent lock expiration.
 *
 * @param key - Resource identifier (without prefix)
 * @param token - Lock token from acquireLock
 * @param ttlSeconds - New TTL in seconds
 * @returns true if lock was extended, false if lock not held or token mismatch
 */
export async function extendLock(
  key: string,
  token: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<boolean> {
  const ttl = Math.min(MAX_TTL_SECONDS, Math.max(MIN_TTL_SECONDS, ttlSeconds));
  const lockKey = key.startsWith(LOCK_PREFIX) ? key : `${LOCK_PREFIX}${key}`;
  const ttlMs = ttl * 1000;
  const redis = getRedisClient();

  if (redis) {
    try {
      const result = await redis.eval(
        EXTEND_SCRIPT,
        [lockKey],
        [ttlMs.toString()],
      );
      return result === 1 || result === "1";
    } catch (error) {
      console.error("[LockManager] Redis extend error:", error);
      markRedisAsUnavailable(error);
    }
  }

  // Fallback to in-memory
  cleanupExpiredLocks();
  const current = memoryLocks.get(lockKey);

  if (current && current.token === token) {
    current.expiresAt = Date.now() + ttlMs;
    memoryLocks.set(lockKey, current);
    return true;
  }

  return false;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Execute a function with a distributed lock.
 * Automatically acquires and releases the lock.
 *
 * @param key - Resource identifier to lock
 * @param ttlSeconds - Lock TTL in seconds
 * @param fn - Function to execute while holding the lock
 * @param options - Lock options (retryCount, retryDelayMs)
 * @returns Result of the function, or throws if lock cannot be acquired
 */
export async function withLock<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
  options: Pick<LockOptions, "retryCount" | "retryDelayMs"> = {},
): Promise<T> {
  const { retryCount = 3, retryDelayMs = 200 } = options;

  let lock: Lock | null = null;
  let attempts = 0;

  // Try to acquire lock with retries
  while (attempts < retryCount) {
    lock = await acquireLock(key, ttlSeconds);
    if (lock) break;

    attempts++;
    if (attempts < retryCount) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  if (!lock) {
    throw new Error(
      `Failed to acquire lock for "${key}" after ${retryCount} attempts`,
    );
  }

  try {
    return await fn();
  } finally {
    await releaseLock(key, lock.token);
  }
}

/**
 * Check if a resource is currently locked.
 * Note: This is a point-in-time check and may be stale by the time you act on it.
 *
 * @param key - Resource identifier
 * @returns true if locked, false otherwise
 */
export async function isLocked(key: string): Promise<boolean> {
  const lockKey = `${LOCK_PREFIX}${key}`;
  const redis = getRedisClient();

  if (redis) {
    try {
      const value = await redis.get(lockKey);
      return value !== null;
    } catch (error) {
      console.error("[LockManager] Redis isLocked error:", error);
      markRedisAsUnavailable(error);
    }
  }

  // Fallback to in-memory
  cleanupExpiredLocks();
  const existing = memoryLocks.get(lockKey);
  return existing !== undefined && existing.expiresAt > Date.now();
}

/**
 * Force release a lock (admin use only).
 * WARNING: This can cause race conditions if the lock holder is still working.
 *
 * @param key - Resource identifier
 * @returns true if lock was deleted
 */
export async function forceReleaseLock(key: string): Promise<boolean> {
  const lockKey = `${LOCK_PREFIX}${key}`;
  const redis = getRedisClient();

  if (redis) {
    try {
      const result = await redis.del(lockKey);
      return result === 1;
    } catch (error) {
      console.error("[LockManager] Redis forceRelease error:", error);
      markRedisAsUnavailable(error);
    }
  }

  // Fallback to in-memory
  return memoryLocks.delete(lockKey);
}
