import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Cron job to process unanswered questions
 * Runs every 5 minutes (configured in vercel.json or cron service)
 * Endpoint: GET /api/cron/process-questions
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    
    // Get all unanswered questions from the last 24 hours
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    const { data: unansweredQuestions, error } = await supabase
      .from('gmb_questions')
      .select('id, user_id, location_id')
      .is('answer_text', null)
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: true })
      .limit(50); // Process max 50 questions per run

    if (error) {
      console.error('Error fetching unanswered questions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch questions' },
        { status: 500 }
      );
    }

    if (!unansweredQuestions || unansweredQuestions.length === 0) {
      return NextResponse.json({
        processed: 0,
        message: 'No unanswered questions to process',
      });
    }

    // Process each question
    const results = {
      total: unansweredQuestions.length,
      processed: 0,
      failed: 0,
      skipped: 0,
    };

    for (const question of unansweredQuestions) {
      try {
        // Check if auto-answer is enabled for this user/location
        const { data: settings } = await supabase
          .from('question_auto_answer_settings')
          .select('enabled')
          .eq('user_id', question.user_id)
          .eq('location_id', question.location_id)
          .single();

        if (!settings?.enabled) {
          results.skipped++;
          continue;
        }

        // Trigger auto-answer
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/questions/auto-answer`,
          {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${cronSecret}`, // Pass along for verification
            },
            body: JSON.stringify({
              questionId: question.id,
            }),
          }
        );

        if (response.ok) {
          results.processed++;
        } else {
          results.failed++;
          console.error(`Failed to process question ${question.id}`);
        }

        // Add small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        results.failed++;
        console.error(`Error processing question ${question.id}:`, error);
      }
    }

    // Log cron run
    await supabase.from('cron_logs').insert({
      job_name: 'process_questions',
      status: 'completed',
      details: results,
      executed_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      ...results,
      message: `Processed ${results.processed} questions, ${results.failed} failed, ${results.skipped} skipped`,
    });
  } catch (error) {
    console.error('Cron job error:', error);
    
    // Try to log the error
    try {
      const supabase = await createClient();
      await supabase.from('cron_logs').insert({
        job_name: 'process_questions',
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        executed_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('Failed to log cron error:', logError);
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Manual trigger endpoint (for testing)
 * POST /api/cron/process-questions
 */
export async function POST(request: NextRequest) {
  // Same logic as GET but allows manual triggering
  return GET(request);
}
