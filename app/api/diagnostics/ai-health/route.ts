import { createClient } from '@/lib/supabase/server';

/**
 * AI Features Health Check
 * Tests AI providers and features availability
 */
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

    const aiHealth = {
      providers: {
        anthropic: {
          configured: !!process.env.ANTHROPIC_API_KEY,
          tested: false,
          success: false,
          error: null as string | null,
          response_time_ms: 0,
        },
        openai: {
          configured: !!process.env.OPENAI_API_KEY,
          tested: false,
          success: false,
          error: null as string | null,
          response_time_ms: 0,
        },
        google: {
          configured: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
          tested: false,
          success: false,
          error: null as string | null,
          response_time_ms: 0,
        },
        groq: {
          configured: !!process.env.GROQ_API_KEY,
          tested: false,
          success: false,
          error: null as string | null,
          response_time_ms: 0,
        },
      },
      features: {
        auto_reply: {
          enabled: false,
          recent_requests: 0,
          success_rate: 0,
          last_used: null as string | null,
        },
        auto_answer: {
          enabled: false,
          recent_requests: 0,
          success_rate: 0,
          last_used: null as string | null,
        },
        content_generation: {
          recent_requests: 0,
          success_rate: 0,
          last_used: null as string | null,
        },
      },
    };

    // Test Anthropic (Primary)
    if (aiHealth.providers.anthropic.configured) {
      try {
        const startTime = Date.now();
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': process.env.ANTHROPIC_API_KEY!,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Test' }],
          }),
        });

        aiHealth.providers.anthropic.response_time_ms = Date.now() - startTime;
        aiHealth.providers.anthropic.tested = true;
        aiHealth.providers.anthropic.success = response.ok;

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          aiHealth.providers.anthropic.error = error.error?.message || `HTTP ${response.status}`;
        }
      } catch (error) {
        aiHealth.providers.anthropic.tested = true;
        aiHealth.providers.anthropic.error = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    // Test OpenAI (Secondary)
    if (aiHealth.providers.openai.configured) {
      try {
        const startTime = Date.now();
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: 'Test' }],
            max_tokens: 10,
          }),
        });

        aiHealth.providers.openai.response_time_ms = Date.now() - startTime;
        aiHealth.providers.openai.tested = true;
        aiHealth.providers.openai.success = response.ok;

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          aiHealth.providers.openai.error = error.error?.message || `HTTP ${response.status}`;
        }
      } catch (error) {
        aiHealth.providers.openai.tested = true;
        aiHealth.providers.openai.error = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    // Test Google (Gemini)
    if (aiHealth.providers.google.configured) {
      try {
        const startTime = Date.now();
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Test' }] }],
            }),
          }
        );

        aiHealth.providers.google.response_time_ms = Date.now() - startTime;
        aiHealth.providers.google.tested = true;
        aiHealth.providers.google.success = response.ok;

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          aiHealth.providers.google.error = error.error?.message || `HTTP ${response.status}`;
        }
      } catch (error) {
        aiHealth.providers.google.tested = true;
        aiHealth.providers.google.error = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    // Test Groq
    if (aiHealth.providers.groq.configured) {
      try {
        const startTime = Date.now();
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'mixtral-8x7b-32768',
            messages: [{ role: 'user', content: 'Test' }],
            max_tokens: 10,
          }),
        });

        aiHealth.providers.groq.response_time_ms = Date.now() - startTime;
        aiHealth.providers.groq.tested = true;
        aiHealth.providers.groq.success = response.ok;

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          aiHealth.providers.groq.error = error.error?.message || `HTTP ${response.status}`;
        }
      } catch (error) {
        aiHealth.providers.groq.tested = true;
        aiHealth.providers.groq.error = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    // Check AI features usage from ai_requests table
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const { data: aiRequests } = await supabase
      .from('ai_requests')
      .select('feature, status, created_at')
      .eq('user_id', user.id)
      .gte('created_at', oneDayAgo.toISOString())
      .order('created_at', { ascending: false });

    if (aiRequests) {
      // Auto-reply stats
      const autoReplyRequests = aiRequests.filter(r => r.feature === 'review_reply');
      if (autoReplyRequests.length > 0) {
        aiHealth.features.auto_reply.recent_requests = autoReplyRequests.length;
        const successful = autoReplyRequests.filter(r => r.status === 'success');
        aiHealth.features.auto_reply.success_rate =
          Math.round((successful.length / autoReplyRequests.length) * 100);
        aiHealth.features.auto_reply.last_used = autoReplyRequests[0].created_at;
      }

      // Auto-answer stats
      const autoAnswerRequests = aiRequests.filter(r => r.feature === 'question_answer');
      if (autoAnswerRequests.length > 0) {
        aiHealth.features.auto_answer.recent_requests = autoAnswerRequests.length;
        const successful = autoAnswerRequests.filter(r => r.status === 'success');
        aiHealth.features.auto_answer.success_rate =
          Math.round((successful.length / autoAnswerRequests.length) * 100);
        aiHealth.features.auto_answer.last_used = autoAnswerRequests[0].created_at;
      }

      // Content generation stats
      const contentRequests = aiRequests.filter(r => r.feature === 'content_generation');
      if (contentRequests.length > 0) {
        aiHealth.features.content_generation.recent_requests = contentRequests.length;
        const successful = contentRequests.filter(r => r.status === 'success');
        aiHealth.features.content_generation.success_rate =
          Math.round((successful.length / contentRequests.length) * 100);
        aiHealth.features.content_generation.last_used = contentRequests[0].created_at;
      }
    }

    // Check auto-reply settings
    const { data: autoReplySettings } = await supabase
      .from('auto_reply_settings')
      .select('enabled')
      .eq('user_id', user.id)
      .maybeSingle();

    if (autoReplySettings) {
      aiHealth.features.auto_reply.enabled = autoReplySettings.enabled;
    }

    // Determine overall AI health
    const configuredProviders = Object.values(aiHealth.providers).filter(p => p.configured).length;
    const workingProviders = Object.values(aiHealth.providers).filter(p => p.success).length;
    const hasWorkingProvider = workingProviders > 0;
    const allConfiguredWorking = configuredProviders > 0 && workingProviders === configuredProviders;

    let aiStatus = 'degraded';
    if (workingProviders === 0) aiStatus = 'all_providers_down';
    else if (allConfiguredWorking) aiStatus = 'healthy';
    else if (hasWorkingProvider) aiStatus = 'partial';

    return Response.json({
      success: hasWorkingProvider,
      details: {
        ai_status: aiStatus,
        summary: {
          configured_providers: configuredProviders,
          working_providers: workingProviders,
          fallback_available: workingProviders > 1,
        },
        ...aiHealth,
      },
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
