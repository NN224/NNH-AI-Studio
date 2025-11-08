import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// This endpoint is used to test that authentication is properly enforced
export async function GET() {
  const supabase = createClient();
  
  // Check if user is authenticated
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    // This is the expected behavior - return 401 for unauthenticated requests
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Authentication required' },
      { status: 401 }
    );
  }
  
  // If somehow authenticated, return success (this shouldn't happen in security test)
  return NextResponse.json({
    authenticated: true,
    user: user.id
  });
}
