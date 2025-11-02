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
    
    // Ensure user has a profile (optional check - profiles table may not be required)
    // This is just a safety check, but since we use auth.users FK, it's not critical
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();
    
    if (profileError && profileError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is OK
      console.error('[Create Auth URL] Profile check error:', profileError.message);
    }
    
    // Get OAuth configuration
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    // Ensure consistent redirect_uri between create-auth-url and oauth-callback
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 
      `${baseUrl}/api/gmb/oauth-callback`;
    
    if (!clientId) {
      console.error('[Create Auth URL] Missing Google OAuth configuration');
      return NextResponse.json(
        { error: 'Server configuration error: Missing Google OAuth credentials' },
        { status: 500 }
      );
    }
    
    // Ensure redirect_uri doesn't have trailing slash
    const cleanRedirectUri = redirectUri.replace(/\/$/, '');
    
    // Generate random state for security
    const state = crypto.randomUUID();
    
    // Calculate expiry time (30 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);
    
    // Save state to database using admin client to bypass RLS
    // (We've already authenticated the user above with getUser())
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
    
    // Build OAuth URL
    const authUrl = new URL(GOOGLE_AUTH_URL);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', cleanRedirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', SCOPES.join(' '));
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('include_granted_scopes', 'true');
    authUrl.searchParams.set('state', state);
    
    const authUrlString = authUrl.toString();
    
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