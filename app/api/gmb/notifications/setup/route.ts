import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getValidAccessToken } from '@/lib/gmb/helpers'
import { ApiError, errorResponse, successResponse } from '@/utils/api-error'

export const dynamic = 'force-dynamic'

const NOTIFICATIONS_API_BASE = 'https://mybusinessnotifications.googleapis.com/v1'

/**
 * GET - Fetch current notification settings
 * Returns the Pub/Sub notification settings for the GMB account
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return errorResponse(new ApiError('Authentication required', 401))
    }

    // Get active GMB account
    const { data: account, error: accountError } = await supabase
      .from('gmb_accounts')
      .select('id, account_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (accountError) {
      console.error('[Notifications Setup API] Failed to load GMB account:', accountError)
      return errorResponse(new ApiError('Failed to load GMB account', 500, accountError))
    }

    if (!account) {
      return errorResponse(new ApiError('No active GMB account found', 404))
    }

    const accessToken = await getValidAccessToken(supabase, account.id)

    // Get current notification settings from Google
    const url = `${NOTIFICATIONS_API_BASE}/accounts/${account.account_id}/notificationSetting`

    console.log('[Notifications Setup API] Fetching settings from:', url)

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      let errorData: any = {}
      try {
        errorData = errorText ? JSON.parse(errorText) : {}
      } catch {
        errorData = { message: errorText }
      }

      console.error('[Notifications Setup API] Error response:', {
        status: response.status,
        errorData,
      })

      if (response.status === 401) {
        return errorResponse(
          new ApiError(
            'Authentication expired. Please reconnect your Google account.',
            401,
            errorData
          )
        )
      }

      if (response.status === 404) {
        // No settings configured yet - return empty settings
        return successResponse({
          name: `accounts/${account.account_id}/notificationSetting`,
          pubsubTopic: '',
          notificationTypes: [],
        })
      }

      return errorResponse(
        new ApiError(
          errorData.error?.message || errorData.message || 'Failed to fetch notification settings',
          response.status,
          errorData
        )
      )
    }

    const settings = await response.json()

    console.log('[Notifications Setup API] Successfully fetched settings')

    return successResponse(settings)
  } catch (error: any) {
    console.error('[Notifications Setup API] Error:', {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      error,
    })

    return errorResponse(
      new ApiError(
        error?.message || 'Failed to fetch notification settings',
        500
      )
    )
  }
}

/**
 * PATCH - Update notification settings
 * Configures the Pub/Sub topic and notification types for the GMB account
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return errorResponse(new ApiError('Authentication required', 401))
    }

    const body = await request.json()
    const { pubsubTopic, notificationTypes } = body

    // Validate input
    if (!Array.isArray(notificationTypes)) {
      return errorResponse(new ApiError('notificationTypes must be an array', 400))
    }

    // Get active GMB account
    const { data: account, error: accountError } = await supabase
      .from('gmb_accounts')
      .select('id, account_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (accountError) {
      console.error('[Notifications Setup API] Failed to load GMB account:', accountError)
      return errorResponse(new ApiError('Failed to load GMB account', 500, accountError))
    }

    if (!account) {
      return errorResponse(new ApiError('No active GMB account found', 404))
    }

    const accessToken = await getValidAccessToken(supabase, account.id)

    // Update notification settings in Google
    const url = `${NOTIFICATIONS_API_BASE}/accounts/${account.account_id}/notificationSetting?updateMask=pubsubTopic,notificationTypes`

    const requestBody = {
      name: `accounts/${account.account_id}/notificationSetting`,
      pubsubTopic: pubsubTopic || '',
      notificationTypes: notificationTypes || [],
    }

    console.log('[Notifications Setup API] Updating settings:', {
      url,
      body: requestBody,
    })

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      let errorData: any = {}
      try {
        errorData = errorText ? JSON.parse(errorText) : {}
      } catch {
        errorData = { message: errorText }
      }

      console.error('[Notifications Setup API] Error response:', {
        status: response.status,
        errorData,
      })

      if (response.status === 401) {
        return errorResponse(
          new ApiError(
            'Authentication expired. Please reconnect your Google account.',
            401,
            errorData
          )
        )
      }

      return errorResponse(
        new ApiError(
          errorData.error?.message || errorData.message || 'Failed to update notification settings',
          response.status,
          errorData
        )
      )
    }

    const settings = await response.json()

    console.log('[Notifications Setup API] Successfully updated settings')

    // Store settings in database for reference
    await supabase
      .from('gmb_accounts')
      .update({
        notification_settings: settings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', account.id)

    return successResponse(settings)
  } catch (error: any) {
    console.error('[Notifications Setup API] Error:', {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      error,
    })

    return errorResponse(
      new ApiError(
        error?.message || 'Failed to update notification settings',
        500
      )
    )
  }
}

