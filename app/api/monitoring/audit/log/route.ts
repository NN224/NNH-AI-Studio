import { NextRequest, NextResponse } from 'next/server'
import { logAction } from '@/lib/monitoring/audit'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { action, resourceType, resourceId, metadata } = body || {}

    if (!action || typeof action !== 'string') {
      return NextResponse.json({ error: 'action is required' }, { status: 400 })
    }

    await logAction(action, resourceType, resourceId, metadata)
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('[Audit API] Failed to record audit event', error)
    return NextResponse.json({ error: 'Failed to log action' }, { status: 500 })
  }
}

