"use server"

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { trackDailyActiveUser } from '@/lib/monitoring/metrics'

type AuditMetadata = Record<string, unknown> | null | undefined

function getClientIp() {
  const forwardHeader = headers().get('x-forwarded-for')
  if (forwardHeader) {
    return forwardHeader.split(',')[0]?.trim() || null
  }
  return headers().get('x-real-ip') || null
}

export async function logAction(
  action: string,
  resourceType?: string | null,
  resourceId?: string | number | null,
  metadata?: AuditMetadata
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    await supabase.from('audit_logs').insert({
      action,
      resource_type: resourceType ?? null,
      resource_id: resourceId ? String(resourceId) : null,
      metadata: metadata ?? null,
      ip_address: getClientIp(),
      user_id: user?.id ?? null,
    })

    if (user?.id) {
      await trackDailyActiveUser(user.id)
    }
  } catch (error) {
    console.error('[Audit] Failed to log action', error)
  }
}

export async function getRecentActivity(userId: string, limit = 10) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('audit_logs')
      .select('id, action, resource_type, resource_id, metadata, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[Audit] Failed to fetch activity', error)
      return []
    }

    return data ?? []
  } catch (error) {
    console.error('[Audit] Unexpected error fetching activity', error)
    return []
  }
}

