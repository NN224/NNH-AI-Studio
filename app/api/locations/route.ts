import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// GET - Fetch locations with filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // ✅ SECURITY: Rate limiting
    const { success, headers: rateLimitHeaders } = await checkRateLimit(user.id);
    if (!success) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          retry_after: rateLimitHeaders['X-RateLimit-Reset']
        },
        {
          status: 429,
          headers: rateLimitHeaders as HeadersInit
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    
    // ✅ Input validation
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
    
    // Validate sortBy
    const validSortFields = ['location_name', 'rating', 'review_count', 'created_at', 'updated_at'];
    const sortBy = validSortFields.includes(searchParams.get('sortBy') || 'location_name') 
      ? (searchParams.get('sortBy') || 'location_name')
      : 'location_name';

    // Build query
    let query = supabase
      .from('gmb_locations')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('is_active', true);

    // ✅ SECURITY: Apply filters with input sanitization
    if (search) {
      // Sanitize search input (limit length, escape special characters)
      const sanitizedSearch = search.trim().slice(0, 100).replace(/%/g, '\\%').replace(/_/g, '\\_');
      if (sanitizedSearch) {
        query = query.or(`location_name.ilike.%${sanitizedSearch}%,address.ilike.%${sanitizedSearch}%`);
      }
    }

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      // ✅ Enhanced error logging
      console.error('[GET /api/locations] DB Error:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        userId: user.id,
        timestamp: new Date().toISOString(),
      });
      
      return NextResponse.json(
        {
          error: 'Database error',
          message: 'Failed to fetch locations. Please try again later.',
          code: 'LOCATIONS_FETCH_ERROR'
        },
        { status: 500 }
      );
    }

    // Convert headers object to Record<string, string>
    const responseHeaders: Record<string, string> = {};
    if (rateLimitHeaders) {
      Object.entries(rateLimitHeaders).forEach(([key, value]) => {
        if (typeof value === 'string') {
          responseHeaders[key] = value;
        }
      });
    }

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page,
      pageSize,
      hasMore: (count || 0) > page * pageSize,
    }, {
      headers: responseHeaders
    });

  } catch (error: any) {
    // ✅ Structured error logging
    console.error('[GET /api/locations] Unexpected error:', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString(),
    });
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please try again later.',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

// POST - Create new location
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Authentication required. Please log in again.',
          code: 'AUTH_REQUIRED'
        },
        { status: 401 }
      );
    }

    // ✅ SECURITY: Rate limiting
    const { success, headers: rateLimitHeaders } = await checkRateLimit(user.id);
    if (!success) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          retry_after: rateLimitHeaders['X-RateLimit-Reset']
        },
        {
          status: 429,
          headers: rateLimitHeaders as HeadersInit
        }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'Request body must be valid JSON',
          code: 'INVALID_JSON'
        },
        { status: 400 }
      );
    }
    const { name, address, phone, website, category } = body;

    // ✅ Input validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'Validation error',
          message: 'Location name is required and must be a non-empty string',
          code: 'VALIDATION_ERROR',
          field: 'name'
        },
        { status: 400 }
      );
    }

    if (name.length > 200) {
      return NextResponse.json(
        {
          error: 'Validation error',
          message: 'Location name must be 200 characters or less',
          code: 'VALIDATION_ERROR',
          field: 'name'
        },
        { status: 400 }
      );
    }

    if (!address || typeof address !== 'string' || address.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'Validation error',
          message: 'Address is required and must be a non-empty string',
          code: 'VALIDATION_ERROR',
          field: 'address'
        },
        { status: 400 }
      );
    }

    if (address.length > 500) {
      return NextResponse.json(
        {
          error: 'Validation error',
          message: 'Address must be 500 characters or less',
          code: 'VALIDATION_ERROR',
          field: 'address'
        },
        { status: 400 }
      );
    }

    // Optional field validation
    if (phone && (typeof phone !== 'string' || phone.length > 50)) {
      return NextResponse.json(
        {
          error: 'Validation error',
          message: 'Phone must be a string with maximum 50 characters',
          code: 'VALIDATION_ERROR',
          field: 'phone'
        },
        { status: 400 }
      );
    }

    if (website && (typeof website !== 'string' || !website.match(/^https?:\/\/.+/))) {
      return NextResponse.json(
        {
          error: 'Validation error',
          message: 'Website must be a valid URL starting with http:// or https://',
          code: 'VALIDATION_ERROR',
          field: 'website'
        },
        { status: 400 }
      );
    }

    if (category && (typeof category !== 'string' || category.length > 100)) {
      return NextResponse.json(
        {
          error: 'Validation error',
          message: 'Category must be a string with maximum 100 characters',
          code: 'VALIDATION_ERROR',
          field: 'category'
        },
        { status: 400 }
      );
    }

    // Get active GMB account
    const { data: accounts } = await supabase
      .from('gmb_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (!accounts) {
      return NextResponse.json(
        { error: 'No active GMB account found' },
        { status: 400 }
      );
    }

    // Insert location
    const { data: location, error: insertError } = await supabase
      .from('gmb_locations')
      .insert({
        user_id: user.id,
        gmb_account_id: accounts.id,
        location_name: name,
        address: address,
        phone: phone || null,
        website: website || null,
        category: category || null,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[POST /api/locations] DB Error:', {
        error: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
        userId: user.id,
        timestamp: new Date().toISOString(),
      });
      
      return NextResponse.json(
        {
          error: 'Database error',
          message: 'Failed to create location. Please try again later.',
          code: 'LOCATION_CREATE_ERROR'
        },
        { status: 500 }
      );
    }

      // Convert headers object to Record<string, string>
      const responseHeaders: Record<string, string> = {};
      if (rateLimitHeaders) {
        Object.entries(rateLimitHeaders).forEach(([key, value]) => {
          if (typeof value === 'string') {
            responseHeaders[key] = value;
          }
        });
      }

      return NextResponse.json(
      { 
        data: location,
        message: 'Location created successfully'
      },
      { 
        status: 201,
        headers: responseHeaders
      }
    );

  } catch (error: any) {
    console.error('[POST /api/locations] Unexpected error:', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString(),
    });
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please try again later.',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

// PUT - Update location
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('id');
    
    if (!locationId) {
      return NextResponse.json(
        { error: 'Location ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, address, phone, website, category } = body;

    // Update location
    const updateData: any = {};
    if (name) updateData.location_name = name;
    if (address) updateData.address = address;
    if (phone !== undefined) updateData.phone = phone;
    if (website !== undefined) updateData.website = website;
    if (category !== undefined) updateData.category = category;

    const { data: location, error: updateError } = await supabase
      .from('gmb_locations')
      .update(updateData)
      .eq('id', locationId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('[PUT /api/locations] Error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update location' },
        { status: 500 }
      );
    }

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: location });

  } catch (error: any) {
    console.error('[PUT /api/locations] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete location
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('id');
    
    if (!locationId) {
      return NextResponse.json(
        { error: 'Location ID is required' },
        { status: 400 }
      );
    }

    // Soft delete (set is_active to false)
    const { error: deleteError } = await supabase
      .from('gmb_locations')
      .update({ is_active: false })
      .eq('id', locationId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('[DELETE /api/locations] Error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete location' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[DELETE /api/locations] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
