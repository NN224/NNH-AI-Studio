import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get date range from query params (default: last 7 days)
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    const locationId = searchParams.get('locationId');
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Build query for auto-answer logs
    let query = supabase
      .from('question_auto_answers_log')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', startDate.toISOString());

    if (locationId) {
      query = query.eq('location_id', locationId);
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error('Error fetching auto-answer logs:', error);
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }

    // Calculate statistics
    const totalAnswers = logs.length;
    const successfulAnswers = logs.filter(log => log.status === 'posted').length;
    const failedAnswers = logs.filter(log => log.status === 'failed').length;
    const pendingAnswers = logs.filter(log => log.status === 'pending').length;

    const successRate = totalAnswers > 0 
      ? Math.round((successfulAnswers / totalAnswers) * 100) 
      : 0;

    const avgConfidence = totalAnswers > 0
      ? Math.round(logs.reduce((sum, log) => sum + (log.confidence_score || 0), 0) / totalAnswers)
      : 0;

    const avgResponseTime = totalAnswers > 0
      ? Math.round(logs.reduce((sum, log) => sum + (log.processing_time_ms || 0), 0) / totalAnswers)
      : 0;

    const totalCost = logs.reduce((sum, log) => sum + (parseFloat(log.cost_usd) || 0), 0);

    // Get today's count
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCount = logs.filter(log => 
      new Date(log.created_at) >= todayStart
    ).length;

    // Get settings for confidence threshold
    const { data: settings } = await supabase
      .from('question_auto_answer_settings')
      .select('confidence_threshold')
      .eq('user_id', user.id)
      .single();

    // Get category breakdown
    const categoryBreakdown = logs.reduce((acc: Record<string, number>, log) => {
      const category = log.question_category || 'unknown';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    // Get recent answers (last 10)
    const { data: recentQuestionsData } = await supabase
      .from('gmb_questions')
      .select(`
        id,
        question_text,
        answer_text,
        location:gmb_locations(name),
        created_at,
        answered_at
      `)
      .eq('user_id', user.id)
      .eq('ai_answered', true)
      .order('answered_at', { ascending: false })
      .limit(10);

    const recentAnswers = (recentQuestionsData || []).map((q: any) => {
      const log = logs.find(l => l.question_id === q.id);
      return {
        id: q.id,
        question: q.question_text,
        answer: q.answer_text,
        locationName: q.location?.name || 'Unknown',
        answeredAt: q.answered_at,
        confidence: log?.confidence_score || 0,
      };
    });

    // Get weekly data for chart
    const weeklyData = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayLogs = logs.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate >= date && logDate < nextDate;
      });

      const daySuccess = dayLogs.filter(l => l.status === 'posted').length;
      const dayTotal = dayLogs.length;

      weeklyData.push({
        date: date.toISOString().split('T')[0],
        total: dayTotal,
        successful: daySuccess,
        failed: dayLogs.filter(l => l.status === 'failed').length,
        avgConfidence: dayTotal > 0
          ? Math.round(dayLogs.reduce((sum, l) => sum + (l.confidence_score || 0), 0) / dayTotal)
          : 0,
      });
    }

    return NextResponse.json({
      stats: {
        todayCount,
        totalAnswers,
        successfulAnswers,
        failedAnswers,
        pendingAnswers,
        successRate,
        avgConfidence,
        avgResponseTime,
        totalCost: totalCost.toFixed(4),
        confidenceThreshold: settings?.confidence_threshold || 80,
        categoryBreakdown,
        weeklyData,
      },
      recentAnswers,
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
