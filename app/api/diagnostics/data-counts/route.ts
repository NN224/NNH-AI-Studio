import { createClient } from '@/lib/supabase/server';

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

    // Count rows for each table (ONLY real tables)
    const tables = [
      'gmb_locations',
      'gmb_reviews',
      'gmb_media',
      'gmb_questions',
      'gmb_performance_metrics',
      'gmb_search_keywords',
    ];

    const counts: Record<string, number> = {};
    const errors: Record<string, string> = {};

    for (const tableName of tables) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (error) {
          errors[tableName] = error.message;
          counts[tableName] = 0;
        } else {
          counts[tableName] = count || 0;
        }
      } catch (err) {
        errors[tableName] = err instanceof Error ? err.message : 'Unknown error';
        counts[tableName] = 0;
      }
    }

    const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);

    return Response.json({
      success: Object.keys(errors).length === 0,
      details: {
        total_records: totalRecords,
        counts,
        errors: Object.keys(errors).length > 0 ? errors : undefined,
        user_id: user.id,
      },
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
