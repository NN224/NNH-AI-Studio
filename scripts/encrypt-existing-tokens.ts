/**
 * Token Encryption Migration Script
 *
 * This script encrypts any plaintext tokens in the gmb_accounts table.
 *
 * ⚠️ IMPORTANT: Only run this if you have plaintext tokens in your database.
 * This system was designed to store encrypted tokens from the start.
 *
 * Usage:
 *   npx tsx scripts/encrypt-existing-tokens.ts [--dry-run] [--force]
 *
 * Options:
 *   --dry-run  Show what would be encrypted without making changes
 *   --force    Skip confirmation prompt
 *
 * Example:
 *   npx tsx scripts/encrypt-existing-tokens.ts --dry-run
 *   npx tsx scripts/encrypt-existing-tokens.ts --force
 */

import { createClient } from '@supabase/supabase-js';
import { encryptToken, decryptToken, EncryptionError } from '../lib/security/encryption';
import * as readline from 'readline';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

interface MigrationStats {
  total: number;
  alreadyEncrypted: number;
  encrypted: number;
  failed: number;
  skipped: number;
}

async function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question + ' (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function migrateTokens(dryRun: boolean = false, force: boolean = false) {
  log('\n🔐 Token Encryption Migration Script', 'cyan');
  log('=====================================\n', 'cyan');

  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!supabaseUrl || !supabaseKey) {
    log('❌ ERROR: Missing Supabase credentials', 'red');
    log('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY', 'yellow');
    process.exit(1);
  }

  if (!encryptionKey) {
    log('❌ ERROR: Missing ENCRYPTION_KEY environment variable', 'red');
    process.exit(1);
  }

  log(`📊 Configuration:`, 'blue');
  log(`   Supabase URL: ${supabaseUrl}`, 'reset');
  log(`   Dry Run: ${dryRun ? 'YES (no changes will be made)' : 'NO (will modify database)'}`, dryRun ? 'yellow' : 'red');
  log(`   Force: ${force ? 'YES' : 'NO'}\n`, 'reset');

  if (!dryRun && !force) {
    const confirmed = await askConfirmation(
      '\n⚠️  This will modify your database. Continue?'
    );
    if (!confirmed) {
      log('\n❌ Migration cancelled by user', 'yellow');
      process.exit(0);
    }
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  log('\n📥 Fetching GMB accounts...', 'blue');

  const { data: accounts, error } = await supabase
    .from('gmb_accounts')
    .select('id, user_id, account_name, access_token, refresh_token, is_active');

  if (error) {
    log(`\n❌ ERROR fetching accounts: ${error.message}`, 'red');
    process.exit(1);
  }

  if (!accounts || accounts.length === 0) {
    log('\n✅ No accounts found in database', 'yellow');
    process.exit(0);
  }

  log(`✅ Found ${accounts.length} accounts\n`, 'green');

  const stats: MigrationStats = {
    total: accounts.length,
    alreadyEncrypted: 0,
    encrypted: 0,
    failed: 0,
    skipped: 0,
  };

  for (const account of accounts) {
    const accountLabel = `Account ${account.id.substring(0, 8)}... (${account.account_name || 'unnamed'})`;
    log(`\n📝 Processing: ${accountLabel}`, 'cyan');

    // Process access_token
    if (!account.access_token) {
      log('   ⏭️  Access Token: Missing - skipping', 'yellow');
      stats.skipped++;
    } else {
      try {
        // Try to decrypt - if successful, already encrypted
        decryptToken(account.access_token);
        log('   ✅ Access Token: Already encrypted', 'green');
        stats.alreadyEncrypted++;
      } catch (error) {
        // Decryption failed - might be plaintext
        if (error instanceof EncryptionError) {
          log('   🔓 Access Token: Appears to be plaintext', 'yellow');

          if (!dryRun) {
            try {
              const encrypted = encryptToken(account.access_token);

              const { error: updateError } = await supabase
                .from('gmb_accounts')
                .update({
                  access_token: encrypted,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', account.id);

              if (updateError) {
                throw new Error(`Database update failed: ${updateError.message}`);
              }

              log('   ✅ Access Token: Encrypted successfully', 'green');
              stats.encrypted++;
            } catch (encryptError) {
              log(`   ❌ Access Token: Encryption failed - ${encryptError}`, 'red');
              stats.failed++;
            }
          } else {
            log('   🔨 Access Token: Would be encrypted (dry-run)', 'blue');
            stats.encrypted++;
          }
        } else {
          log(`   ❌ Access Token: Unexpected error - ${error}`, 'red');
          stats.failed++;
        }
      }
    }

    // Process refresh_token
    if (!account.refresh_token) {
      log('   ⏭️  Refresh Token: Missing - skipping', 'yellow');
      stats.skipped++;
    } else {
      try {
        // Try to decrypt - if successful, already encrypted
        decryptToken(account.refresh_token);
        log('   ✅ Refresh Token: Already encrypted', 'green');
      } catch (error) {
        // Decryption failed - might be plaintext
        if (error instanceof EncryptionError) {
          log('   🔓 Refresh Token: Appears to be plaintext', 'yellow');

          if (!dryRun) {
            try {
              const encrypted = encryptToken(account.refresh_token);

              const { error: updateError } = await supabase
                .from('gmb_accounts')
                .update({
                  refresh_token: encrypted,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', account.id);

              if (updateError) {
                throw new Error(`Database update failed: ${updateError.message}`);
              }

              log('   ✅ Refresh Token: Encrypted successfully', 'green');
            } catch (encryptError) {
              log(`   ❌ Refresh Token: Encryption failed - ${encryptError}`, 'red');
              stats.failed++;
            }
          } else {
            log('   🔨 Refresh Token: Would be encrypted (dry-run)', 'blue');
          }
        } else {
          log(`   ❌ Refresh Token: Unexpected error - ${error}`, 'red');
          stats.failed++;
        }
      }
    }
  }

  // Print summary
  log('\n\n📊 Migration Summary', 'cyan');
  log('===================', 'cyan');
  log(`Total Accounts:       ${stats.total}`, 'reset');
  log(`Already Encrypted:    ${stats.alreadyEncrypted}`, 'green');
  log(`Newly Encrypted:      ${stats.encrypted}`, stats.encrypted > 0 ? 'green' : 'reset');
  log(`Failed:               ${stats.failed}`, stats.failed > 0 ? 'red' : 'reset');
  log(`Skipped (null):       ${stats.skipped}`, 'yellow');

  if (dryRun) {
    log('\n⚠️  This was a DRY RUN - no changes were made', 'yellow');
    log('   Run without --dry-run to apply changes', 'yellow');
  } else if (stats.encrypted > 0) {
    log('\n✅ Migration completed successfully!', 'green');
  } else if (stats.alreadyEncrypted === stats.total - stats.skipped) {
    log('\n✅ All tokens are already encrypted!', 'green');
  }

  if (stats.failed > 0) {
    log('\n⚠️  Some tokens failed to encrypt. Please review the errors above.', 'red');
    process.exit(1);
  }

  log('');
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');

// Run migration
migrateTokens(dryRun, force)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    log(`\n❌ FATAL ERROR: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });
