/**
 * ============================================================================
 * Circuit Breaker Implementation
 * ============================================================================
 *
 * Prevents cascading failures by stopping requests when a service is failing.
 *
 * States:
 * - CLOSED: Normal operation, requests allowed
 * - OPEN: Service is failing, requests blocked
 * - HALF_OPEN: Testing if service recovered, limited requests allowed
 */

import { getRedisClient } from "@/lib/redis/client";
import { gmbLogger } from "@/lib/utils/logger";

export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  /** Time in ms before attempting to close circuit */
  resetTimeoutMs: number;
  /** Number of successful requests in HALF_OPEN to close circuit */
  successThreshold?: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 5 * 60 * 1000, // 5 minutes
  successThreshold: 2,
};

export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private keyPrefix: string;

  constructor(
    private serviceName: string,
    private resourceId: string,
    config?: Partial<CircuitBreakerConfig>,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.keyPrefix = `circuit_breaker:${serviceName}:${resourceId}`;
  }

  /**
   * Check if circuit breaker allows the request
   * @returns true if request is allowed, false if blocked
   */
  async isOpen(): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) {
      // If Redis unavailable, allow requests (fail open)
      return false;
    }

    try {
      const failures = await redis.get(`${this.keyPrefix}:failures`);
      const lastFailure = await redis.get(`${this.keyPrefix}:last_failure`);
      const state = await redis.get(`${this.keyPrefix}:state`);

      if (!failures || !lastFailure) {
        return false; // CLOSED - no failures recorded
      }

      const failureCount = parseInt(failures);
      const lastFailureTime = parseInt(lastFailure);
      const currentState = state?.toString() || "CLOSED";

      // If we have enough failures, check if we should open
      if (failureCount >= this.config.failureThreshold) {
        const timeSinceLastFailure = Date.now() - lastFailureTime;

        // If within reset timeout, circuit is OPEN
        if (timeSinceLastFailure < this.config.resetTimeoutMs) {
          if (currentState !== "OPEN") {
            await redis.set(`${this.keyPrefix}:state`, "OPEN");
            gmbLogger.warn("Circuit breaker OPENED", {
              service: this.serviceName,
              resourceId: this.resourceId,
              failures: failureCount,
            });
          }
          return true; // OPEN - block requests
        }

        // Reset timeout passed, move to HALF_OPEN
        if (currentState !== "HALF_OPEN") {
          await redis.set(`${this.keyPrefix}:state`, "HALF_OPEN");
          await redis.del(`${this.keyPrefix}:failures`);
          gmbLogger.info("Circuit breaker HALF_OPEN - testing recovery", {
            service: this.serviceName,
            resourceId: this.resourceId,
          });
        }
        return false; // HALF_OPEN - allow limited requests
      }

      return false; // CLOSED - allow requests
    } catch (error) {
      gmbLogger.error(
        "Error checking circuit breaker state",
        error instanceof Error ? error : new Error(String(error)),
        {
          service: this.serviceName,
          resourceId: this.resourceId,
        },
      );
      // On error, fail open (allow requests)
      return false;
    }
  }

  /**
   * Record a failure
   */
  async recordFailure(error?: Error): Promise<void> {
    const redis = getRedisClient();
    if (!redis) return;

    try {
      const failuresKey = `${this.keyPrefix}:failures`;
      const lastFailureKey = `${this.keyPrefix}:last_failure`;
      const stateKey = `${this.keyPrefix}:state`;

      const currentFailures = await redis.incr(failuresKey);
      await redis.set(lastFailureKey, Date.now().toString());
      await redis.set(stateKey, "CLOSED"); // Reset to CLOSED if was HALF_OPEN

      // Set expiration
      const ttl = Math.ceil(this.config.resetTimeoutMs / 1000);
      await redis.expire(failuresKey, ttl);
      await redis.expire(lastFailureKey, ttl);

      if (currentFailures >= this.config.failureThreshold) {
        await redis.set(stateKey, "OPEN");
        gmbLogger.error(
          "Circuit breaker threshold reached - OPENING circuit",
          error || new Error("Unknown error"),
          {
            service: this.serviceName,
            resourceId: this.resourceId,
            failures: currentFailures,
            threshold: this.config.failureThreshold,
          },
        );
      } else {
        gmbLogger.warn("Circuit breaker failure recorded", {
          service: this.serviceName,
          resourceId: this.resourceId,
          failures: currentFailures,
          threshold: this.config.failureThreshold,
        });
      }
    } catch (error) {
      gmbLogger.error(
        "Error recording circuit breaker failure",
        error instanceof Error ? error : new Error(String(error)),
        {
          service: this.serviceName,
          resourceId: this.resourceId,
        },
      );
    }
  }

  /**
   * Record a success
   */
  async recordSuccess(): Promise<void> {
    const redis = getRedisClient();
    if (!redis) return;

    try {
      const state = await redis.get(`${this.keyPrefix}:state`);
      const currentState = state?.toString() || "CLOSED";

      if (currentState === "HALF_OPEN") {
        // In HALF_OPEN, count successes
        const successesKey = `${this.keyPrefix}:successes`;
        const successes = await redis.incr(successesKey);
        await redis.expire(successesKey, 60); // 1 minute TTL

        if (successes >= (this.config.successThreshold || 2)) {
          // Enough successes, close circuit
          await this.reset();
          gmbLogger.info("Circuit breaker CLOSED - service recovered", {
            service: this.serviceName,
            resourceId: this.resourceId,
            successes,
          });
        }
      } else {
        // In CLOSED state, reset failures on success
        await this.reset();
      }
    } catch (error) {
      gmbLogger.error(
        "Error recording circuit breaker success",
        error instanceof Error ? error : new Error(String(error)),
        {
          service: this.serviceName,
          resourceId: this.resourceId,
        },
      );
    }
  }

  /**
   * Reset circuit breaker to CLOSED state
   */
  async reset(): Promise<void> {
    const redis = getRedisClient();
    if (!redis) return;

    try {
      await redis.del(
        `${this.keyPrefix}:failures`,
        `${this.keyPrefix}:last_failure`,
        `${this.keyPrefix}:state`,
        `${this.keyPrefix}:successes`,
      );
    } catch (error) {
      gmbLogger.error(
        "Error resetting circuit breaker",
        error instanceof Error ? error : new Error(String(error)),
        {
          service: this.serviceName,
          resourceId: this.resourceId,
        },
      );
    }
  }

  /**
   * Get current circuit breaker state
   */
  async getState(): Promise<"CLOSED" | "OPEN" | "HALF_OPEN"> {
    const redis = getRedisClient();
    if (!redis) return "CLOSED";

    try {
      const state = await redis.get(`${this.keyPrefix}:state`);
      return (state?.toString() as "CLOSED" | "OPEN" | "HALF_OPEN") || "CLOSED";
    } catch {
      return "CLOSED";
    }
  }
}

/**
 * Create a circuit breaker instance for GMB sync
 */
export function createGMBSyncCircuitBreaker(accountId: string): CircuitBreaker {
  return new CircuitBreaker("gmb_sync", accountId, {
    failureThreshold: 5,
    resetTimeoutMs: 5 * 60 * 1000, // 5 minutes
    successThreshold: 2,
  });
}
