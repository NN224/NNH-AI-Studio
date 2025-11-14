import Redis from 'ioredis'

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

  if (!redisUrl) {
    console.warn('[Redis] No REDIS_URL/UPSTASH_REDIS_URL configured. Falling back to in-memory locks.')
    redisUnavailable = true
    scheduleRetryWindow()
    return null
  }

  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
    lazyConnect: true,
  })

  redisClient.on('error', (err) => {
    console.error('[Redis] Connection error:', err)
  })

  redisClient.on('end', () => {
    console.warn('[Redis] Connection closed. Using in-memory fallback until reconnection succeeds.')
    redisClient = null
    redisUnavailable = true
    scheduleRetryWindow()
  })

  return redisClient
}

export function markRedisAsUnavailable(reason?: unknown) {
  if (reason) {
    console.warn('[Redis] Marking client as unavailable. Falling back to in-memory locks.', reason)
  }
  redisUnavailable = true
  if (redisClient) {
    try {
      redisClient.disconnect()
    } catch {
      // ignore disconnect errors
    } finally {
      redisClient = null
    }
  }
  scheduleRetryWindow()
}

