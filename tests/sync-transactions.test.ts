import type { SupabaseClient } from '@supabase/supabase-js'
import { runSyncTransactionWithRetry, type SyncTransactionPayload } from '@/lib/supabase/transactions'

const basePayload: SyncTransactionPayload = {
  accountId: '123e4567-e89b-12d3-a456-426614174000',
  locations: [],
  reviews: [],
  questions: [],
}

function createMockSupabase(rpcImpl: jest.Mock): SupabaseClient {
  return {
    rpc: rpcImpl,
  } as unknown as SupabaseClient
}

describe('runSyncTransactionWithRetry', () => {
  it('returns data when RPC succeeds on first attempt', async () => {
    const mockResponse = {
      success: true,
      sync_id: 'sync-1',
      locations_synced: 1,
      reviews_synced: 2,
      questions_synced: 3,
    }

    const mockRpc = jest.fn().mockResolvedValue({ data: mockResponse, error: null })
    const supabase = createMockSupabase(mockRpc)

    const result = await runSyncTransactionWithRetry(supabase, basePayload, 1)
    expect(result).toEqual(mockResponse)
    expect(mockRpc).toHaveBeenCalledTimes(1)
  })

  it('retries when RPC fails and eventually succeeds', async () => {
    const mockResponse = {
      success: true,
      sync_id: 'sync-2',
      locations_synced: 5,
      reviews_synced: 0,
      questions_synced: 0,
    }

    const mockRpc = jest
      .fn()
      .mockResolvedValueOnce({ data: null, error: { message: 'timeout', details: null } })
      .mockResolvedValueOnce({ data: mockResponse, error: null })

    const supabase = createMockSupabase(mockRpc)
    const result = await runSyncTransactionWithRetry(supabase, basePayload, 3)

    expect(result).toEqual(mockResponse)
    expect(mockRpc).toHaveBeenCalledTimes(2)
  })

  it('throws after exceeding max retries', async () => {
    const mockRpc = jest
      .fn()
      .mockResolvedValue({ data: null, error: { message: 'db error', details: null } })

    const supabase = createMockSupabase(mockRpc)

    await expect(runSyncTransactionWithRetry(supabase, basePayload, 2)).rejects.toThrow('db error')
    expect(mockRpc).toHaveBeenCalledTimes(2)
  })
})

