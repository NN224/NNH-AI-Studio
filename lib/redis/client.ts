import { apiLogger } from "@/lib/utils/logger";
import { Redis } from "@upstash/redis";

let redisClient: Redis | null = null;
let redisUnavailable = false;
let retryTimer: NodeJS.Timeout | null = null;

function scheduleRetryWindow() {
  if (retryTimer) {
    return;
  }
  retryTimer = setTimeout(() => {
    redisUnavailable = false;
    retryTimer = null;
  }, 30_000);
  retryTimer.unref?.();
}

export function getRedisClient(): Redis | null {
  if (redisUnavailable) {
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  // Upstash Redis requires both URL and token
  if (!redisUrl || !redisToken) {
    apiLogger.warn("Redis not configured - Falling back to in-memory locks");
    redisUnavailable = true;
    scheduleRetryWindow();
    return null;
  }

  try {
    redisClient = new Redis({
      url: redisUrl,
      token: redisToken,
    });
  } catch (error) {
    apiLogger.error(
      "Failed to initialize Redis client",
      error instanceof Error ? error : new Error(String(error)),
    );
    redisUnavailable = true;
    scheduleRetryWindow();
    return null;
  }

  return redisClient;
}

export function markRedisAsUnavailable(reason?: unknown) {
  if (reason) {
    apiLogger.warn(
      "Marking Redis client as unavailable - Falling back to in-memory locks",
      {
        reason,
      },
    );
  }
  redisUnavailable = true;
  redisClient = null;
  scheduleRetryWindow();
}
