import { Redis } from '@upstash/redis'

let redisClient: Redis | null = null
let redisUnavailable = false
let retryTimer: NodeJS.Timeout | null = null

function scheduleRetryWindow() {
  if (retryTimer) {
    return
  }
  retryTimer = setTimeout(() => {
    redisUnavailable = false
    retryTimer = null
  }, 30_000)
  retryTimer.unref?.()
}

export function getRedisClient(): Redis | null {
  if (redisUnavailable) {
    return null
  }

  if (redisClient) {
    return redisClient
  }

  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

  // Upstash Redis requires both URL and token
  if (!redisUrl || !redisToken) {
    console.warn('[Redis] No REDIS_URL/UPSTASH_REDIS_URL or UPSTASH_REDIS_REST_TOKEN configured. Falling back to in-memory locks.')
    redisUnavailable = true
    scheduleRetryWindow()
    return null
  }

  try {
    redisClient = new Redis({
      url: redisUrl,
      token: redisToken,
    })
  } catch (error) {
    console.error('[Redis] Failed to initialize client:', error)
    redisUnavailable = true
    scheduleRetryWindow()
    return null
  }

  return redisClient
}

export function markRedisAsUnavailable(reason?: unknown) {
  if (reason) {
    console.warn('[Redis] Marking client as unavailable. Falling back to in-memory locks.', reason)
  }
  redisUnavailable = true
  redisClient = null
  scheduleRetryWindow()
}

