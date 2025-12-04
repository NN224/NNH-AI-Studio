/**
 * Admin/Owner access control utilities
 */

import { createClient } from '@/lib/supabase/server'

/**
 * Get admin emails from environment variable
 * Format: ADMIN_EMAILS="email1@example.com,email2@example.com"
 */
function getAdminEmails(): string[] {
  const envAdmins = process.env.ADMIN_EMAILS || process.env.NEXT_PRIVATE_ADMIN_EMAILS

  if (envAdmins) {
    return envAdmins.split(',').map((email) => email.trim().toLowerCase())
  }

  // Fallback for development only
  if (process.env.NODE_ENV === 'development') {
    console.warn('ADMIN_EMAILS not configured, using development defaults')
    return ['admin@localhost']
  }

  // No admins configured in production
  return []
}

/**
 * Check if the current user is an admin/owner
 */
export async function isCurrentUserAdmin(): Promise<{
  isAdmin: boolean
  user: { id: string; email?: string } | null
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return {
        isAdmin: false,
        user: null,
        error: 'User not authenticated',
      }
    }

    // Check if user email is in admin list
    const adminEmails = getAdminEmails()
    const isAdmin = adminEmails.includes(user.email?.toLowerCase() || '')

    return {
      isAdmin,
      user,
    }
  } catch (error) {
    return {
      isAdmin: false,
      user: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Middleware helper to check admin access
 */
export async function requireAdmin() {
  const { isAdmin, user, error } = await isCurrentUserAdmin()

  if (error || !user) {
    return Response.json(
      {
        success: false,
        error: 'Authentication required',
      },
      { status: 401 },
    )
  }

  if (!isAdmin) {
    return Response.json(
      {
        success: false,
        error: 'Admin access required',
      },
      { status: 403 },
    )
  }

  return null // No error, user is admin
}
