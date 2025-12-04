/**
 * Supabase Vault Service
 *
 * Secure storage for sensitive data using Supabase Vault
 * All data is encrypted at rest automatically
 */

import { createClient } from '@/lib/supabase/server'
import { apiLogger } from '@/lib/utils/logger'

/**
 * Store a secret in Supabase Vault
 */
export async function storeSecret(
  name: string,
  secret: string,
  description?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // First, try to delete existing secret with same name
    try {
      await supabase.rpc('vault_delete_secret', {
        secret_name: name,
      })
    } catch {
      // Ignore error if secret doesn't exist
    }

    // Store new secret in vault (encrypted automatically)
    const { error } = await supabase.rpc('vault_create_secret', {
      name,
      secret,
      description: description || `Encrypted secret: ${name}`,
    })

    if (error) {
      // If vault is not enabled, fall back to regular storage with warning
      if (error.message.includes('vault') || error.message.includes('function')) {
        apiLogger.warn('Vault not enabled, using regular storage', { name })
        return {
          success: false,
          error: 'Vault not enabled. Please enable it in Supabase Dashboard.',
        }
      }
      throw error
    }

    apiLogger.info('Secret stored in vault', { name })
    return { success: true }
  } catch (error) {
    apiLogger.error(
      'Failed to store secret',
      error instanceof Error ? error : new Error(String(error)),
      { name },
    )
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to store secret',
    }
  }
}

/**
 * Retrieve a secret from Supabase Vault
 */
export async function getSecret(name: string): Promise<string | null> {
  try {
    const supabase = await createClient()

    // Retrieve from vault (decrypted automatically)
    const { data, error } = await supabase.rpc('vault_reveal_secret', {
      secret_name: name,
    })

    if (error) {
      // If vault is not enabled, return null
      if (error.message.includes('vault') || error.message.includes('function')) {
        apiLogger.warn('Vault not enabled, cannot retrieve secret', { name })
        return null
      }
      throw error
    }

    return data?.decrypted_secret || null
  } catch (error) {
    apiLogger.error(
      'Failed to retrieve secret',
      error instanceof Error ? error : new Error(String(error)),
      { name },
    )
    return null
  }
}

/**
 * Delete a secret from Supabase Vault
 */
export async function deleteSecret(name: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.rpc('vault_delete_secret', {
      secret_name: name,
    })

    if (error) {
      if (error.message.includes('vault') || error.message.includes('function')) {
        return {
          success: false,
          error: 'Vault not enabled',
        }
      }
      throw error
    }

    apiLogger.info('Secret deleted from vault', { name })
    return { success: true }
  } catch (error) {
    apiLogger.error(
      'Failed to delete secret',
      error instanceof Error ? error : new Error(String(error)),
      { name },
    )
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete secret',
    }
  }
}

/**
 * Store OAuth tokens securely
 */
export async function storeOAuthTokens(
  userId: string,
  accountId: string,
  accessToken: string,
  refreshToken: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Store access token
    const accessResult = await storeSecret(
      `oauth_access_${userId}_${accountId}`,
      accessToken,
      'OAuth access token',
    )

    if (!accessResult.success) {
      return accessResult
    }

    // Store refresh token
    const refreshResult = await storeSecret(
      `oauth_refresh_${userId}_${accountId}`,
      refreshToken,
      'OAuth refresh token',
    )

    return refreshResult
  } catch (error) {
    return {
      success: false,
      error: 'Failed to store OAuth tokens',
    }
  }
}

/**
 * Retrieve OAuth tokens
 */
export async function getOAuthTokens(
  userId: string,
  accountId: string,
): Promise<{ accessToken: string | null; refreshToken: string | null }> {
  const accessToken = await getSecret(`oauth_access_${userId}_${accountId}`)
  const refreshToken = await getSecret(`oauth_refresh_${userId}_${accountId}`)

  return { accessToken, refreshToken }
}

/**
 * Store API key securely
 */
export async function storeAPIKey(
  userId: string,
  service: string,
  apiKey: string,
): Promise<{ success: boolean; error?: string }> {
  return storeSecret(`api_key_${service}_${userId}`, apiKey, `API key for ${service}`)
}

/**
 * Retrieve API key
 */
export async function getAPIKey(userId: string, service: string): Promise<string | null> {
  return getSecret(`api_key_${service}_${userId}`)
}

/**
 * Check if Vault is enabled
 */
export async function isVaultEnabled(): Promise<boolean> {
  try {
    const supabase = await createClient()

    // Try to list secrets (will fail if vault not enabled)
    const { error } = await supabase.rpc('vault_list_secrets', {
      limit: 1,
    })

    if (error) {
      if (error.message.includes('vault') || error.message.includes('function')) {
        return false
      }
    }

    return true
  } catch {
    return false
  }
}

/**
 * Migrate existing tokens to Vault
 */
export async function migrateTokensToVault(): Promise<{
  migrated: number
  failed: number
  errors: string[]
}> {
  const supabase = await createClient()
  const results = {
    migrated: 0,
    failed: 0,
    errors: [] as string[],
  }

  try {
    // Check if vault is enabled
    const vaultEnabled = await isVaultEnabled()
    if (!vaultEnabled) {
      results.errors.push('Vault is not enabled. Please enable it in Supabase Dashboard.')
      return results
    }

    // Get all OAuth tokens from database
    const { data: tokens, error } = await supabase.from('oauth_tokens').select('*')

    if (error || !tokens) {
      results.errors.push('Failed to fetch tokens from database')
      return results
    }

    // Migrate each token
    for (const token of tokens) {
      try {
        if (token.access_token) {
          await storeSecret(
            `oauth_access_${token.user_id}_${token.account_id}`,
            token.access_token,
            'Migrated OAuth access token',
          )
        }

        if (token.refresh_token) {
          await storeSecret(
            `oauth_refresh_${token.user_id}_${token.account_id}`,
            token.refresh_token,
            'Migrated OAuth refresh token',
          )
        }

        // Update database to mark as encrypted
        await supabase
          .from('oauth_tokens')
          .update({
            access_token: 'VAULT_ENCRYPTED',
            refresh_token: 'VAULT_ENCRYPTED',
            is_encrypted: true,
          })
          .eq('id', token.id)

        results.migrated++
      } catch (error) {
        results.failed++
        results.errors.push(
          `Failed to migrate token ${token.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        )
      }
    }

    apiLogger.info('Token migration completed', results)
  } catch (error) {
    results.errors.push(
      `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }

  return results
}
