import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { subscribeToSyncProgress, type SyncProgressEvent } from '@/lib/cache/cache-manager'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type SyncProgressRow = {
  id: string
  account_id: string
  user_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  total_locations: number | null
  total_reviews: number | null
  total_questions: number | null
  synced_locations: number | null
  synced_reviews: number | null
  synced_questions: number | null
  error_message: string | null
  updated_at: string | null
  started_at: string | null
  completed_at: string | null
}

function rowToProgressEvent(row: SyncProgressRow | null): SyncProgressEvent | null {
  if (!row) return null
  const totals =
    (row.total_locations ?? 0) + (row.total_reviews ?? 0) + (row.total_questions ?? 0) || 1
  const completed =
    (row.synced_locations ?? 0) + (row.synced_reviews ?? 0) + (row.synced_questions ?? 0)
  const percentage = Math.max(0, Math.min(100, Math.round((completed / totals) * 100)))
  const stage: SyncProgressEvent['stage'] =
    row.status === 'completed' ? 'complete' : 'transaction'

  return {
    syncId: row.id,
    accountId: row.account_id,
    userId: row.user_id,
    stage,
    status: row.status === 'processing' ? 'running' : (row.status as SyncProgressEvent['status']),
    current: completed,
    total: totals,
    percentage,
    counts: {
      locations: row.synced_locations ?? undefined,
      reviews: row.synced_reviews ?? undefined,
      questions: row.synced_questions ?? undefined,
    },
    message: row.status === 'failed' ? row.error_message ?? 'Sync failed' : undefined,
    error: row.status === 'failed' ? row.error_message ?? undefined : undefined,
    timestamp: row.updated_at || row.completed_at || new Date().toISOString(),
  }
}

async function fetchLatestProgress(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  accountId?: string | null,
  syncId?: string | null
) {
  let query = supabase
    .from('sync_progress')
    .select(
      'id, account_id, user_id, status, total_locations, total_reviews, total_questions, synced_locations, synced_reviews, synced_questions, error_message, updated_at, started_at, completed_at'
    )
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(1)

  if (accountId) {
    query = query.eq('account_id', accountId)
  }

  if (syncId) {
    query = query.eq('id', syncId)
  }

  const { data, error } = await query.single()
  if (error && error.code !== 'PGRST116') {
    console.warn('[Sync Progress SSE] Failed to fetch latest progress', error)
  }

  return rowToProgressEvent(data || null)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('accountId')
  const syncId = searchParams.get('syncId')
  const mode = searchParams.get('mode')

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      {
        status: 401,
      }
    )
  }

  const userId = user.id

  const initial = await fetchLatestProgress(supabase, userId, accountId, syncId)

  if (mode === 'poll' || request.headers.get('accept')?.includes('application/json')) {
    return NextResponse.json({
      event: initial,
    })
  }

  const supportsEventStream =
    request.headers.get('accept')?.includes('text/event-stream') ?? false

  if (!supportsEventStream) {
    return NextResponse.json(
      {
        event: initial,
        hint: 'Use ?mode=poll for JSON polling',
      },
      { status: 200 }
    )
  }

  const controllerState: { cleanup?: () => void } = {}
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
      }

      let closed = false
      const cleanup = () => {
        if (closed) return
        closed = true
        unsubscribe?.()
        clearInterval(heartbeat)
        controller.close()
      }
      controllerState.cleanup = cleanup

      if (initial) {
        send({ type: 'history', payload: initial })
      } else {
        send({
          type: 'idle',
          payload: {
            stage: 'init',
            status: 'pending',
            percentage: 0,
            message: 'No sync history yet',
            timestamp: new Date().toISOString(),
          },
        })
      }

      const unsubscribe = subscribeToSyncProgress((event) => {
        if (event.userId !== userId) return
        if (accountId && event.accountId !== accountId) return
        if (syncId && event.syncId !== syncId) return
        send({ type: 'progress', payload: event })
      })

      const heartbeat = setInterval(() => {
        send({ type: 'ping', timestamp: Date.now() })
      }, 15_000)
      heartbeat.unref?.()

      request.signal.addEventListener('abort', cleanup)
    },
    cancel() {
      controllerState.cleanup?.()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}

