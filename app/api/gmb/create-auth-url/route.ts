import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const SCOPES = [
  'https://www.googleapis.com/auth/business.manage',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
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
    
    // Save state to database
    const { error: stateError } = await supabase
      .from('oauth_states')
      .insert({
        state,
        user_id: user.id,
        expires_at: expiresAt.toISOString(),
        used: false,
      });
      
    if (stateError) {
      console.error('[Create Auth URL] Error saving state:', stateError);
      return NextResponse.json(
        { error: 'Failed to save OAuth state' },
        { status: 500 }
      );
    }
    
    console.log('[Create Auth URL] State saved successfully');
    
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