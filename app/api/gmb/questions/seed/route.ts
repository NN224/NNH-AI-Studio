import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { errorResponse, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

// POST - Seed sample questions for testing
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    // Get user's first location
    const { data: locations } = await supabase
      .from('gmb_locations')
      .select('id, location_name, gmb_account_id')
      .eq('user_id', user.id)
      .limit(1);

    if (!locations || locations.length === 0) {
      return errorResponse('NOT_FOUND', 'No locations found. Please sync your GMB account first.', 404);
    }

    const location = locations[0];

    // Sample questions data
    const sampleQuestions = [
      {
        question_text: "What are your business hours on weekends?",
        author_name: "John Smith",
        author_type: "CUSTOMER",
        answer_status: "pending",
        upvote_count: 3,
        ai_suggested_answer: "We are open on Saturdays from 9 AM to 6 PM and Sundays from 10 AM to 5 PM. Feel free to visit us during these hours!",
        ai_confidence_score: 0.85
      },
      {
        question_text: "Do you offer delivery services?",
        author_name: "Sarah Johnson",
        author_type: "CUSTOMER",
        answer_status: "answered",
        answer_text: "Yes, we offer delivery services within a 10-mile radius. You can place orders through our website or by calling us directly.",
        answered_by: user.email || "Business Owner",
        answered_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        upvote_count: 7
      },
      {
        question_text: "Is parking available at your location?",
        author_name: "Mike Davis",
        author_type: "CUSTOMER",
        answer_status: "draft",
        answer_text: "Yes, we have ample free parking available for our customers right in front of our store.",
        upvote_count: 2,
        ai_suggested_answer: "Free parking is available in our dedicated lot with space for over 50 vehicles.",
        ai_confidence_score: 0.92
      },
      {
        question_text: "Do you accept credit cards?",
        author_name: "Emily Wilson",
        author_type: "CUSTOMER",
        answer_status: "answered",
        answer_text: "Yes, we accept all major credit cards including Visa, Mastercard, American Express, and Discover. We also accept digital payments like Apple Pay and Google Pay.",
        answered_by: user.email || "Business Owner",
        answered_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        upvote_count: 5
      },
      {
        question_text: "Are you wheelchair accessible?",
        author_name: "Robert Brown",
        author_type: "CUSTOMER",
        answer_status: "pending",
        upvote_count: 1,
        ai_suggested_answer: "Yes, our location is fully wheelchair accessible with ramps and wide doorways to ensure comfortable access for all customers.",
        ai_confidence_score: 0.78
      }
    ];

    // Insert sample questions
    const questionsToInsert = sampleQuestions.map(q => ({
      ...q,
      user_id: user.id,
      location_id: location.id,
      gmb_account_id: location.gmb_account_id,
      created_at: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString() // Random time in last 7 days
    }));

    const { data: insertedQuestions, error: insertError } = await supabase
      .from('gmb_questions')
      .insert(questionsToInsert)
      .select();

    if (insertError) {
      console.error('[Questions Seed] Error inserting sample questions:', insertError);
      return errorResponse('DATABASE_ERROR', 'Failed to create sample questions', 500);
    }

    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        activity_type: 'sample_data_created',
        activity_message: `Created ${insertedQuestions?.length || 0} sample questions for testing`,
        metadata: { location_id: location.id }
      });

    return successResponse({
      questions: insertedQuestions,
      message: `Successfully created ${insertedQuestions?.length || 0} sample questions`
    });

  } catch (error: any) {
    console.error('[Questions Seed] Unexpected error:', error);
    return errorResponse('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
