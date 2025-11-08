import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface AuditResult {
  severity: 'CRITICAL' | 'WARNING' | 'INFO' | 'OK';
  category: string;
  issue: string;
  count: number;
  details?: any;
}

export async function GET() {
  try {
    const supabase = createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const auditResults: AuditResult[] = [];

    // 1. CRITICAL: Check for active accounts without refresh_token
    const { data: accountsNoToken, error: err1 } = await supabase
      .from('gmb_accounts')
      .select('id, account_name')
      .eq('is_active', true)
      .or('refresh_token.is.null,refresh_token.eq.');

    if (!err1 && accountsNoToken && accountsNoToken.length > 0) {
      auditResults.push({
        severity: 'CRITICAL',
        category: 'Authentication',
        issue: 'Active accounts without refresh token',
        count: accountsNoToken.length,
        details: accountsNoToken.map(a => ({ id: a.id, name: a.account_name }))
      });
    }

    // 2. CRITICAL: Check for expired tokens
    const { data: expiredTokens, error: err2 } = await supabase
      .from('gmb_accounts')
      .select('id, account_name, token_expires_at')
      .eq('is_active', true)
      .not('token_expires_at', 'is', null)
      .lt('token_expires_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (!err2 && expiredTokens && expiredTokens.length > 0) {
      auditResults.push({
        severity: 'CRITICAL',
        category: 'Authentication',
        issue: 'Expired tokens (>24 hours)',
        count: expiredTokens.length,
        details: expiredTokens.map(a => ({ 
          id: a.id, 
          name: a.account_name,
          expired_at: a.token_expires_at 
        }))
      });
    }

    // 3. WARNING: Check for orphaned locations
    const { data: orphanedLocations, error: err3 } = await supabase
      .from('gmb_locations')
      .select('id, location_name')
      .is('gmb_account_id', null);

    if (!err3 && orphanedLocations && orphanedLocations.length > 0) {
      auditResults.push({
        severity: 'WARNING',
        category: 'Data Integrity',
        issue: 'Locations without GMB account',
        count: orphanedLocations.length,
        details: orphanedLocations.slice(0, 10).map(l => ({ 
          id: l.id, 
          name: l.location_name 
        }))
      });
    }

    // 4. INFO: Settings configuration audit
    const { data: accounts, error: err4 } = await supabase
      .from('gmb_accounts')
      .select('id, account_name, is_active, settings, last_sync')
      .eq('user_id', user.id)
      .order('is_active', { ascending: false });

    if (!err4 && accounts) {
      const settingsIssues = accounts.filter(a => 
        a.is_active && (!a.settings || Object.keys(a.settings).length === 0)
      );

      if (settingsIssues.length > 0) {
        auditResults.push({
          severity: 'INFO',
          category: 'Configuration',
          issue: 'Active accounts with default settings',
          count: settingsIssues.length,
          details: settingsIssues.map(a => ({ 
            id: a.id, 
            name: a.account_name 
          }))
        });
      }

      // Check for stale data
      const staleAccounts = accounts.filter(a => {
        if (!a.is_active || !a.last_sync) return false;
        const lastSync = new Date(a.last_sync);
        const daysSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceSync > 7;
      });

      if (staleAccounts.length > 0) {
        auditResults.push({
          severity: 'WARNING',
          category: 'Data Freshness',
          issue: 'Accounts with stale data (>7 days)',
          count: staleAccounts.length,
          details: staleAccounts.map(a => ({ 
            id: a.id, 
            name: a.account_name,
            last_sync: a.last_sync,
            days_ago: Math.floor((Date.now() - new Date(a.last_sync).getTime()) / (1000 * 60 * 60 * 24))
          }))
        });
      }
    }

    // 5. Data volume summary
    const volumeSummary: Record<string, number> = {};
    
    const tables = [
      'gmb_accounts',
      'gmb_locations', 
      'gmb_reviews',
      'gmb_questions',
      'gmb_posts',
      'gmb_performance_metrics',
      'gmb_search_keywords',
      'gmb_media'
    ];

    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      if (!error) {
        volumeSummary[table] = count || 0;
      }
    }

    // 6. Security check - RLS status
    const { data: rlsStatus, error: rlsError } = await supabase.rpc('check_rls_status', {
      table_pattern: 'gmb_%'
    });

    let securityStatus = 'OK';
    if (rlsError) {
      // If RPC doesn't exist, we'll mark as unknown
      securityStatus = 'UNKNOWN';
    } else if (rlsStatus) {
      const disabledTables = rlsStatus.filter((t: any) => !t.rowsecurity);
      if (disabledTables.length > 0) {
        auditResults.push({
          severity: 'CRITICAL',
          category: 'Security',
          issue: 'Tables without Row Level Security',
          count: disabledTables.length,
          details: disabledTables.map((t: any) => t.tablename)
        });
        securityStatus = 'CRITICAL';
      }
    }

    // 7. Generate recommendations
    const recommendations: string[] = [];
    
    if (auditResults.some(r => r.severity === 'CRITICAL' && r.category === 'Authentication')) {
      recommendations.push('Immediate action required: Re-authenticate GMB accounts with authentication issues');
    }
    
    if (auditResults.some(r => r.issue.includes('stale data'))) {
      recommendations.push('Consider enabling auto-sync for accounts with stale data');
    }
    
    if (auditResults.some(r => r.issue.includes('default settings'))) {
      recommendations.push('Review and configure settings for optimal performance');
    }

    // Generate summary
    const summary = {
      timestamp: new Date().toISOString(),
      total_issues: auditResults.length,
      critical_count: auditResults.filter(r => r.severity === 'CRITICAL').length,
      warning_count: auditResults.filter(r => r.severity === 'WARNING').length,
      info_count: auditResults.filter(r => r.severity === 'INFO').length,
      data_volume: volumeSummary,
      security_status: securityStatus,
      recommendations
    };

    return NextResponse.json({
      success: true,
      summary,
      results: auditResults.sort((a, b) => {
        const severityOrder = { CRITICAL: 0, WARNING: 1, INFO: 2, OK: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      })
    });

  } catch (error) {
    console.error('Audit error:', error);
    return NextResponse.json(
      { error: 'Failed to run audit', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
