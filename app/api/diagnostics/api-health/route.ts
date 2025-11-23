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

    const startTime = Date.now();

    // Test database connectivity
    const { data: testQuery, error: dbError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    const dbResponseTime = Date.now() - startTime;

    return Response.json({
      success: !dbError,
      details: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        database_connection: !dbError ? 'healthy' : 'failed',
        database_response_time_ms: dbResponseTime,
        user_authenticated: !!user,
        environment: process.env.NODE_ENV || 'unknown',
        supabase_url_configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      },
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: {
        status: 'error',
        timestamp: new Date().toISOString(),
      },
    }, { status: 500 });
  }
}
