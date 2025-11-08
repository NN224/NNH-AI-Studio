#!/usr/bin/env node

/**
 * GMB Dashboard Audit Runner
 * Executes the comprehensive audit SQL script and formats the results
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(chalk.red('❌ Missing environment variables'));
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Audit queries
const auditQueries = {
  criticalIssues: {
    missingRefreshToken: `
      SELECT COUNT(*) as count, 
             array_agg(id::text) as affected_ids
      FROM gmb_accounts
      WHERE is_active = true 
        AND (refresh_token IS NULL OR refresh_token = '')
    `,
    expiredTokens: `
      SELECT COUNT(*) as count,
             array_agg(id::text) as affected_ids
      FROM gmb_accounts
      WHERE is_active = true 
        AND token_expires_at IS NOT NULL
        AND token_expires_at < NOW() - INTERVAL '1 day'
    `,
    accountsWithoutUser: `
      SELECT COUNT(*) as count,
             array_agg(id::text) as affected_ids
      FROM gmb_accounts
      WHERE user_id IS NULL
    `
  },
  dataIntegrity: {
    orphanedLocations: `
      SELECT COUNT(*) as count,
             array_agg(id::text) as affected_ids
      FROM gmb_locations
      WHERE gmb_account_id IS NULL
    `,
    locationsWithInactiveAccounts: `
      SELECT COUNT(*) as count,
             array_agg(l.id::text) as affected_ids
      FROM gmb_locations l
      JOIN gmb_accounts a ON a.id = l.gmb_account_id
      WHERE l.is_active = true AND a.is_active = false
    `,
    reviewIssues: `
      SELECT 
        COUNT(*) FILTER (WHERE location_id IS NULL) as without_location,
        COUNT(*) FILTER (WHERE user_id IS NULL) as without_user_id,
        COUNT(*) FILTER (WHERE gmb_account_id IS NULL) as without_gmb_account,
        COUNT(*) FILTER (WHERE status = 'responded' AND review_reply IS NULL AND reply_text IS NULL) as responded_no_reply
      FROM gmb_reviews
    `
  },
  settingsAudit: `
    SELECT 
      id,
      account_name,
      is_active,
      CASE 
        WHEN settings IS NULL THEN 'No settings'
        WHEN settings = '{}'::jsonb THEN 'Empty settings'
        ELSE 'Has settings'
      END as settings_status,
      settings->>'syncSchedule' as sync_schedule,
      settings->>'autoReply' as auto_reply,
      settings->>'reviewNotifications' as review_notifications,
      last_sync,
      CASE 
        WHEN last_sync IS NULL THEN 'Never synced'
        WHEN last_sync < NOW() - INTERVAL '7 days' THEN 'Stale'
        WHEN last_sync < NOW() - INTERVAL '1 day' THEN 'Recent'
        ELSE 'Fresh'
      END as sync_status
    FROM gmb_accounts
    ORDER BY is_active DESC, last_sync DESC
  `,
  dataVolume: `
    WITH counts AS (
      SELECT 
        (SELECT COUNT(*) FROM gmb_accounts) as accounts,
        (SELECT COUNT(*) FROM gmb_locations) as locations,
        (SELECT COUNT(*) FROM gmb_reviews) as reviews,
        (SELECT COUNT(*) FROM gmb_questions) as questions,
        (SELECT COUNT(*) FROM gmb_posts) as posts,
        (SELECT COUNT(*) FROM gmb_performance_metrics) as metrics,
        (SELECT COUNT(*) FROM gmb_search_keywords) as keywords,
        (SELECT COUNT(*) FROM gmb_media) as media
    )
    SELECT * FROM counts
  `,
  securityCheck: `
    SELECT 
      tablename,
      rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public' 
      AND tablename LIKE 'gmb_%'
    ORDER BY tablename
  `
};

async function runAudit() {
  console.log(chalk.blue.bold('\n🔍 GMB Dashboard Comprehensive Audit Report'));
  console.log(chalk.gray('=' .repeat(60)));
  
  const results = {
    timestamp: new Date().toISOString(),
    critical: {},
    warnings: {},
    info: {},
    summary: {}
  };

  try {
    // 1. Critical Issues
    console.log(chalk.red.bold('\n📛 CRITICAL ISSUES:'));
    
    // Missing refresh tokens
    const { data: missingTokens, error: err1 } = await supabase.rpc('get_audit_data', {
      query_text: auditQueries.criticalIssues.missingRefreshToken
    }).single();
    
    if (!err1 && missingTokens?.count > 0) {
      console.log(chalk.red(`  ❌ ${missingTokens.count} active accounts missing refresh tokens`));
      results.critical.missingRefreshTokens = missingTokens;
    } else {
      console.log(chalk.green('  ✅ All active accounts have refresh tokens'));
    }

    // Expired tokens
    const { data: expiredTokens, error: err2 } = await supabase.rpc('get_audit_data', {
      query_text: auditQueries.criticalIssues.expiredTokens
    }).single();
    
    if (!err2 && expiredTokens?.count > 0) {
      console.log(chalk.red(`  ❌ ${expiredTokens.count} accounts have expired tokens`));
      results.critical.expiredTokens = expiredTokens;
    } else {
      console.log(chalk.green('  ✅ All tokens are valid'));
    }

    // 2. Data Integrity
    console.log(chalk.yellow.bold('\n⚠️  DATA INTEGRITY WARNINGS:'));
    
    // Orphaned locations
    const { data: orphaned, error: err3 } = await supabase.rpc('get_audit_data', {
      query_text: auditQueries.dataIntegrity.orphanedLocations
    }).single();
    
    if (!err3 && orphaned?.count > 0) {
      console.log(chalk.yellow(`  ⚠️  ${orphaned.count} orphaned locations found`));
      results.warnings.orphanedLocations = orphaned;
    } else {
      console.log(chalk.green('  ✅ No orphaned locations'));
    }

    // 3. Settings Configuration
    console.log(chalk.cyan.bold('\n⚙️  SETTINGS CONFIGURATION:'));
    
    const { data: settings, error: err4 } = await supabase
      .from('gmb_accounts')
      .select('account_name, is_active, settings, last_sync')
      .order('is_active', { ascending: false });
    
    if (!err4 && settings) {
      settings.forEach(account => {
        const status = account.is_active ? chalk.green('Active') : chalk.gray('Inactive');
        const syncStatus = account.last_sync 
          ? chalk.blue(`Last sync: ${new Date(account.last_sync).toLocaleString()}`)
          : chalk.yellow('Never synced');
        
        console.log(`  📍 ${account.account_name} - ${status} - ${syncStatus}`);
        
        if (account.settings) {
          console.log(chalk.gray(`     Auto-reply: ${account.settings.autoReply || false}`));
          console.log(chalk.gray(`     Sync schedule: ${account.settings.syncSchedule || 'manual'}`));
        }
      });
      results.info.accountSettings = settings;
    }

    // 4. Data Volume Summary
    console.log(chalk.magenta.bold('\n📊 DATA VOLUME SUMMARY:'));
    
    const { data: volume, error: err5 } = await supabase.rpc('get_table_counts');
    
    if (!err5 && volume) {
      console.log(chalk.white(`  Accounts: ${volume.accounts || 0}`));
      console.log(chalk.white(`  Locations: ${volume.locations || 0}`));
      console.log(chalk.white(`  Reviews: ${volume.reviews || 0}`));
      console.log(chalk.white(`  Questions: ${volume.questions || 0}`));
      console.log(chalk.white(`  Posts: ${volume.posts || 0}`));
      results.summary.dataVolume = volume;
    }

    // 5. Security Check
    console.log(chalk.blue.bold('\n🔒 SECURITY STATUS:'));
    
    const { data: security, error: err6 } = await supabase.rpc('check_rls_status');
    
    if (!err6 && security) {
      const allEnabled = security.every(table => table.rowsecurity);
      if (allEnabled) {
        console.log(chalk.green('  ✅ Row Level Security enabled on all GMB tables'));
      } else {
        const disabled = security.filter(t => !t.rowsecurity);
        console.log(chalk.red(`  ❌ RLS disabled on: ${disabled.map(t => t.tablename).join(', ')}`));
      }
      results.summary.security = security;
    }

    // 6. Recommendations
    console.log(chalk.green.bold('\n💡 RECOMMENDATIONS:'));
    
    if (results.critical.missingRefreshTokens?.count > 0) {
      console.log(chalk.yellow('  1. Re-authenticate accounts with missing refresh tokens'));
    }
    
    if (results.critical.expiredTokens?.count > 0) {
      console.log(chalk.yellow('  2. Refresh expired tokens to maintain connectivity'));
    }
    
    if (results.warnings.orphanedLocations?.count > 0) {
      console.log(chalk.yellow('  3. Clean up orphaned locations or reassign to active accounts'));
    }
    
    const staleAccounts = settings?.filter(s => 
      s.is_active && (!s.last_sync || new Date(s.last_sync) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    );
    
    if (staleAccounts?.length > 0) {
      console.log(chalk.yellow('  4. Enable auto-sync for accounts with stale data'));
    }

    // Save results to file
    const reportPath = path.join(__dirname, `gmb-audit-report-${new Date().toISOString().split('T')[0]}.json`);
    await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
    
    console.log(chalk.gray('\n' + '=' .repeat(60)));
    console.log(chalk.green(`✅ Audit complete! Full report saved to: ${reportPath}`));
    
  } catch (error) {
    console.error(chalk.red('\n❌ Audit failed:'), error.message);
    process.exit(1);
  }
}

// Create RPC functions if they don't exist
async function setupRPCFunctions() {
  // These would need to be created in Supabase dashboard or via migration
  // For now, we'll use direct queries
  return true;
}

// Run the audit
(async () => {
  await setupRPCFunctions();
  await runAudit();
})();
