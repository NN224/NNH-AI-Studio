import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/utils/api-error-handler';
import { getBaseUrlDynamic } from '@/lib/utils/get-base-url-dynamic';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { encryptToken, resolveTokenValue } from '@/lib/security/encryption';

export const dynamic = 'force-dynamic';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
const GMB_ACCOUNTS_URL = 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts';
const GMB_LOCATIONS_URL = 'https://mybusinessbusinessinformation.googleapis.com/v1';

export async function GET(request: NextRequest) {
  console.log('[OAuth Callback] Processing OAuth callback...');
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    // Handle OAuth errors
    // Determine locale from cookie (fallback to 'en')
    const localeCookie = request.cookies.get('NEXT_LOCALE')?.value || 'en';

    if (error) {
      console.error('[OAuth Callback] OAuth error:', error);
      const baseUrl = getBaseUrlDynamic(request);
      return NextResponse.redirect(
        `${baseUrl}/${localeCookie}/settings?error=${encodeURIComponent(`OAuth error: ${error}`)}`
      ); // Keep redirect for user-facing error
    }
    
    // Validate parameters
    if (!code || !state) {
      console.error('[OAuth Callback] Missing code or state');
      const baseUrl = getBaseUrlDynamic(request);
      return NextResponse.redirect(
        `${baseUrl}/${localeCookie}/settings?error=${encodeURIComponent('Missing authorization code or state')}`
      ); // Keep redirect for user-facing error
    }
    
    console.log('[OAuth Callback] State:', state);
    
    const supabase = await createClient();
    const adminClient = createAdminClient();
    
    // Verify state and get user ID
    const { data: stateRecord, error: stateError } = await supabase
      .from('oauth_states')
      .select('*')
      .eq('state', state)
      .eq('used', false)
      .single();
      
    if (stateError || !stateRecord) {
      console.error('[OAuth Callback] Invalid state:', stateError);
      const baseUrl = getBaseUrlDynamic(request);
      return NextResponse.redirect(
        `${baseUrl}/${localeCookie}/settings?error=${encodeURIComponent('Invalid or expired authorization state')}`
      ); // Keep redirect for user-facing error
    }
    
    // Check if state has expired (30 minute expiry)
    const expiresAt = new Date(stateRecord.expires_at);
    if (expiresAt < new Date()) {
      console.error('[OAuth Callback] State has expired');
      const baseUrl = getBaseUrlDynamic(request);
      return NextResponse.redirect(
        `${baseUrl}/${localeCookie}/settings?error=${encodeURIComponent('Authorization state has expired')}`
      ); // Keep redirect for user-facing error
    }
    
    // Mark state as used
    await supabase
      .from('oauth_states')
      .update({ used: true })
      .eq('state', state);
      
    const userId = stateRecord.user_id;
    console.log('[OAuth Callback] User ID from state:', userId);
    
    // Exchange code for tokens
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const baseUrl = getBaseUrlDynamic(request);
    // Ensure consistent redirect_uri - must match create-auth-url exactly
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 
      `${baseUrl}/api/gmb/oauth-callback`;
    
    if (!clientId || !clientSecret) {
      console.error('[OAuth Callback] Missing Google OAuth configuration');
      const baseUrl = getBaseUrlDynamic(request);
      return NextResponse.redirect(
        `${baseUrl}/${localeCookie}/settings?error=${encodeURIComponent('Server configuration error')}`
      ); // Keep redirect for user-facing error
    }
    
    // Ensure redirect_uri doesn't have trailing slash (must match create-auth-url)
    const cleanRedirectUri = redirectUri.replace(/\/$/, '');
    console.log('[OAuth Callback] Using redirect URI:', cleanRedirectUri);
    
    console.log('[OAuth Callback] Exchanging code for tokens...');
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: cleanRedirectUri,
        grant_type: 'authorization_code',
      }),
    });
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      console.error('[OAuth Callback] Token exchange failed:', tokenData);
      const baseUrl = getBaseUrlDynamic(request);
      return NextResponse.redirect(
        `${baseUrl}/${localeCookie}/settings?error=${encodeURIComponent(
          `Token exchange failed: ${tokenData.error_description || tokenData.error}`
        )}`
      ); // Keep redirect for user-facing error
    }
    
    console.log('[OAuth Callback] Tokens received successfully');
    
    // Get user info from Google
    console.log('[OAuth Callback] Fetching user info...');
    const userInfoUrl = new URL(GOOGLE_USERINFO_URL);
    userInfoUrl.searchParams.set('alt', 'json');
    
    const userInfoResponse = await fetch(userInfoUrl.toString(), {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/json',
      },
    });
    
    if (!userInfoResponse.ok) {
      console.error('[OAuth Callback] Failed to fetch user info');
      const baseUrl = getBaseUrlDynamic(request);
      return NextResponse.redirect(
        `${baseUrl}/${localeCookie}/settings?error=${encodeURIComponent('Failed to fetch user information')}`
      ); // Keep redirect for user-facing error
    }
    
    const userInfo = await userInfoResponse.json();
    console.log('[OAuth Callback] User info:', { email: userInfo.email, id: userInfo.id });

    if (!userInfo.email) {
      console.error('[OAuth Callback] Google user info did not include an email address');
      return NextResponse.redirect(
        `${baseUrl}/${localeCookie}/settings?error=${encodeURIComponent('Unable to determine Google account email')}`
      );
    }

    const { data: existingProfile, error: profileLookupError } = await adminClient
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (profileLookupError) {
      console.error('[OAuth Callback] Failed to verify profile record:', profileLookupError);
      return NextResponse.redirect(
        `${baseUrl}/${localeCookie}/settings?error=${encodeURIComponent('Failed to verify user record')}`
      );
    }

    if (!existingProfile) {
      const displayName =
        userInfo.name ||
        [userInfo.given_name, userInfo.family_name].filter(Boolean).join(' ') ||
        userInfo.email.split('@')[0] ||
        'Google User';

      console.log('[OAuth Callback] Creating profile record for new user', { userId, email: userInfo.email });

      const { error: createProfileError } = await adminClient.from('profiles').upsert({
        id: userId,
        email: userInfo.email,
        full_name: displayName,
        avatar_url: userInfo.picture ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

      if (createProfileError) {
        console.error('[OAuth Callback] Failed to create profile record:', createProfileError);
        return NextResponse.redirect(
          `${baseUrl}/${localeCookie}/settings?error=${encodeURIComponent('Failed to initialize user record')}`
        );
      }
    }
    
    // Calculate token expiry
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + (tokenData.expires_in || 3600));
    
    // Fetch GMB accounts
    console.log('[OAuth Callback] Fetching GMB accounts...');
    const gmbAccountsUrl = new URL(GMB_ACCOUNTS_URL);
    gmbAccountsUrl.searchParams.set('alt', 'json');
    
    const gmbAccountsResponse = await fetch(gmbAccountsUrl.toString(), {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/json',
      },
    });
    
    if (!gmbAccountsResponse.ok) {
      console.error('[OAuth Callback] Failed to fetch GMB accounts:', await gmbAccountsResponse.text());
      const baseUrl = getBaseUrlDynamic(request);
      return NextResponse.redirect(
        `${baseUrl}/${localeCookie}/settings?error=${encodeURIComponent('Failed to fetch Google My Business accounts')}`
      ); // Keep redirect for user-facing error
    }
    
    const gmbAccountsData = await gmbAccountsResponse.json();
    const gmbAccounts = gmbAccountsData.accounts || [];
    
    console.log(`[OAuth Callback] Found ${gmbAccounts.length} GMB accounts`);
    
    if (gmbAccounts.length === 0) {
      console.warn('[OAuth Callback] No GMB accounts found for user');
      const baseUrl = getBaseUrlDynamic(request);
      return NextResponse.redirect(
        `${baseUrl}/${localeCookie}/settings?error=${encodeURIComponent('No Google My Business accounts found')}`
      ); // Keep redirect for user-facing error
    }
    
    // Process each GMB account
    let savedAccountId: string | null = null;
    
    for (const gmbAccount of gmbAccounts) {
      const accountName = gmbAccount.accountName || gmbAccount.name;
      const accountId = gmbAccount.name; // e.g., "accounts/12345"
      
      console.log(`[OAuth Callback] Processing GMB account: ${accountName} (${accountId})`);
      
      // Check if this account is already linked to another user
      const { data: existingAccount } = await supabase
        .from('gmb_accounts')
        .select('user_id, refresh_token')
        .eq('account_id', accountId)
        .maybeSingle();
      
      if (existingAccount && existingAccount.user_id !== userId) {
      console.error('[OAuth Callback] Security violation: GMB account already linked to different user');
      const baseUrl = getBaseUrlDynamic(request);
      return NextResponse.redirect(
        `${baseUrl}/${localeCookie}/settings?error=${encodeURIComponent('This Google My Business account is already linked to another user')}`
      ); // Keep redirect for user-facing error
      }
      
      const existingRefreshToken = existingAccount?.refresh_token
        ? resolveTokenValue(existingAccount.refresh_token, { context: `gmb_accounts.refresh_token:${accountId}` })
        : null;

      let encryptedAccessToken: string;
      let encryptedRefreshToken: string | null = null;

      try {
        encryptedAccessToken = encryptToken(tokenData.access_token);
        const refreshTokenToPersist = tokenData.refresh_token || existingRefreshToken || null;
        encryptedRefreshToken = refreshTokenToPersist ? encryptToken(refreshTokenToPersist) : null;
      } catch (encryptionError) {
        console.error('[OAuth Callback] Failed to encrypt tokens:', encryptionError);
        const baseUrl = getBaseUrlDynamic(request);
        return NextResponse.redirect(
          `${baseUrl}/${localeCookie}/settings?error=${encodeURIComponent(
            'Failed to secure OAuth tokens. Please try again.'
          )}`
        );
      }
      
      // Use UPSERT to insert or update the account
      console.log(`[OAuth Callback] Upserting GMB account ${accountId}`);
      
      const upsertData = {
        user_id: userId,
        account_id: accountId,
        account_name: accountName,
        email: userInfo.email,
        google_account_id: userInfo.id,
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expires_at: tokenExpiresAt.toISOString(),
        is_active: true,
        last_sync: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const { data: upsertedAccount, error: upsertError } = await supabase
        .from('gmb_accounts')
        .upsert(upsertData, {
          onConflict: 'user_id,account_id',
          ignoreDuplicates: false,
        })
        .select('id')
        .single();
        
      if (upsertError || !upsertedAccount) {
        handleApiError(
          upsertError || new Error('[OAuth Callback] Account upsert returned no data'),
          '[OAuth Callback] Failed to upsert GMB account'
        );

        const baseUrl = getBaseUrlDynamic(request);
        return NextResponse.redirect(
          `${baseUrl}/${localeCookie}/settings?error=${encodeURIComponent(
            'Failed to save Google My Business account. Please try again.'
          )}`
        );
      }
      
      savedAccountId = upsertedAccount.id;
      console.log(`[OAuth Callback] Successfully upserted account ${upsertedAccount.id}`);
      
      // Fetch initial locations for this account
      console.log(`[OAuth Callback] Fetching initial locations for account ${accountId}`);
      const locationsUrl = new URL(`${GMB_LOCATIONS_URL}/${accountId}/locations`);
      locationsUrl.searchParams.set('readMask', 'name,title,storefrontAddress,phoneNumbers,websiteUri,categories');
      locationsUrl.searchParams.set('alt', 'json');
      
      const locationsResponse = await fetch(locationsUrl.toString(), {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/json',
        },
      });
      
      if (locationsResponse.ok) {
        const locationsData = await locationsResponse.json();
        const locations = locationsData.locations || [];
        
        console.log(`[OAuth Callback] Found ${locations.length} locations`);
        
        for (const location of locations) {
          const locationData = {
            gmb_account_id: savedAccountId,
            user_id: userId,
            location_name: location.title || 'Unnamed Location',
            location_id: location.name,
            address: location.storefrontAddress
              ? `${location.storefrontAddress.addressLines?.join(', ') || ''}, ${
                  location.storefrontAddress.locality || ''
                }, ${location.storefrontAddress.administrativeArea || ''} ${
                  location.storefrontAddress.postalCode || ''
                }`
              : null,
            phone: location.phoneNumbers?.primaryPhone || null,
            category: location.categories?.primaryCategory?.displayName || null,
            website: location.websiteUri || null,
            is_active: true,
            metadata: location,
            updated_at: new Date().toISOString(),
          };

          // Use UPSERT to insert or update the location in a single query
          // The unique constraint on (gmb_account_id, location_id) will handle the conflict
          const { error: upsertLocationError } = await supabase
            .from('gmb_locations')
            .upsert(locationData, {
              onConflict: 'gmb_account_id,location_id',
              ignoreDuplicates: false,
            });

          if (upsertLocationError) {
            console.error(`[OAuth Callback] Error upserting location ${location.name}:`, upsertLocationError);
          }
        }
      } else {
        console.error(`[OAuth Callback] Failed to fetch locations:`, await locationsResponse.text());
      }
    }
    
    // Redirect to GMB dashboard with success or error
    if (!savedAccountId) {
      console.error('[OAuth Callback] No account was saved');
      const baseUrl = getBaseUrlDynamic(request);
      return NextResponse.redirect(
        `${baseUrl}/${localeCookie}/settings?error=${encodeURIComponent('Failed to save any account')}`
      ); // Keep redirect for user-facing error
    }
    
    // Redirect to dashboard settings with success message
  const redirectUrl = `${baseUrl}/${localeCookie}/settings?connected=true`;
    console.log('[OAuth Callback] Redirecting to:', redirectUrl);
    return NextResponse.redirect(redirectUrl);
    
  } catch (error: any) {
    console.error('[OAuth Callback] Unexpected error:', error);
    const baseUrl = getBaseUrlDynamic(request);
    const localeCookie = request.cookies.get('NEXT_LOCALE')?.value || 'en';
    return NextResponse.redirect(
      `${baseUrl}/${localeCookie}/settings?error=${encodeURIComponent(
        error.message || 'An unexpected error occurred'
      )}`
    );
  }
}