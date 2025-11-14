import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Database health check endpoint
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const supabase = await createClient();
    
    // Simple query to check database connectivity
    const { data, error } = await supabase
      .from('gmb_locations')
      .select('id')
      .limit(1);

    const duration = Date.now() - startTime;

    if (error) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          service: 'database',
          message: `Database query failed: ${error.message}`,
          duration,
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    // Check if response time is acceptable
    const status = duration > 2000 ? 'degraded' : 'healthy';

    return NextResponse.json({
      status,
      service: 'database',
      message: status === 'degraded' ? `Slow response time: ${duration}ms` : 'Database is healthy',
      duration,
      timestamp: new Date().toISOString(),
      details: {
        queryTime: duration,
        connected: true,
      },
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        service: 'database',
        message: `Database connection failed: ${error}`,
        duration,
        timestamp: new Date().toISOString(),
        details: {
          error: String(error),
          connected: false,
        },
      },
      { status: 503 }
    );
  }
}
