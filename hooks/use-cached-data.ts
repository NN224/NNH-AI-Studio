"use client"

import { useEffect, useState, useCallback, useRef } from "react"

type UseCachedDataOptions<T> = {
  initialData?: T
  revalidateInterval?: number
}

type MutateOptions = {
  rollbackOnError?: boolean
}

export function useCachedData<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options?: UseCachedDataOptions<T>
) {
  const [data, setData] = useState<T | undefined>(options?.initialData)
  const [optimisticData, setOptimisticData] = useState<T | undefined>(undefined)
  const [error, setError] = useState<Error | null>(null)
  const [isValidating, setIsValidating] = useState<boolean>(!options?.initialData)
  const broadcastRef = useRef<BroadcastChannel | null>(null)

  const revalidate = useCallback(async () => {
    setIsValidating(true)
    try {
      const fresh = await fetcher()
      setData(fresh)
      setError(null)
      return fresh
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setIsValidating(false)
    }
  }, [fetcher])

  useEffect(() => {
    revalidate().catch(() => {
      /* errors handled via state */
    })
  }, [revalidate])

  useEffect(() => {
    if (!options?.revalidateInterval) {
      return
    }
    const interval = setInterval(() => {
      revalidate().catch(() => {})
    }, options.revalidateInterval)
    return () => clearInterval(interval)
  }, [options?.revalidateInterval, revalidate])

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") {
      return
    }
    const channel = new BroadcastChannel("cache:invalidate")
    broadcastRef.current = channel

    const handler = (event: MessageEvent) => {
      if (event.data?.key === cacheKey) {
        revalidate().catch(() => {})
      }
    }

    channel.addEventListener("message", handler)

    return () => {
      channel.removeEventListener("message", handler)
      channel.close()
    }
  }, [cacheKey, revalidate])

  const mutate = useCallback(
    async (updater: (current?: T) => T | Promise<T>, mutateOptions?: MutateOptions) => {
      const rollbackValue = data
      const optimisticValue = await updater(data)
      setOptimisticData(optimisticValue)
      setData(optimisticValue)

      try {
        const fresh = await fetcher()
        setOptimisticData(undefined)
        setData(fresh)
        return fresh
      } catch (err) {
        setOptimisticData(undefined)
        if (mutateOptions?.rollbackOnError !== false) {
          setData(rollbackValue)
        }
        setError(err as Error)
        throw err
      }
    },
    [data, fetcher]
  )

  const invalidate = useCallback(() => {
    if (broadcastRef.current) {
      broadcastRef.current.postMessage({ key: cacheKey })
    }
    return revalidate()
  }, [cacheKey, revalidate])

  return {
    data,
    optimisticData,
    error,
    isLoading: !data && isValidating,
    isValidating,
    mutate,
    revalidate,
    invalidate,
  }
}

