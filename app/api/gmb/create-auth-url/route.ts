import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const SCOPES = [
  'https://www.googleapis.com/auth/business.manage',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'openid', // Added for ID token and better security
];

export async function POST(request: NextRequest) {
  console.log('[Create Auth URL] Creating Google OAuth URL...');
  
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[Create Auth URL] User not authenticated:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('[Create Auth URL] User authenticated:', user.id);
    
    // Get OAuth configuration
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/gmb/oauth-callback`;
    
    if (!clientId) {
      console.error('[Create Auth URL] Missing Google OAuth configuration');
      return NextResponse.json(
        { error: 'Server configuration error: Missing Google OAuth credentials' },
        { status: 500 }
      );
    }
    
    // Generate random state for security
    const state = crypto.randomUUID();
    console.log('[Create Auth URL] Generated state:', state);
    
    // Calculate expiry time (30 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);
    
    // Save state to database using admin client to bypass RLS
    // (We've already authenticated the user above with getUser())
    console.log('[Create Auth URL] Attempting to insert state:', {
      state,
      user_id: user.id,
      expires_at: expiresAt.toISOString(),
      used: false,
    });
    
    const adminClient = createAdminClient();
    const { data: insertData, error: stateError } = await adminClient
      .from('oauth_states')
      .insert({
        state,
        user_id: user.id,
        expires_at: expiresAt.toISOString(),
        used: false,
      })
      .select();
      
    if (stateError) {
      console.error('[Create Auth URL] ===== ERROR SAVING STATE =====');
      console.error('[Create Auth URL] Full error object:', JSON.stringify(stateError, null, 2));
      console.error('[Create Auth URL] Error code:', stateError.code);
      console.error('[Create Auth URL] Error message:', stateError.message);
      console.error('[Create Auth URL] Error details:', stateError.details);
      console.error('[Create Auth URL] Error hint:', stateError.hint);
      console.error('[Create Auth URL] ================================');
      
      return NextResponse.json(
        { 
          error: 'Failed to save OAuth state', 
          message: stateError.message,
          code: stateError.code,
          hint: stateError.hint
        },
        { status: 500 }
      );
    }
    
    console.log('[Create Auth URL] State saved successfully:', insertData);
    
    // Build OAuth URL
    const authUrl = new URL(GOOGLE_AUTH_URL);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', SCOPES.join(' '));
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('include_granted_scopes', 'true');
    authUrl.searchParams.set('state', state);
    
    const authUrlString = authUrl.toString();
    console.log('[Create Auth URL] Auth URL created successfully');
    console.log('[Create Auth URL] Redirect URI:', redirectUri);
    
    return NextResponse.json({
      authUrl: authUrlString,
      url: authUrlString, // For backward compatibility
    });
    
  } catch (error: any) {
    console.error('[Create Auth URL] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create authorization URL' },
      { status: 500 }
    );
  }
}