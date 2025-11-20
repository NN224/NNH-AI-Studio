import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { getAIProvider } from '@/lib/ai/provider';

export const dynamic = 'force-dynamic';

const requestSchema = z.object({
  reviewId: z.string().uuid(),
  reviewText: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  locationName: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { reviewId, reviewText, rating, locationName } = validation.data;

    // Verify review belongs to user
    const { data: review, error: reviewError } = await supabase
      .from('gmb_reviews')
      .select('*, gmb_locations!inner(location_name, user_id)')
      .eq('id', reviewId)
      .single();

    if (reviewError || !review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Check if user owns this review
    if (review.gmb_locations.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const finalLocationName = locationName || review.gmb_locations.location_name || 'our business';

    const systemInstruction = `
      You are an expert social media manager specializing in Google Business Profile review responses.
      Your goal is to generate a personalized, professional response.
      
      Instructions:
      1. Keep the response concise, typically under 500 characters.
      2. Use a professional and friendly tone.
      3. If the rating is low (3 or less), always include an apology and an invitation to contact the business offline.
      4. If the rating is high (4-5), express gratitude and invite them back.
      5. Do not include any introductory phrases like "Here is your response:".
      6. Make it sound natural and human.
    `;

    // Generate AI response using unified provider system
    console.log('[AI Response] Generating reply for review:', reviewId);
    
    try {
      const aiProvider = await getAIProvider(user.id);
      if (!aiProvider) {
        console.error('[AI Response] No AI provider configured for user:', user.id);
        return NextResponse.json(
          { error: 'No AI provider configured. Please set up an API key in Settings > AI Configuration.' },
          { status: 500 }
        );
      }

      const prompt = `${systemInstruction}

BUSINESS NAME: ${finalLocationName}
RATING: ${rating} / 5 Stars
REVIEW: "${reviewText}"

Generate a natural, professional, short reply (max 500 chars). Tone: friendly and authentic.`;

      const { content: generatedResponse, usage } = await aiProvider.generateCompletion(
        prompt,
        'review_auto_reply',
        review.location_id
      );

      if (!generatedResponse) {
        throw new Error('AI provider returned empty response');
      }

      const usedModel = 'auto-detected';
      console.log('[AI Response] Successfully generated reply, tokens used:', usage?.total_tokens);

    // Quality check and sentiment analysis
    const positiveWords = ['great', 'excellent', 'amazing', 'love', 'happy', 'perfect'];
    const negativeWords = ['bad', 'terrible', 'disappointed', 'poor', 'awful', 'angry'];
    const reviewLower = reviewText.toLowerCase();

    const sentiment =
      positiveWords.some(w => reviewLower.includes(w)) && rating >= 4
        ? 'positive'
        : negativeWords.some(w => reviewLower.includes(w)) || rating <= 2
        ? 'negative'
        : 'neutral';

    const qualityScore =
      Math.min(100, generatedResponse.length / 5 + (sentiment === 'positive' ? 10 : 0)) || 70;

    // Save AI response to main reviews table
    const { error: updateError } = await supabase
      .from('gmb_reviews')
      .update({
        ai_generated_response: generatedResponse,
        ai_suggested_reply: generatedResponse,
        sentiment,
        ai_model_used: usedModel,
        quality_score: Math.round(qualityScore),
        status: 'in_progress',
      })
      .eq('id', reviewId);

    // Save analytics record
    await supabase.from('ai_generated_replies').insert({
      review_id: reviewId,
      user_id: user.id,
      location_name: finalLocationName,
      review_text: reviewText,
      rating,
      ai_model: usedModel,
      generated_response: generatedResponse,
      sentiment,
      confidence_score: Math.round(
        Math.min(
          95,
          Math.max(
            60,
            70 +
              (rating >= 4 ? 15 : rating <= 2 ? -10 : 0) +
              (generatedResponse.length > 100 && generatedResponse.length < 400 ? 10 : 0)
          )
        )
      ),
      created_at: new Date().toISOString(),
    });

    // Log all actions for audit trail
    await supabase.from('ai_response_logs').insert({
      user_id: user.id,
      review_id: reviewId,
      model_used: usedModel,
      success: true,
      sentiment,
      quality_score: Math.round(qualityScore),
      created_at: new Date().toISOString(),
    });

    console.log(`[AI Response] Generated and logged successfully (model: ${usedModel}, sentiment: ${sentiment})`);

    return NextResponse.json({
      response: generatedResponse,
      model: usedModel,
      sentiment,
      qualityScore: Math.round(qualityScore),
      logged: true,
    });

    } catch (aiError: any) {
      console.error('[AI Response] AI generation failed:', aiError);
      return NextResponse.json(
        { error: 'AI service failed to generate content', details: aiError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[AI Response] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI response', details: error.message },
      { status: 500 }
    );
  }
}
