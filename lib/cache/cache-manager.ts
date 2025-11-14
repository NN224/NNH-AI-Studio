import type Redis from 'ioredis'
import { getRedisClient } from '@/lib/redis/client'

export enum CacheBucket {
  DASHBOARD_OVERVIEW = 'dashboard:overview',
  LOCATIONS = 'locations',
  REVIEWS = 'reviews',
  QUESTIONS = 'questions',
}

type CacheEntry = {
  value: string
  expiresAt: number
}

type Warmer = (identifier: string) => Promise<unknown>

type PopularKey = {
  bucket: CacheBucket
  identifier: string
  hits: number
}

type CacheMetrics = {
  hits: number
  misses: number
  perBucket: Record<CacheBucket, { hits: number; misses: number }>
}

export type SyncProgressEvent = {
  syncId?: string
  accountId: string
  userId: string
  stage: string
  status: 'pending' | 'running' | 'completed' | 'error'
  current: number
  total: number
  percentage: number
  message?: string
  counts?: Record<string, number | undefined>
  error?: string
  timestamp: string
}

const TTL_CONFIG: Record<CacheBucket, number> = {
  [CacheBucket.DASHBOARD_OVERVIEW]: 60 * 5,
  [CacheBucket.LOCATIONS]: 60 * 10,
  [CacheBucket.REVIEWS]: 60 * 5,
  [CacheBucket.QUESTIONS]: 60 * 5,
}

const CACHE_PREFIX = 'cache:nnh'
const INVALIDATION_CHANNEL = 'cache:invalidate'
const SYNC_PROGRESS_CHANNEL = 'sync:progress'
const inMemoryCache = new Map<string, CacheEntry>()
const warmers = new Map<CacheBucket, Warmer>()
const popularKeys = new Map<string, PopularKey>()
const POPULAR_THRESHOLD = 3
const POPULAR_INTERVAL_MS = 5 * 60 * 1000
const isDev = process.env.NODE_ENV !== 'production'

const metrics: CacheMetrics = {
  hits: 0,
  misses: 0,
  perBucket: {
    [CacheBucket.DASHBOARD_OVERVIEW]: { hits: 0, misses: 0 },
    [CacheBucket.LOCATIONS]: { hits: 0, misses: 0 },
    [CacheBucket.REVIEWS]: { hits: 0, misses: 0 },
    [CacheBucket.QUESTIONS]: { hits: 0, misses: 0 },
  },
}

let subscriber: Redis | null = null
let subscriberInitialized = false
const syncHandlers = new Set<(event: SyncProgressEvent) => void>()

declare global {
  // eslint-disable-next-line no-var
  var __nnh_cache_warm_job_started: boolean | undefined
}

function logCache(event: string, payload?: Record<string, unknown>) {
  if (!isDev) return
  console.info(`[Cache] ${event}`, payload ?? {})
}

function composeKey(bucket: CacheBucket, identifier: string) {
  return `${CACHE_PREFIX}:${bucket}:${identifier}`
}

function getTtl(bucket: CacheBucket, ttlSeconds?: number) {
  return ttlSeconds ?? TTL_CONFIG[bucket] ?? 60
}

function trackMetrics(bucket: CacheBucket, hit: boolean) {
  if (hit) {
    metrics.hits += 1
    metrics.perBucket[bucket].hits += 1
  } else {
    metrics.misses += 1
    metrics.perBucket[bucket].misses += 1
  }
}

function trackPopularity(bucket: CacheBucket, identifier: string, hit: boolean) {
  if (!hit) return
  const key = composeKey(bucket, identifier)
  const existing = popularKeys.get(key) ?? { bucket, identifier, hits: 0 }
  existing.hits += 1
  popularKeys.set(key, existing)
}

function schedulePopularWarmJob() {
  if (globalThis.__nnh_cache_warm_job_started) {
    return
  }
  globalThis.__nnh_cache_warm_job_started = true
  const interval = setInterval(() => {
    popularKeys.forEach((entry, key) => {
      if (entry.hits >= POPULAR_THRESHOLD) {
        warmCache(entry.bucket, entry.identifier).catch((err) => {
          logCache('warm:popular:error', { key, error: err instanceof Error ? err.message : err })
        })
      }
      entry.hits = 0
      popularKeys.set(key, entry)
    })
  }, POPULAR_INTERVAL_MS)
  interval.unref?.()
}

schedulePopularWarmJob()

