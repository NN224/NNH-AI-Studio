import { createClient } from '@supabase/supabase-js';
import { encryptToken, decryptToken, EncryptionError } from '../lib/security/encryption';

type NullableString = string | null | undefined;

interface GmbAccountRow {
  id: string;
  access_token: string | null;
  refresh_token: string | null;
  user_id: string;
}

const BATCH_SIZE = 100;

function needsEncryption(token: NullableString): token is string {
  if (!token) {
    return false;
  }

  try {
    decryptToken(token);
    return false;
  } catch (error) {
    if (error instanceof EncryptionError) {
      return true;
    }
    throw error;
  }
}

async function encryptAccountTokens(
  supabase: ReturnType<typeof createClient>,
  account: GmbAccountRow
) {
  const updates: Record<string, string | null> = {};
  const notes: string[] = [];

  if (needsEncryption(account.access_token)) {
    updates.access_token = encryptToken(account.access_token as string);
    notes.push('access_token');
  }

  if (needsEncryption(account.refresh_token)) {
    updates.refresh_token = encryptToken(account.refresh_token as string);
    notes.push('refresh_token');
  }

  if (!notes.length) {
    return { updated: false, accountId: account.id };
  }

  updates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('gmb_accounts')
    .update(updates)
    .eq('id', account.id);

  if (error) {
    throw new Error(`Failed to encrypt account ${account.id}: ${error.message}`);
  }

  return { updated: true, accountId: account.id, fields: notes };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  if (!process.env.ENCRYPTION_KEY) {
    console.error('❌ Missing ENCRYPTION_KEY for token encryption/decryption');
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('🔐 Starting token encryption migration...');

  let offset = 0;
  let processed = 0;
  let updated = 0;

  while (true) {
    const { data, error } = await supabase
      .from('gmb_accounts')
      .select('id, user_id, access_token, refresh_token')
      .order('id', { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      throw new Error(`Failed to fetch accounts: ${error.message}`);
    }

    const batch = data as GmbAccountRow[] | null;
    if (!batch || batch.length === 0) {
      break;
    }

    console.log(`➡️  Processing batch ${offset / BATCH_SIZE + 1}, ${batch.length} accounts`);

    for (const account of batch) {
      processed += 1;
      try {
        const result = await encryptAccountTokens(supabase, account);
        if (result.updated) {
          updated += 1;
          console.log(
            `✅ Account ${result.accountId}: encrypted ${result.fields?.join(', ')}`
          );
        }
      } catch (accountError) {
        console.error(
          `❌ Failed to process account ${account.id}:`,
          accountError instanceof Error ? accountError.message : accountError
        );
      }
    }

    offset += BATCH_SIZE;
  }

  console.log('🎉 Encryption migration complete');
  console.log(`   Accounts scanned: ${processed}`);
  console.log(`   Accounts updated: ${updated}`);
}

main().catch((error) => {
  console.error('❌ Unexpected error during encryption migration:', error);
  process.exit(1);
});

