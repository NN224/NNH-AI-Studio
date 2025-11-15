"use server"

import { getRedisClient } from '@/lib/redis/client'

type MemoryStore = Map<string, number | Set<string>>
const globalStore: MemoryStore =
  (globalThis as any).__metricsStore ?? ((globalThis as any).__metricsStore = new Map())

const DAY_SECONDS = 24 * 60 * 60

function todayKey() {
  return new Date().toISOString().split('T')[0]
}

async function incrementCounter(key: string, amount: number, ttlSeconds: number) {
  const redis = getRedisClient()
  if (redis) {
    const value = await redis.incrby(key, amount)
    if (value === amount) {
      await redis.expire(key, ttlSeconds)
    }
    return
  }

  const current = (globalStore.get(key) as number | undefined) ?? 0
  globalStore.set(key, current + amount)
}

async function addToSet(key: string, member: string, ttlSeconds: number) {
  const redis = getRedisClient()
  if (redis) {
    await redis.sadd(key, member)
    await redis.expire(key, ttlSeconds)
    return
  }

  let set = globalStore.get(key) as Set<string> | undefined
  if (!set) {
    set = new Set<string>()
    globalStore.set(key, set)
  }
  set.add(member)
}

async function getCounter(key: string) {
  const redis = getRedisClient()
  if (redis) {
    const value = await redis.get(key)
    return value ? Number(value) : 0
  }
  return (globalStore.get(key) as number | undefined) ?? 0
}

async function getSetCount(key: string) {
  const redis = getRedisClient()
  if (redis) {
    return redis.scard(key)
  }
  const set = globalStore.get(key) as Set<string> | undefined
  return set ? set.size : 0
}

export async function trackDailyActiveUser(userId: string | null) {
  if (!userId) return
  const key = `metrics:dau:${todayKey()}`
  await addToSet(key, userId, DAY_SECONDS)
}

export async function trackSyncResult(userId: string | null | undefined, success: boolean, durationMs?: number) {
  const suffix = success ? 'success' : 'failure'
  await incrementCounter(`metrics:sync:${suffix}:${todayKey()}`, 1, DAY_SECONDS)
  if (userId) {
    await incrementCounter(`metrics:sync:user:${userId}:${suffix}`, 1, DAY_SECONDS * 7)
  }
  if (typeof durationMs === 'number') {
    await trackApiResponse('sync', durationMs)
  }
}

export async function trackApiResponse(metric: string, durationMs: number) {
  if (!Number.isFinite(durationMs)) return
  const sumKey = `metrics:api:${metric}:${todayKey()}:sum`
  const countKey = `metrics:api:${metric}:${todayKey()}:count`
  await incrementCounter(sumKey, Math.max(0, Math.round(durationMs)), DAY_SECONDS)
  await incrementCounter(countKey, 1, DAY_SECONDS)
}

export async function getMetricsSummary(userId: string | null | undefined) {
  const success = await getCounter(`metrics:sync:success:${todayKey()}`)
  const failure = await getCounter(`metrics:sync:failure:${todayKey()}`)
  const total = success + failure
  const globalRate = total === 0 ? 0 : Math.round((success / total) * 100)

  const userSuccess = userId ? await getCounter(`metrics:sync:user:${userId}:success`) : 0
  const userFailure = userId ? await getCounter(`metrics:sync:user:${userId}:failure`) : 0
  const userTotal = userSuccess + userFailure
  const userRate = userTotal === 0 ? 0 : Math.round((userSuccess / userTotal) * 100)

  const dau = await getSetCount(`metrics:dau:${todayKey()}`)

  const apiSum = await getCounter(`metrics:api:sync:${todayKey()}:sum`)
  const apiCount = await getCounter(`metrics:api:sync:${todayKey()}:count`)
  const avgApi = apiCount === 0 ? 0 : Math.round(apiSum / apiCount)

  return {
    sync: {
      globalRate,
      total,
      userRate,
      userSuccess,
      userFailure,
    },
    api: {
      averageResponseMs: avgApi,
    },
    dailyActiveUsers: dau,
  }
}

