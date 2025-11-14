import { NextRequest, NextResponse } from 'next/server';
import { generateCSRFToken, getCSRFTokenFromCookie, setCSRFTokenCookie } from '@/lib/security/csrf';

export const dynamic = 'force-dynamic';

/**
 * GET endpoint to retrieve CSRF token for client-side requests
 */
export async function GET(request: NextRequest) {
  try {
    // Check if token already exists in cookie
    let token = await getCSRFTokenFromCookie();
    
    // If no token exists, generate a new one
    if (!token) {
      token = generateCSRFToken();
      await setCSRFTokenCookie(token);
    }
    
    // Return token to client
    return NextResponse.json({ token });
  } catch (error) {
    console.error('CSRF token generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}
