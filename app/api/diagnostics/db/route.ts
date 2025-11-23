import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({
        success: false,
        error: 'Unauthorized - No user session',
      }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // List of required tables to check
    const requiredTables = [
      'gmb_accounts',
      'gmb_locations',
      'gmb_reviews',
      'gmb_media',
      'gmb_questions',
      'gmb_performance',
      'gmb_posts',
      'oauth_tokens',
      'profiles',
      'client_profiles',
    ];

    const tableStatus: Record<string, { exists: boolean; count?: number; error?: string }> = {};

    // Check each table
    for (const tableName of requiredTables) {
      try {
        const { count, error } = await adminClient
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (error) {
          tableStatus[tableName] = {
            exists: false,
            error: error.message,
          };
        } else {
          tableStatus[tableName] = {
            exists: true,
            count: count || 0,
          };
        }
      } catch (err) {
        tableStatus[tableName] = {
          exists: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      }
    }

    const allTablesExist = Object.values(tableStatus).every(status => status.exists);
    const totalRows = Object.values(tableStatus).reduce((sum, status) => sum + (status.count || 0), 0);

    return Response.json({
      success: allTablesExist,
      details: {
        database_health: allTablesExist ? 'healthy' : 'missing_tables',
        tables_checked: requiredTables.length,
        tables_exist: Object.values(tableStatus).filter(s => s.exists).length,
        total_rows: totalRows,
        table_status: tableStatus,
      },
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
