import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * API endpoint to log client-side errors
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get user info (optional - errors can be logged anonymously)
    const { data: { user } } = await supabase.auth.getUser();
    
    // Parse request body
    const body = await request.json();
    const { errors } = body;
    
    if (!Array.isArray(errors) || errors.length === 0) {
      return NextResponse.json(
        { error: 'Invalid error data' },
        { status: 400 }
      );
    }
    
    // Validate and sanitize error data
    const sanitizedErrors = errors.slice(0, 100).map(error => ({
      id: error.id || generateErrorId(),
      message: String(error.message || 'Unknown error').slice(0, 1000),
      stack: error.stack ? String(error.stack).slice(0, 5000) : null,
      level: ['error', 'warning', 'info'].includes(error.level) ? error.level : 'error',
      timestamp: error.timestamp || new Date().toISOString(),
      user_id: user?.id || null,
      context: sanitizeContext(error.context),
      user_agent: error.userAgent ? String(error.userAgent).slice(0, 500) : null,
      url: error.url ? String(error.url).slice(0, 500) : null,
    }));
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Client errors received:', sanitizedErrors);
    }
    
    // Store errors in database
    const { error: dbError } = await supabase
      .from('error_logs')
      .insert(sanitizedErrors);
    
    if (dbError) {
      console.error('Failed to store error logs:', dbError);
      // Don't return error to client - we don't want logging to fail the request
    }
    
    // In production, you might also want to:
    // - Send to external error tracking service (Sentry, LogRocket, etc.)
    // - Send critical errors to Slack/Discord
    // - Trigger alerts for error spikes
    
    return NextResponse.json({ success: true, logged: sanitizedErrors.length });
    
  } catch (error) {
    console.error('Error logging endpoint failed:', error);
    // Don't return 500 - we don't want error logging to cause more errors
    return NextResponse.json({ success: false });
  }
}

/**
 * Sanitize error context to prevent logging sensitive data
 */
function sanitizeContext(context: any): Record<string, any> | null {
  if (!context || typeof context !== 'object') return null;
  
  const sanitized: Record<string, any> = {};
  const allowedKeys = ['component', 'action', 'route', 'feature'];
  
  for (const key of allowedKeys) {
    if (key in context) {
      sanitized[key] = String(context[key]).slice(0, 200);
    }
  }
  
  // Add sanitized metadata
  if (context.metadata && typeof context.metadata === 'object') {
    sanitized.metadata = {};
    for (const [key, value] of Object.entries(context.metadata)) {
      // Only allow non-sensitive metadata
      if (!key.toLowerCase().includes('password') && 
          !key.toLowerCase().includes('token') &&
          !key.toLowerCase().includes('secret')) {
        sanitized.metadata[key] = String(value).slice(0, 200);
      }
    }
  }
  
  return Object.keys(sanitized).length > 0 ? sanitized : null;
}

/**
 * Generate error ID if not provided
 */
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
