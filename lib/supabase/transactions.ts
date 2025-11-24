import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js'
import type {
  LocationData,
  ReviewData,
  QuestionData,
  PostData,
  MediaData,
} from '@/lib/gmb/sync-types'

export interface SyncTransactionPayload {
  accountId: string
  locations: LocationData[]
  reviews: ReviewData[]
  questions: QuestionData[]
  posts?: PostData[]
  media?: MediaData[]
}

export interface SyncTransactionResult {
  success: boolean
  sync_id: string
  locations_synced: number
  reviews_synced: number
  questions_synced: number
  posts_synced?: number
  media_synced?: number
}

const RPC_NAME = 'sync_gmb_data_transactional'

function logTransactionStep(step: string, details?: Record<string, unknown>) {
  console.info(`[GMB Sync][${step}]`, details ?? {})
}

function formatRpcError(error: PostgrestError | null) {
  if (!error) return 'Unknown RPC failure'
  return `${error.message}${error.details ? ` :: ${error.details}` : ''}`
}

async function executeRpc(
  supabase: SupabaseClient,
  payload: SyncTransactionPayload,
): Promise<SyncTransactionResult> {
  const start = performance.now()
  logTransactionStep('rpc:start', { rpc: RPC_NAME, accountId: payload.accountId })

  const { data, error } = await supabase.rpc(RPC_NAME, {
    p_account_id: payload.accountId,
    p_locations: payload.locations,
    p_reviews: payload.reviews,
    p_questions: payload.questions,
    p_posts: payload.posts || [],
    p_media: payload.media || [],
  })

  const duration = performance.now() - start
  logTransactionStep('rpc:end', { durationMs: Math.round(duration) })

  if (error) {
    throw new Error(formatRpcError(error))
  }

  if (!data) {
    throw new Error('RPC returned empty payload')
  }

  return data as SyncTransactionResult
}

export async function runSyncTransactionWithRetry(
  supabase: SupabaseClient,
  payload: SyncTransactionPayload,
  maxRetries = 3,
) {
  let attempt = 0
  let lastError: unknown = null

  while (attempt < maxRetries) {
    try {
      attempt += 1
      logTransactionStep('retry:attempt', { attempt, accountId: payload.accountId })
      return await executeRpc(supabase, payload)
    } catch (error) {
      lastError = error
      logTransactionStep('retry:error', { attempt, error })
      if (attempt >= maxRetries) {
        break
      }

      const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10_000)
      await new Promise((resolve) => setTimeout(resolve, backoffMs))
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}
