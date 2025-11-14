import { NextResponse } from 'next/server'
import { performTransactionalSync } from '@/server/actions/gmb-sync-v2'

function resolveBaseUrl(request: Request) {
  return (
    request.headers.get('origin') ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'http://localhost:3000'
  )
}

export async function POST(request: Request) {
  let accountId: string | undefined
  let includeQuestions = true

  try {
    const body = await request.json()
    accountId = body.accountId || body.account_id
    if (typeof body.includeQuestions === 'boolean') {
      includeQuestions = body.includeQuestions
    }
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  if (!accountId) {
    return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
  }

  try {
    const result = await performTransactionalSync(accountId, includeQuestions)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[GMB Sync v2] transactional sync failed, falling back to legacy route', error)

    try {
      const baseUrl = resolveBaseUrl(request)
      const fallbackResponse = await fetch(`${baseUrl}/api/gmb/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, syncType: 'full' }),
      })
      const fallbackData = await fallbackResponse.json().catch(() => ({}))

      if (!fallbackResponse.ok) {
        return NextResponse.json(
          {
            error: error?.message || 'Sync failed',
            fallback: fallbackData,
          },
          { status: fallbackResponse.status }
        )
      }

      return NextResponse.json(fallbackData)
    } catch (fallbackError: any) {
      console.error('[GMB Sync v2] legacy fallback failed', fallbackError)
      return NextResponse.json(
        { error: fallbackError?.message || 'Legacy fallback failed' },
        { status: 500 }
      )
    }
  }
}