async function initSubscriber() {
  if (subscriberInitialized) {
    return
  }
  subscriberInitialized = true

  const attempt = async (): Promise<void> => {
    const redis = getRedisClient()
    if (!redis) {
      setTimeout(attempt, 30_000).unref?.()
      return
    }

    try {
      subscriber = redis.duplicate()
      subscriber.on('message', (channel, message) => {
        if (channel === INVALIDATION_CHANNEL) {
          try {
            const payload = JSON.parse(message) as { key: string }
            if (payload?.key) {
              inMemoryCache.delete(payload.key)
              logCache('invalidation:remote', { key: payload.key })
            }
          } catch (error) {
            logCache('invalidation:parse_error', { error })
          }
          return
        }

        if (channel === SYNC_PROGRESS_CHANNEL) {
          try {
            const payload = JSON.parse(message) as SyncProgressEvent
            if (payload?.userId) {
              syncHandlers.forEach((handler) => handler(payload))
            }
          } catch (error) {
            logCache('sync:parse_error', { error })
          }
        }
      })
      await subscriber.subscribe(INVALIDATION_CHANNEL, SYNC_PROGRESS_CHANNEL)
      logCache('pubsub:ready')
    } catch (error) {
      logCache('pubsub:error', { error })
      setTimeout(attempt, 30_000).unref?.()
    }
  }

  attempt().catch((error) => logCache('pubsub:subscribe_failed', { error }))
}

initSubscriber()

export async function getCacheValue<T>(bucket: CacheBucket, identifier: string): Promise<T | null> {
  const key = composeKey(bucket, identifier)
  const redis = getRedisClient()

  if (redis) {
    try {
      const raw = await redis.get(key)
      if (raw) {
        trackMetrics(bucket, true)
        trackPopularity(bucket, identifier, true)
        logCache('hit', { key, bucket })
        return JSON.parse(raw) as T
      }
    } catch (error) {
      logCache('redis:get_error', { error })
    }
  }

  const fallback = inMemoryCache.get(key)
  if (fallback) {
    if (fallback.expiresAt > Date.now()) {
      trackMetrics(bucket, true)
      trackPopularity(bucket, identifier, true)
      logCache('hit:fallback', { key, bucket })
      return JSON.parse(fallback.value) as T
    }
    inMemoryCache.delete(key)
  }

  trackMetrics(bucket, false)
  logCache('miss', { key, bucket })
  return null
}

export async function setCacheValue<T>(
  bucket: CacheBucket,
  identifier: string,
  value: T,
  ttlSeconds?: number
) {
  if (typeof value === 'undefined') {
    return
  }

  const key = composeKey(bucket, identifier)
  const ttl = getTtl(bucket, ttlSeconds)
  const serialized = JSON.stringify(value)
  const redis = getRedisClient()

  if (redis) {
    try {
      await redis.set(key, serialized, 'EX', ttl)
      logCache('set', { key, bucket, ttl })
    } catch (error) {
      logCache('redis:set_error', { error })
    }
  }

  inMemoryCache.set(key, { value: serialized, expiresAt: Date.now() + ttl * 1000 })
}

export async function invalidateCache(bucket: CacheBucket, identifier: string) {
  const key = composeKey(bucket, identifier)
  const redis = getRedisClient()

  inMemoryCache.delete(key)

  if (redis) {
    try {
      await redis.del(key)
      await redis.publish(INVALIDATION_CHANNEL, JSON.stringify({ key }))
    } catch (error) {
      logCache('redis:invalidate_error', { error })
    }
  }

  logCache('invalidate', { key, bucket })
}

export function registerCacheWarmer(bucket: CacheBucket, warmer: Warmer) {
  warmers.set(bucket, warmer)
}

export async function warmCache(bucket: CacheBucket, identifier: string) {
  const warmer = warmers.get(bucket)
  if (!warmer) {
    return null
  }

  try {
    const data = await warmer(identifier)
    if (typeof data !== 'undefined') {
      await setCacheValue(bucket, identifier, data)
    }
    return data
  } catch (error) {
    logCache('warm:error', { bucket, identifier, error })
    return null
  }
}

export async function refreshCache(bucket: CacheBucket, identifier: string) {
  await invalidateCache(bucket, identifier)
  void warmCache(bucket, identifier)
}

export function getCacheStats() {
  return {
    ...metrics,
  }
}

export function subscribeToSyncProgress(handler: (event: SyncProgressEvent) => void) {
  syncHandlers.add(handler)
  return () => {
    syncHandlers.delete(handler)
  }
}

export async function publishSyncProgress(event: SyncProgressEvent) {
  syncHandlers.forEach((handler) => handler(event))

  const redis = getRedisClient()
  if (redis) {
    try {
      await redis.publish(SYNC_PROGRESS_CHANNEL, JSON.stringify(event))
    } catch (error) {
      logCache('sync:publish_error', { error })
    }
  }
}

