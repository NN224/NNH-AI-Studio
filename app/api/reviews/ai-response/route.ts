import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

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

    // Generate AI response using existing endpoint
    const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'AI API key not configured' }, { status: 500 });
    }

    const AI_MODEL = 'gemini-2.5-flash';

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

    const userPrompt = `
      BUSINESS NAME: ${finalLocationName}
      RATING: ${rating} / 5 Stars
      CUSTOMER REVIEW: "${reviewText}"
      
      Generate a professional response to this review.
    `;

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.7,
          },
        }),
      }
    );

    const aiData = await aiResponse.json();

    if (!aiResponse.ok || !aiData.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Gemini API Error:', aiData);
      return NextResponse.json(
        { error: aiData.error?.message || 'AI service failed to generate content' },
        { status: 500 }
      );
    }

    const generatedResponse = aiData.candidates[0].content.parts[0].text.trim();

    // Save AI response to database
    const { error: updateError } = await supabase
      .from('gmb_reviews')
      .update({
        ai_generated_response: generatedResponse,
        ai_suggested_reply: generatedResponse, // Keep for backwards compatibility
        status: 'in_progress',
      })
      .eq('id', reviewId);

    if (updateError) {
      console.error('Error saving AI response:', updateError);
      // Continue anyway - response was generated
    }

    // Calculate confidence score (simple heuristic based on response length and rating)
    const confidence = Math.min(95, Math.max(60, 
      70 + (rating >= 4 ? 15 : rating <= 2 ? -10 : 0) + 
      (generatedResponse.length > 100 && generatedResponse.length < 400 ? 10 : 0)
    ));

    return NextResponse.json({
      response: generatedResponse,
      confidence: Math.round(confidence)
    });

  } catch (error: any) {
    console.error('AI Response API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

