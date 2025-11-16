import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { logAction } from '@/lib/monitoring/audit'

export const dynamic = 'force-dynamic'

// Schema for all settings
const settingsSchema = z.object({
  // General Settings
  businessName: z.string().optional().nullable(),
  primaryCategory: z.string().optional().nullable(),
  businessDescription: z.string().optional().nullable(),
  defaultReplyTemplate: z.string().optional().nullable(),
  timezone: z.string().optional().nullable(),
  language: z.string().optional().nullable(),
  syncSchedule: z.enum(['manual', 'hourly', 'daily', 'twice-daily', 'weekly']).optional(),
  autoPublish: z.boolean().optional(),

  // AI & Automation Settings
  autoReply: z.boolean().optional(),
  aiResponseTone: z.enum(['professional', 'friendly', 'casual', 'formal', 'empathetic']).optional(),
  responseLength: z.enum(['brief', 'medium', 'detailed']).optional(),
  creativityLevel: z.enum(['low', 'medium', 'high']).optional(),

  // Notifications Settings
  reviewNotifications: z.boolean().optional(),
  emailDigest: z.enum(['realtime', 'daily', 'weekly', 'monthly', 'never']).optional(),
  emailDeliveryTime: z.string().optional().nullable(),
  negativePriority: z.boolean().optional(),
  replyReminders: z.boolean().optional(),
  browserNotifications: z.boolean().optional(),
  soundAlerts: z.boolean().optional(),
  quietHours: z.boolean().optional(),
  quietHoursStart: z.string().optional().nullable(),
  quietHoursEnd: z.string().optional().nullable(),
  notifyReviews: z.boolean().optional(),
  notifyQuestions: z.boolean().optional(),
  notifyMessages: z.boolean().optional(),
  notifyMentions: z.boolean().optional(),
  notifyInsights: z.boolean().optional(),
  notifyTips: z.boolean().optional(),

  // Data Management Settings
  retentionDays: z.number().int().min(0).max(365).optional(),
  deleteOnDisconnect: z.boolean().optional(),
})

type SettingsPayload = z.infer<typeof settingsSchema>

