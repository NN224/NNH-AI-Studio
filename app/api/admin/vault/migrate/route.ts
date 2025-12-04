/**
 * Admin API to migrate tokens to Vault
 *
 * SECURITY: Admin-only endpoint
 */

import { isCurrentUserAdmin } from '@/lib/auth/admin-check'
import { isVaultEnabled, migrateTokensToVault } from '@/lib/services/vault-service'
import { NextResponse } from 'next/server'

export async function POST() {
  // Check admin access
  const { isAdmin, error } = await isCurrentUserAdmin()

  if (error || !isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  // Check if vault is enabled
  const vaultEnabled = await isVaultEnabled()

  if (!vaultEnabled) {
    return NextResponse.json(
      {
        error: 'Vault is not enabled',
        instructions: [
          '1. Go to Supabase Dashboard',
          '2. Navigate to Settings → Vault',
          '3. Enable Vault',
          '4. Run the migration: supabase db push',
          '5. Try this endpoint again',
        ],
      },
      { status: 400 },
    )
  }

  // Perform migration
  const results = await migrateTokensToVault()

  return NextResponse.json({
    success: true,
    message: `Migration completed: ${results.migrated} tokens migrated, ${results.failed} failed`,
    details: results,
  })
}

export async function GET() {
  // Check admin access
  const { isAdmin, error } = await isCurrentUserAdmin()

  if (error || !isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  // Check vault status
  const vaultEnabled = await isVaultEnabled()

  return NextResponse.json({
    vaultEnabled,
    message: vaultEnabled
      ? 'Vault is enabled and ready'
      : 'Vault is not enabled. Please enable it in Supabase Dashboard.',
    nextSteps: !vaultEnabled
      ? [
          '1. Go to Supabase Dashboard',
          '2. Navigate to Settings → Vault',
          '3. Enable Vault',
          '4. Run migration: supabase db push',
        ]
      : [],
  })
}
