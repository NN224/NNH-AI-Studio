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

    // Check for OAuth tokens in the database
    const { data: tokens, error: tokenError } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .order('created_at', { ascending: false })
      .limit(1);

    if (tokenError) {
      return Response.json({
        success: false,
        error: `Database error: ${tokenError.message}`,
        details: { tokenError },
      });
    }

    if (!tokens || tokens.length === 0) {
      return Response.json({
        success: false,
        details: {
          status: 'missing',
          message: 'No OAuth token found for this user',
          user_id: user.id,
        },
      });
    }

    const token = tokens[0];
    const expiresAt = token.expires_at ? new Date(token.expires_at) : null;
    const isExpired = expiresAt ? expiresAt < new Date() : false;

    return Response.json({
      success: !isExpired,
      details: {
        status: isExpired ? 'expired' : 'valid',
        provider: token.provider,
        created_at: token.created_at,
        expires_at: token.expires_at,
        is_expired: isExpired,
        user_id: user.id,
        token_id: token.id,
      },
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