/**
 * GET /api/settings
 * Retrieve all settings for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get active GMB account settings
    const { data: accounts, error: accountsError } = await supabase
      .from('gmb_accounts')
      .select('id, settings, data_retention_days, delete_on_disconnect')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)

    if (accountsError) {
      console.error('[Settings API] Failed to fetch accounts:', accountsError)
      await logAction('settings_view', 'settings', 'global', {
        status: 'failed',
        error: accountsError.message,
      })
      return NextResponse.json(
        { error: 'Failed to load settings' },
        { status: 500 }
      )
    }

    const account = accounts?.[0]
    const accountSettings = (account?.settings as Record<string, any>) || {}

    // Get client profile (branding) - use profiles table instead
    let profile = null;
    try {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle()
      
      // Ignore PGRST116 error (no rows found) - this is expected for new users
      // Ignore PGRST205 error (table not found) - client_profiles was deleted
      if (profileError && profileError.code !== 'PGRST116' && profileError.code !== 'PGRST205') {
        console.error('[Settings API] Failed to fetch client profile:', profileError)
        await logAction('settings_view', 'settings', 'global', {
          status: 'partial',
          warning: 'client_profile_fetch_failed',
          error: profileError.message,
        })
      } else {
        profile = data;
      }
    } catch (error) {
      // Table doesn't exist, skip it
      console.log('[Settings API] Profiles table not available, skipping...');
    }

    // Combine all settings
    const allSettings = {
      // General Settings
      businessName: (profile as any)?.full_name || accountSettings.businessName || null,
      primaryCategory: accountSettings.primaryCategory || null,
      businessDescription: accountSettings.businessDescription || null,
      defaultReplyTemplate: accountSettings.defaultReplyTemplate || null,
      timezone: accountSettings.timezone || 'utc',
      language: accountSettings.language || 'en',
      syncSchedule: accountSettings.syncSchedule || 'manual',
      autoPublish: accountSettings.autoPublish || false,

      // AI & Automation
      autoReply: accountSettings.autoReply || false,
      aiResponseTone: accountSettings.aiResponseTone || 'professional',
      responseLength: accountSettings.responseLength || 'medium',
      creativityLevel: accountSettings.creativityLevel || 'medium',

      // Notifications
      reviewNotifications: accountSettings.reviewNotifications !== false,
      emailDigest: accountSettings.emailDigest || 'daily',
      emailDeliveryTime: accountSettings.emailDeliveryTime || '09:00',
      negativePriority: accountSettings.negativePriority !== false,
      replyReminders: accountSettings.replyReminders !== false,
      browserNotifications: accountSettings.browserNotifications || false,
      soundAlerts: accountSettings.soundAlerts || false,
      quietHours: accountSettings.quietHours || false,
      quietHoursStart: accountSettings.quietHoursStart || '22:00',
      quietHoursEnd: accountSettings.quietHoursEnd || '08:00',
      notifyReviews: accountSettings.notifyReviews !== false,
      notifyQuestions: accountSettings.notifyQuestions !== false,
      notifyMessages: accountSettings.notifyMessages !== false,
      notifyMentions: accountSettings.notifyMentions || false,
      notifyInsights: accountSettings.notifyInsights !== false,
      notifyTips: accountSettings.notifyTips || false,

      // Data Management
      retentionDays: account?.data_retention_days || 30,
      deleteOnDisconnect: account?.delete_on_disconnect || false,

      // Branding (from profiles)
      branding: {
        brandName: (profile as any)?.full_name || null,
        primaryColor: '#FFA500',
        secondaryColor: '#1A1A1A',
        logoUrl: (profile as any)?.avatar_url || null,
        coverImageUrl: null,
      },
    }

    await logAction('settings_view', 'settings', 'global', {
      status: 'success',
    })
    return NextResponse.json({ settings: allSettings })
  } catch (error) {
    console.error('[Settings API] Unexpected error:', error)
    await logAction('settings_view', 'settings', 'global', {
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { error: 'Unexpected error while loading settings' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/settings
 * Update all settings for the authenticated user
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      await logAction('settings_update', 'settings', 'global', {
        status: 'failed',
        error: authError?.message || 'Unauthorized',
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = settingsSchema.partial().safeParse(body)

    if (!parsed.success) {
      await logAction('settings_update', 'settings', 'global', {
        status: 'failed',
        error: 'Invalid settings payload',
        details: parsed.error.flatten(),
      })
      return NextResponse.json(
        { error: 'Invalid settings data', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const settings = parsed.data

    // Get active GMB accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('gmb_accounts')
      .select('id, settings')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (accountsError) {
      console.error('[Settings API] Failed to fetch accounts:', accountsError)
      await logAction('settings_update', 'settings', 'global', {
        status: 'failed',
        error: accountsError.message,
      })
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 }
      )
    }

    if (!accounts || accounts.length === 0) {
      await logAction('settings_update', 'settings', 'global', {
        status: 'failed',
        error: 'No active GMB account found',
      })
      return NextResponse.json(
        { error: 'No active GMB account found' },
        { status: 400 }
      )
    }

    // Separate settings by storage location
    const {
      businessName,
      retentionDays,
      deleteOnDisconnect,
      branding,
      ...accountSettings
    } = settings as SettingsPayload & { branding?: any }

    // Update gmb_accounts.settings (JSONB)
    const updatedAccountSettings = {
      ...(accounts[0].settings as Record<string, any> || {}),
      ...accountSettings,
      updatedAt: new Date().toISOString(),
    }

    // Update all active accounts
    for (const account of accounts) {
      const updateData: any = {
        settings: updatedAccountSettings,
        updated_at: new Date().toISOString(),
      }

      // Update data retention settings if provided
      if (retentionDays !== undefined) {
        updateData.data_retention_days = retentionDays
      }
      if (deleteOnDisconnect !== undefined) {
        updateData.delete_on_disconnect = deleteOnDisconnect
      }

      const { error: updateError } = await supabase
        .from('gmb_accounts')
        .update(updateData)
        .eq('id', account.id)
        .eq('user_id', user.id)

      if (updateError) {
        console.error('[Settings API] Failed to update account:', updateError)
        await logAction('settings_update', 'settings', account.id, {
          status: 'failed',
          error: updateError.message,
        })
        return NextResponse.json(
          { error: 'Failed to update settings' },
          { status: 500 }
        )
      }
    }

    // Update client_profiles if branding or businessName is provided
    if (businessName !== undefined || branding) {
      const { data: existingProfile, error: profileFetchError } = await supabase
        .from('client_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      
      // Ignore PGRST116 error (no rows found) - this is expected for new users
      if (profileFetchError && profileFetchError.code !== 'PGRST116') {
        console.error('[Settings API] Failed to fetch existing profile:', profileFetchError)
      }

      const profileData: any = {}
      if (businessName !== undefined) {
        profileData.brand_name = businessName
      }
      if (branding) {
        if (branding.brandName !== undefined) profileData.brand_name = branding.brandName
        if (branding.primaryColor !== undefined) profileData.primary_color = branding.primaryColor
        if (branding.secondaryColor !== undefined) profileData.secondary_color = branding.secondaryColor
        if (branding.logoUrl !== undefined) profileData.logo_url = branding.logoUrl
        if (branding.coverImageUrl !== undefined) profileData.cover_image_url = branding.coverImageUrl
      }

      if (Object.keys(profileData).length > 0) {
        if (existingProfile) {
          const { error: profileError } = await supabase
            .from('client_profiles')
            .update(profileData)
            .eq('user_id', user.id)

          if (profileError) {
            console.error('[Settings API] Failed to update profile:', profileError)
            await logAction('settings_update', 'settings', 'branding', {
              status: 'failed',
              error: profileError.message,
            })
            // Don't fail the whole request if profile update fails
          }
        } else {
          const { error: profileError } = await supabase
            .from('client_profiles')
            .insert([{ user_id: user.id, ...profileData }])

          if (profileError) {
            console.error('[Settings API] Failed to create profile:', profileError)
            await logAction('settings_update', 'settings', 'branding', {
              status: 'failed',
              error: profileError.message,
            })
            // Don't fail the whole request if profile creation fails
          }
        }
      }
    }

    const changedKeys = Object.keys(settings)
    await logAction('settings_update', 'settings', 'global', {
      status: 'success',
      changed_keys: changedKeys,
      retention_days: settings.retentionDays,
      delete_on_disconnect: settings.deleteOnDisconnect,
    })

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
    })
  } catch (error) {
    console.error('[Settings API] Unexpected error:', error)
    await logAction('settings_update', 'settings', 'global', {
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { error: 'Unexpected error while updating settings' },
      { status: 500 }
    )
  }
}

