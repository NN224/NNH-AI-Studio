import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    if (error) {
      console.error('[OAuth Callback] OAuth error:', error);
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      return NextResponse.redirect(
        `${baseUrl}/accounts#error=${encodeURIComponent(`OAuth error: ${error}`)}`
      );
    }
    
    // Validate parameters
    if (!code || !state) {
      console.error('[OAuth Callback] Missing code or state');
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      return NextResponse.redirect(
        `${baseUrl}/accounts#error=${encodeURIComponent('Missing authorization code or state')}`
      );
    }
    
    console.log('[OAuth Callback] State:', state);
    
    const supabase = await createClient();
    
    // Verify state and get user ID
    const { data: stateRecord, error: stateError } = await supabase
      .from('oauth_states')
      .select('*')
      .eq('state', state)
      .eq('used', false)
      .single();
      
    if (stateError || !stateRecord) {
      console.error('[OAuth Callback] Invalid state:', stateError);
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      return NextResponse.redirect(
        `${baseUrl}/accounts#error=${encodeURIComponent('Invalid or expired authorization state')}`
      );
    }
    
    // Check if state has expired (30 minute expiry)
    const expiresAt = new Date(stateRecord.expires_at);
    if (expiresAt < new Date()) {
      console.error('[OAuth Callback] State has expired');
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      return NextResponse.redirect(
        `${baseUrl}/accounts#error=${encodeURIComponent('Authorization state has expired')}`
      );
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
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/gmb/oauth-callback`;
    
    if (!clientId || !clientSecret) {
      console.error('[OAuth Callback] Missing Google OAuth configuration');
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      return NextResponse.redirect(
        `${baseUrl}/accounts#error=${encodeURIComponent('Server configuration error')}`
      );
    }
    
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
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      console.error('[OAuth Callback] Token exchange failed:', tokenData);
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      return NextResponse.redirect(
        `${baseUrl}/accounts#error=${encodeURIComponent(
          `Token exchange failed: ${tokenData.error_description || tokenData.error}`
        )}`
      );
    }
    
    console.log('[OAuth Callback] Tokens received successfully');
    
    // Get user info from Google
    console.log('[OAuth Callback] Fetching user info...');
    const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });
    
    if (!userInfoResponse.ok) {
      console.error('[OAuth Callback] Failed to fetch user info');
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      return NextResponse.redirect(
        `${baseUrl}/accounts#error=${encodeURIComponent('Failed to fetch user information')}`
      );
    }
    
    const userInfo = await userInfoResponse.json();
    console.log('[OAuth Callback] User info:', { email: userInfo.email, id: userInfo.id });
    
    // Calculate token expiry
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + (tokenData.expires_in || 3600));
    
    // Fetch GMB accounts
    console.log('[OAuth Callback] Fetching GMB accounts...');
    const gmbAccountsResponse = await fetch(GMB_ACCOUNTS_URL, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });
    
    if (!gmbAccountsResponse.ok) {
      console.error('[OAuth Callback] Failed to fetch GMB accounts:', await gmbAccountsResponse.text());
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      return NextResponse.redirect(
        `${baseUrl}/accounts#error=${encodeURIComponent('Failed to fetch Google My Business accounts')}`
      );
    }
    
    const gmbAccountsData = await gmbAccountsResponse.json();
    const gmbAccounts = gmbAccountsData.accounts || [];
    
    console.log(`[OAuth Callback] Found ${gmbAccounts.length} GMB accounts`);
    
    if (gmbAccounts.length === 0) {
      console.warn('[OAuth Callback] No GMB accounts found for user');
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      return NextResponse.redirect(
        `${baseUrl}/accounts#error=${encodeURIComponent('No Google My Business accounts found')}`
      );
    }
    
    // Process each GMB account
    let savedAccountId: string | null = null;
    
    for (const gmbAccount of gmbAccounts) {
      const accountName = gmbAccount.accountName || gmbAccount.name;
      const accountId = gmbAccount.name; // e.g., "accounts/12345"
      
      console.log(`[OAuth Callback] Processing GMB account: ${accountName} (${accountId})`);
      
      // Check if account already exists
      const { data: existingAccount } = await supabase
        .from('gmb_accounts')
        .select('id, refresh_token')
        .eq('user_id', userId)
        .eq('account_id', accountId)
        .maybeSingle();
        
      if (existingAccount) {
        console.log(`[OAuth Callback] Updating existing account ${existingAccount.id}`);
        
        const updateData = {
          user_id: userId,
          account_name: accountName,
          account_id: accountId,
          email: userInfo.email,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || existingAccount.refresh_token,
          token_expires_at: tokenExpiresAt.toISOString(),
          is_active: true,
          last_sync: new Date().toISOString(),
        };
        
        const { error: updateError } = await supabase
          .from('gmb_accounts')
          .update(updateData)
          .eq('id', existingAccount.id);
          
        if (updateError) {
          console.error('[OAuth Callback] Error updating account:', updateError);
          continue;
        }
        
        savedAccountId = existingAccount.id;
        console.log(`[OAuth Callback] Successfully updated account ${existingAccount.id}`);
      } else {
        console.log(`[OAuth Callback] Creating new account for user ${userId}`);
        
        const insertData = {
          user_id: userId,
          account_name: accountName,
          account_id: accountId,
          email: userInfo.email,
          google_account_id: userInfo.id,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: tokenExpiresAt.toISOString(),
          is_active: true,
          last_sync: null,
          created_at: new Date().toISOString(),
        };
        
        const { data: insertedAccount, error: insertError } = await supabase
          .from('gmb_accounts')
          .insert(insertData)
          .select('id')
          .single();
          
        if (insertError || !insertedAccount) {
          console.error('[OAuth Callback] Error inserting account:', insertError);
          continue;
        }
        
        savedAccountId = insertedAccount.id;
        console.log(`[OAuth Callback] Successfully created account ${insertedAccount.id}`);
      }
      
      // Fetch initial locations for this account
      console.log(`[OAuth Callback] Fetching initial locations for account ${accountId}`);
      const locationsUrl = `${GMB_LOCATIONS_URL}/${accountId}/locations`;
      const locationsResponse = await fetch(
        `${locationsUrl}?readMask=name,title,storefrontAddress,phoneNumbers,websiteUri,categories`,
        {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
        }
      );
      
      if (locationsResponse.ok) {
        const locationsData = await locationsResponse.json();
        const locations = locationsData.locations || [];
        
        console.log(`[OAuth Callback] Found ${locations.length} locations`);
        
        for (const location of locations) {
          const { data: existingLocation } = await supabase
            .from('gmb_locations')
            .select('id')
            .eq('gmb_account_id', savedAccountId)
            .eq('location_id', location.name)
            .maybeSingle();
            
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
          
          if (existingLocation) {
            await supabase
              .from('gmb_locations')
              .update(locationData)
              .eq('id', existingLocation.id);
          } else {
            await supabase
              .from('gmb_locations')
              .insert(locationData);
          }
        }
      } else {
        console.error(`[OAuth Callback] Failed to fetch locations:`, await locationsResponse.text());
      }
    }
    
    // Redirect to accounts page with success
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const redirectUrl = savedAccountId
      ? `${baseUrl}/accounts#success=true&autosync=${savedAccountId}`
      : `${baseUrl}/accounts#success=true`;
      
    console.log('[OAuth Callback] Redirecting to:', redirectUrl);
    return NextResponse.redirect(redirectUrl);
    
  } catch (error: any) {
    console.error('[OAuth Callback] Unexpected error:', error);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    return NextResponse.redirect(
      `${baseUrl}/accounts#error=${encodeURIComponent(
        error.message || 'An unexpected error occurred'
      )}`
    );
  }
}