import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponse, successResponse } from '@/lib/utils/api-response'
import { validateQuery, validateBody } from '@/middleware/validate-request'
import { questionFilterSchema, questionCreateSchema } from '@/lib/validations/schemas'
import { sanitizeHtml } from '@/lib/security/sanitize-html'
import { checkRateLimit } from '@/lib/rate-limit'
import { applySafeSearchFilter } from '@/lib/utils/secure-search'

export const dynamic = 'force-dynamic'

// Cache tag for questions
const QUESTIONS_CACHE_TAG = 'questions-data'

// GET - Fetch questions for user's locations
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401)
    }

    // Rate limiting
    const { success, headers: rateLimitHeaders } = await checkRateLimit(user.id)
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests', message: 'Rate limit exceeded' },
        { status: 429, headers: rateLimitHeaders },
      )
    }

    const queryValidation = validateQuery(request, questionFilterSchema)
    if (!queryValidation.success) {
      return queryValidation.response
    }

    const { locationId, status: rawStatus, page = 1, limit = 20, search } = queryValidation.data
    const offset = (page - 1) * limit

    // Map 'unanswered' to 'pending' for backward compatibility
    const status = rawStatus === 'unanswered' ? 'pending' : rawStatus

    // First get active GMB account IDs
    const { data: activeAccounts, error: accountsError } = await supabase
      .from('gmb_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (accountsError) {
      console.error('[Questions API] Error fetching active accounts:', accountsError)
      return errorResponse('DATABASE_ERROR', 'Failed to fetch active accounts', 500)
    }

    const activeAccountIds = activeAccounts?.map((acc) => acc.id) || []

    if (activeAccountIds.length === 0) {
      // No active accounts, return empty result
      return successResponse({
        questions: [],
        counts: { total: 0, pending: 0, answered: 0, draft: 0 },
        pagination: {
          limit,
          offset,
          hasMore: false,
        },
      })
    }

    // Get active location IDs
    const { data: activeLocations, error: locationsError } = await supabase
      .from('gmb_locations')
      .select('id')
      .eq('user_id', user.id)
      .in('gmb_account_id', activeAccountIds)

    if (locationsError) {
      console.error('[Questions API] Error fetching active locations:', locationsError)
      return errorResponse('DATABASE_ERROR', 'Failed to fetch active locations', 500)
    }

    const activeLocationIds = activeLocations?.map((loc) => loc.id) || []

    if (activeLocationIds.length === 0) {
      // No active locations, return empty result
      return successResponse({
        questions: [],
        counts: { total: 0, pending: 0, answered: 0, draft: 0 },
        pagination: {
          limit,
          offset,
          hasMore: false,
        },
      })
    }

    // Build optimized query - only fetch questions from active locations
    let query = supabase
      .from('gmb_questions')
      .select(
        `
        id,
        location_id,
        question_text,
        answer_text,
        answer_status,
        author_name,
        author_type,
        created_at,
        answered_at,
        upvote_count,
        ai_suggested_answer,
        ai_confidence_score,
        metadata,
        location:gmb_locations!inner(id, location_name)
      `,
      )
      .eq('user_id', user.id)
      .in('location_id', activeLocationIds)
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1)

    // Apply filters
    if (locationId && activeLocationIds.includes(locationId)) {
      query = query.eq('location_id', locationId)
    }
    if (status) {
      query = query.eq('answer_status', status)
    }
    if (search) {
      try {
        query = applySafeSearchFilter(query, search, ['question_text'])
      } catch (error) {
        console.error('[Questions API] Search validation failed:', error)
        // Continue without search filter if validation fails
      }
    }

    const { data: questions, error: questionsError } = await query

    if (questionsError) {
      console.error('[Questions API] Error fetching questions:', questionsError)
      return errorResponse('DATABASE_ERROR', 'Failed to fetch questions', 500)
    }

    // Get counts efficiently using aggregate queries (only for active locations)
    const [pendingResult, answeredResult, draftResult, totalResult] = await Promise.allSettled([
      supabase
        .from('gmb_questions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('location_id', activeLocationIds)
        .eq('answer_status', 'pending'),
      supabase
        .from('gmb_questions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('location_id', activeLocationIds)
        .eq('answer_status', 'answered'),
      supabase
        .from('gmb_questions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('location_id', activeLocationIds)
        .eq('answer_status', 'draft'),
      supabase
        .from('gmb_questions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('location_id', activeLocationIds),
    ])

    const pendingCount =
      pendingResult.status === 'fulfilled' && pendingResult.value.count !== null
        ? pendingResult.value.count
        : 0
    const answeredCount =
      answeredResult.status === 'fulfilled' && answeredResult.value.count !== null
        ? answeredResult.value.count
        : 0
    const draftCount =
      draftResult.status === 'fulfilled' && draftResult.value.count !== null
        ? draftResult.value.count
        : 0
    const totalCount =
      totalResult.status === 'fulfilled' && totalResult.value.count !== null
        ? totalResult.value.count
        : 0

    const counts = {
      total: totalCount,
      pending: pendingCount,
      answered: answeredCount,
      draft: draftCount,
    }

    const sanitizedQuestions = (questions || []).map((question) => ({
      ...question,
      question_text: question.question_text
        ? sanitizeHtml(question.question_text)
        : question.question_text,
      answer_text: question.answer_text ? sanitizeHtml(question.answer_text) : question.answer_text,
      ai_suggested_answer: question.ai_suggested_answer
        ? sanitizeHtml(question.ai_suggested_answer)
        : question.ai_suggested_answer,
    }))

    // Return with cache headers
    const response = successResponse({
      questions: sanitizedQuestions,
      counts,
      pagination: {
        limit,
        offset,
        hasMore: questions?.length === limit,
      },
    })

    // Add cache headers
    response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300')
    response.headers.set('X-Cache-Tag', QUESTIONS_CACHE_TAG)

    return response
  } catch (error: any) {
    console.error('[Questions API] Unexpected error:', error)
    return errorResponse('INTERNAL_ERROR', 'An unexpected error occurred', 500)
  }
}

// POST - Create a new question (manual entry or from sync)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401)
    }

    // Rate limiting
    const { success, headers: rateLimitHeaders } = await checkRateLimit(user.id)
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests', message: 'Rate limit exceeded' },
        { status: 429, headers: rateLimitHeaders },
      )
    }

    // Validate request body
    const validation = await validateBody(request, questionCreateSchema)
    if (!validation.success) {
      return validation.response
    }

    const { locationId, questionText, authorName, authorType } = validation.data
    const safeQuestionText = sanitizeHtml(questionText).trim()
    const safeAuthorName = authorName ? sanitizeHtml(authorName).trim() : 'Anonymous'

    // Verify location ownership
    const { data: location, error: locationError } = await supabase
      .from('gmb_locations')
      .select('id, gmb_account_id')
      .eq('id', locationId)
      .eq('user_id', user.id)
      .single()

    if (locationError || !location) {
      return errorResponse('NOT_FOUND', 'Location not found', 404)
    }

    // Create question
    const { data: question, error: createError } = await supabase
      .from('gmb_questions')
      .insert({
        user_id: user.id,
        location_id: locationId,
        gmb_account_id: location.gmb_account_id,
        question_text: safeQuestionText,
        author_name: safeAuthorName,
        author_type: authorType || 'CUSTOMER',
        answer_status: 'pending',
      })
      .select()
      .single()

    if (createError) {
      console.error('[Questions API] Error creating question:', createError)
      return errorResponse('DATABASE_ERROR', 'Failed to create question', 500)
    }

    return successResponse({
      question,
      message: 'Question created successfully',
    })
  } catch (error: any) {
    console.error('[Questions API] Unexpected error:', error)
    return errorResponse('INTERNAL_ERROR', 'An unexpected error occurred', 500)
  }
}
