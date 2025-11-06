import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Helper function to refresh Google token
async function refreshGoogleToken(refreshToken: string) {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token refresh error:', errorText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Token refresh failed:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { review_id, reply_text } = await request.json();

    if (!review_id || !reply_text) {
      return NextResponse.json(
        { success: false, error: 'Review ID and reply text are required' },
        { status: 400 }
      );
    }

    console.log('Looking for review:', review_id);

    // Get review details - use simpler query to avoid join issues
    const { data: review, error: reviewError } = await supabase
      .from('gmb_reviews')
      .select(`
        *,
        gmb_locations (
          id,
          location_name,
          gmb_account_id,
          user_id
        )
      `)
      .eq('id', review_id)
      .single();

    if (reviewError) {
      console.error('Review query error:', reviewError);
      console.error('Full error:', JSON.stringify(reviewError, null, 2));
      return NextResponse.json(
        { 
          success: false, 
          error: 'Review not found',
          details: reviewError.message 
        },
        { status: 404 }
      );
    }

    if (!review) {
      console.error('Review not found for ID:', review_id);
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      );
    }

    console.log('Review found:', review.id);

    // Handle gmb_locations - it can be an array or single object
    let location = null;
    if (Array.isArray(review.gmb_locations)) {
      location = review.gmb_locations[0];
    } else if (review.gmb_locations) {
      location = review.gmb_locations;
    }

    // Verify ownership
    if (!location || location.user_id !== user.id) {
      console.error('Unauthorized: location user_id:', location?.user_id, 'vs user.id:', user.id);
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    console.log('Location found:', location.id, 'Account ID:', location.gmb_account_id);

    // Get GMB account separately to avoid nested join issues
    const { data: account, error: accountError } = await supabase
      .from('gmb_accounts')
      .select('id, account_id, access_token, refresh_token, token_expires_at, is_active')
      .eq('id', location.gmb_account_id)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      console.error('Account query error:', accountError);
      return NextResponse.json(
        { success: false, error: 'GMB account not found or inactive' },
        { status: 404 }
      );
    }

    if (!account.is_active) {
      return NextResponse.json(
        { success: false, error: 'GMB account is not active' },
        { status: 403 }
      );
    }

    console.log('Account found:', account.id);

    // Get and refresh access token if needed
    let accessToken = account.access_token as string | null;
    const isExpired = account.token_expires_at 
      ? new Date(account.token_expires_at) < new Date() 
      : false;

    if ((!accessToken || isExpired) && account.refresh_token) {
      try {
        const refreshed = await refreshGoogleToken(account.refresh_token);
        if (refreshed?.access_token) {
          accessToken = refreshed.access_token;
          const expiresAt = new Date();
          if (refreshed.expires_in) {
            expiresAt.setSeconds(expiresAt.getSeconds() + refreshed.expires_in);
          }
          await supabase
            .from('gmb_accounts')
            .update({ 
              access_token: accessToken, 
              token_expires_at: expiresAt.toISOString() 
            })
            .eq('id', account.id)
            .eq('user_id', user.id);
        } else {
          return NextResponse.json(
            { success: false, error: 'GMB authentication expired. Please reconnect your account.' },
            { status: 401 }
          );
        }
      } catch (refreshError: any) {
        console.error('Token refresh error:', refreshError);
        return NextResponse.json(
          { success: false, error: 'GMB authentication expired. Please reconnect your account.' },
          { status: 401 }
        );
      }
    }

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Access token not available' },
        { status: 400 }
      );
    }

    // Post reply to Google My Business API
    // The review_id should be in format: accounts/{accountId}/locations/{locationId}/reviews/{reviewId}
    // Or we can use the external_review_id which is the full resource name
    const reviewResourceName = review.external_review_id || review.review_id;
    
    if (!reviewResourceName) {
      return NextResponse.json(
        { success: false, error: 'Review resource name not found' },
        { status: 400 }
      );
    }

    // GMB API v4 endpoint for replying to reviews
    // The API expects a ReviewReply object with just "comment" field, not nested "reply"
    const gmbApiUrl = `https://mybusiness.googleapis.com/v4/${reviewResourceName}/reply`;
    
    console.log('Posting reply to GMB:', gmbApiUrl);
    console.log('Reply text:', reply_text.trim());
    
    const gmbResponse = await fetch(gmbApiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        comment: reply_text.trim()
      })
    });

    if (!gmbResponse.ok) {
      const errorData = await gmbResponse.text();
      console.error('GMB API Error:', gmbResponse.status, errorData);
      
      if (gmbResponse.status === 401) {
        return NextResponse.json(
          { success: false, error: 'GMB authentication expired. Please reconnect your account.' },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to post reply to Google My Business',
          details: errorData 
        },
        { status: gmbResponse.status }
      );
    }

    const gmbData = await gmbResponse.json().catch(() => ({}));

    // Update database
    const { error: updateError } = await supabase
      .from('gmb_reviews')
      .update({
        reply_text: reply_text.trim(),
        review_reply: reply_text.trim(), // Keep both for backwards compatibility
        reply_date: new Date().toISOString(),
        replied_at: new Date().toISOString(),
        has_reply: true,
        has_response: true,
        response_text: reply_text.trim(),
        responded_at: new Date().toISOString(),
        ai_generated_response: reply_text.trim(),
        status: 'responded',
        updated_at: new Date().toISOString()
      })
      .eq('id', review_id);

    if (updateError) {
      console.error('Database update error:', updateError);
      // Reply was sent to GMB but DB update failed - still return success with warning
      return NextResponse.json({
        success: true,
        warning: 'Reply sent to GMB but database update failed',
        review_id
      });
    }

    // Log activity (if table exists)
    try {
      await supabase
        .from('review_activity_log')
        .insert({
          review_id: review_id,
          user_id: user.id,
          action: 'reply_sent',
          details: {
            reply_text: reply_text.trim(),
            ai_generated: true,
            sent_to_gmb: true
          }
        });
    } catch (logError) {
      // Activity log is optional, don't fail if it doesn't exist
      console.warn('Activity log failed (non-critical):', logError);
    }

    return NextResponse.json({
      success: true,
      message: 'Reply sent successfully to Google My Business',
      review_id
    });

  } catch (error: any) {
    console.error('Send reply error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to send reply',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

