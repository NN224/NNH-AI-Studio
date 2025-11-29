// OAuth Service - Handles token refresh and OAuth operations
import { refreshAccessToken as refreshGoogleAccessToken } from '@/lib/gmb/helpers'
import { encryptToken, resolveTokenValue } from '@/lib/security/encryption'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RefreshTokenActionResult, TokenRefreshResult } from '../types'
import { DashboardServiceError, handleSupabaseError } from '../utils/error-handler'

export class OAuthService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Refresh access token for a GMB account
   */
  async refreshAccessToken(
    accountId: string,
    userId: string,
    forceRefresh: boolean = false,
  ): Promise<TokenRefreshResult> {
    try {
      // Get account details
      const { data: account, error: accountError } = await this.supabase
        .from('gmb_accounts')
        .select('access_token, refresh_token, token_expires_at')
        .eq('id', accountId)
        .eq('user_id', userId)
        .single()

      if (accountError) {
        handleSupabaseError(accountError, 'refreshAccessToken-getAccount')
      }

      if (!account) {
        throw new DashboardServiceError('GMB account not found', 'ACCOUNT_NOT_FOUND', {
          accountId,
          userId,
        })
      }

      // Check if refresh is needed
      if (!forceRefresh && this.isTokenValid(account.token_expires_at)) {
        return {
          access_token: resolveTokenValue(account.access_token, { context: 'refresh_check' }),
          expires_in: this.getTokenExpirySeconds(account.token_expires_at),
        }
      }

      // Decrypt refresh token
      const refreshToken = resolveTokenValue(account.refresh_token, {
        context: 'token_refresh',
      })

      if (!refreshToken) {
        throw new DashboardServiceError('Invalid refresh token', 'INVALID_REFRESH_TOKEN', {
          accountId,
        })
      }

      // Refresh token with Google
      const refreshResult = await refreshGoogleAccessToken(refreshToken)

      // Encrypt new tokens
      const encryptedAccessToken = encryptToken(refreshResult.access_token)
      const encryptedRefreshToken = refreshResult.refresh_token
        ? encryptToken(refreshResult.refresh_token)
        : account.refresh_token // Keep existing if not rotated

      // Calculate expiry time
      const expiresAt = new Date(Date.now() + refreshResult.expires_in * 1000).toISOString()

      // Update database
      const { error: updateError } = await this.supabase
        .from('gmb_accounts')
        .update({
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          token_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', accountId)
        .eq('user_id', userId)

      if (updateError) {
        handleSupabaseError(updateError, 'refreshAccessToken-update')
      }

      return {
        access_token: refreshResult.access_token,
        expires_in: refreshResult.expires_in,
        refresh_token: refreshResult.refresh_token,
      }
    } catch (error) {
      handleSupabaseError(error, 'OAuthService.refreshAccessToken')
    }
  }

  /**
   * Get valid access token (refresh if needed)
   */
  async getValidAccessToken(accountId: string, userId: string): Promise<string> {
    try {
      const tokenResult = await this.refreshAccessToken(accountId, userId, false)
      return tokenResult.access_token
    } catch (error) {
      handleSupabaseError(error, 'OAuthService.getValidAccessToken')
    }
  }

  /**
   * Check if all user accounts have valid tokens
   */
  async validateAllUserTokens(userId: string): Promise<{
    valid: number
    expired: number
    invalid: number
  }> {
    try {
      const { data: accounts, error } = await this.supabase
        .from('gmb_accounts')
        .select('id, token_expires_at, access_token, refresh_token')
        .eq('user_id', userId)
        .eq('is_active', true)

      if (error) {
        handleSupabaseError(error, 'validateAllUserTokens')
      }

      let valid = 0
      let expired = 0
      let invalid = 0

      for (const account of accounts || []) {
        if (!account.access_token || !account.refresh_token) {
          invalid++
          continue
        }

        if (this.isTokenValid(account.token_expires_at)) {
          valid++
        } else {
          expired++
        }
      }

      return { valid, expired, invalid }
    } catch (error) {
      handleSupabaseError(error, 'OAuthService.validateAllUserTokens')
    }
  }

  /**
   * Refresh tokens for all expired accounts
   */
  async refreshAllExpiredTokens(userId: string): Promise<RefreshTokenActionResult[]> {
    try {
      const { data: accounts, error } = await this.supabase
        .from('gmb_accounts')
        .select('id, token_expires_at')
        .eq('user_id', userId)
        .eq('is_active', true)

      if (error) {
        handleSupabaseError(error, 'refreshAllExpiredTokens')
      }

      const results: RefreshTokenActionResult[] = []

      for (const account of accounts || []) {
        if (!this.isTokenValid(account.token_expires_at)) {
          try {
            const refreshResult = await this.refreshAccessToken(account.id, userId, true)
            results.push({
              success: true,
              message: `Token refreshed for account ${account.id}`,
              newToken: refreshResult.access_token,
              expiresAt: new Date(Date.now() + refreshResult.expires_in * 1000).toISOString(),
            })
          } catch (refreshError) {
            results.push({
              success: false,
              message: `Failed to refresh token for account ${account.id}: ${
                refreshError instanceof Error ? refreshError.message : 'Unknown error'
              }`,
            })
          }
        }
      }

      return results
    } catch (error) {
      handleSupabaseError(error, 'OAuthService.refreshAllExpiredTokens')
    }
  }

  /**
   * Check if token is still valid (with 5-minute buffer)
   */
  private isTokenValid(expiresAt: string | null): boolean {
    if (!expiresAt) return false

    const expiryTime = new Date(expiresAt).getTime()
    const now = Date.now()
    const bufferMs = 5 * 60 * 1000 // 5 minutes buffer

    return expiryTime > now + bufferMs
  }

  /**
   * Get seconds until token expires
   */
  private getTokenExpirySeconds(expiresAt: string | null): number {
    if (!expiresAt) return 0

    const expiryTime = new Date(expiresAt).getTime()
    const now = Date.now()

    return Math.max(0, Math.floor((expiryTime - now) / 1000))
  }
}
