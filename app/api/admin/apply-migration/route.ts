import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

/**
 * Admin endpoint to apply database migrations
 * Only for development/admin use
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { migrationFile } = body;

    if (!migrationFile) {
      return NextResponse.json(
        { error: 'Migration file name is required' },
        { status: 400 }
      );
    }

    // Read migration file
    const migrationPath = join(process.cwd(), 'supabase', 'migrations', migrationFile);
    let migrationSQL: string;
    
    try {
      migrationSQL = readFileSync(migrationPath, 'utf-8');
    } catch (error) {
      return NextResponse.json(
        { error: `Migration file not found: ${migrationFile}` },
        { status: 404 }
      );
    }

    // Execute migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: migrationSQL
    });

    if (error) {
      console.error('Migration error:', error);
      return NextResponse.json(
        { 
          error: 'Migration failed',
          details: error.message,
          hint: 'Check Supabase logs for more details'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Migration ${migrationFile} applied successfully`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Apply migration error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Get list of available migrations
 */
export async function GET() {
  try {
    const { readdirSync } = await import('fs');
    const { join } = await import('path');
    
    const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
    const files = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    return NextResponse.json({
      migrations: files,
      count: files.length
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to list migrations' },
      { status: 500 }
    );
  }
}
