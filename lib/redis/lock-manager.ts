import { randomUUID } from 'crypto'
import { getRedisClient, markRedisAsUnavailable } from '@/lib/redis/client'

type MemoryLock = {
  token: string
  expiresAt: number
}

const memoryLocks = new Map<string, MemoryLock>()

function cleanupExpiredLocks() {
  const now = Date.now()
  for (const [key, lock] of memoryLocks.entries()) {
    if (lock.expiresAt <= now) {
      memoryLocks.delete(key)
    }
  }
}

export async function acquireLock(key: string, ttlSeconds: number): Promise<string | null> {
  const ttl = Math.max(1, ttlSeconds)
  const token = randomUUID()
  const redis = getRedisClient()

  if (redis) {
    try {
      const result = await redis.set(key, token, { nx: true, ex: ttl })
      if (result === 'OK') {
        return token
      }
      return null
    } catch (error) {
      markRedisAsUnavailable(error)
    }
  }

  cleanupExpiredLocks()
  const existing = memoryLocks.get(key)
  if (existing && existing.expiresAt > Date.now()) {
    return null
  }

  memoryLocks.set(key, {
    token,
    expiresAt: Date.now() + ttl * 1000,
  })

  return token
}

export async function releaseLock(key: string, token: string): Promise<boolean> {
  const redis = getRedisClient()

  if (redis) {
    try {
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        end
        return 0
      `
      // Upstash Redis eval takes arrays for keys and args
      const result = await redis.eval(script, [key], [token])
      if (typeof result === 'number') {
        return result === 1
      }
      return result === '1' || result === 1
    } catch (error) {
      markRedisAsUnavailable(error)
    }
  }

  const current = memoryLocks.get(key)
  if (current && current.token === token) {
    memoryLocks.delete(key)
    return true
  }

  return false
}

export async function extendLock(key: string, token: string, ttlSeconds: number): Promise<boolean> {
  const ttl = Math.max(1, ttlSeconds)
  const redis = getRedisClient()

  if (redis) {
    try {
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("expire", KEYS[1], ARGV[2])
        end
        return 0
      `
      // Upstash Redis eval takes arrays for keys and args
      const result = await redis.eval(script, [key], [token, ttl.toString()])
      if (typeof result === 'number') {
        return result === 1
      }
      return result === '1' || result === 1
    } catch (error) {
      markRedisAsUnavailable(error)
    }
  }

  cleanupExpiredLocks()
  const current = memoryLocks.get(key)
  if (current && current.token === token) {
    current.expiresAt = Date.now() + ttl * 1000
    memoryLocks.set(key, current)
    return true
  }

  return false
}

