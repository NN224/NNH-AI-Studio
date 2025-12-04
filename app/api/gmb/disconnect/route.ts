import { withCSRF } from '@/lib/api/with-csrf'
import { withStrictRateLimit } from '@/lib/api/with-rate-limit'
import { createClient } from '@/lib/supabase/server'
import { errorResponse, successResponse } from '@/lib/utils/api-response'
import { extractErrorMessage, gmbLogger, toError } from '@/lib/utils/logger'
import { disconnectGMBAccount } from '@/server/actions/gmb-account'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * ✅ UNIFIED: This API route now delegates to the server action for consistency
 * The server action provides better features (export, delete options) and is the single source of truth
 */
async function disconnectHandler(request: NextRequest) {
  gmbLogger.warn('Disconnect request received')

  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      gmbLogger.error('Authentication failed for disconnect', toError(authError))
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401)
    }

    gmbLogger.warn('User authenticated for disconnect', { userId: user.id })

    const body = await request.json().catch(() => ({}))
    const accountId = body.accountId
    const option = body.option || 'keep' // 'keep', 'delete', or 'export'

    if (!accountId) {
      return errorResponse('MISSING_ACCOUNT_ID', 'accountId is required in request body', 400)
    }

    gmbLogger.warn('Disconnecting account', {
      accountId,
      option,
      userId: user.id,
    })

    // ✅ Delegate to server action (single source of truth)
    const result = await disconnectGMBAccount(accountId, option)

    if (!result.success) {
      gmbLogger.error('Server action failed to disconnect account', toError(result.error), {
        accountId,
        userId: user.id,
      })
      return errorResponse('DISCONNECT_ERROR', result.error || 'Failed to disconnect account', 500)
    }

    gmbLogger.warn('Account disconnected successfully', {
      accountId,
      userId: user.id,
    })

    return successResponse({
      success: true,
      message: result.message || 'Account disconnected successfully',
      exportData: result.exportData,
    })
  } catch (error: unknown) {
    gmbLogger.error('Unexpected error disconnecting GMB account', toError(error))
    return errorResponse(
      'INTERNAL_ERROR',
      extractErrorMessage(error) || 'Failed to disconnect GMB account',
      500,
    )
  }
}

// Apply CSRF protection and strict rate limiting (10 requests per 5 minutes)
export const POST = withCSRF(withStrictRateLimit(disconnectHandler, 10, 300))
