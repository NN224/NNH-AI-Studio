// app/api/ai/generate-review-reply/route.ts (محدث للتعامل مع الأسئلة)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAIProvider } from '@/lib/ai/provider';

export const dynamic = 'force-dynamic';

/**
 * مسار API لتوليد رد/إجابة باستخدام نموذج Gemini.
 */
export async function POST(request: NextRequest) {
    // 💡 تصحيح متطلبات Supabase
    const supabase = await createClient(); 
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { reviewText, rating, tone, locationName, isQuestion } = await request.json();

        if (!reviewText || !tone || !locationName) {
            return NextResponse.json({ error: 'Missing required fields for AI generation.' }, { status: 400 });
        }

        // Get AI provider
        const aiProvider = await getAIProvider(user.id);
        if (!aiProvider) {
            console.error('[AI Generate Reply] No AI provider configured for user:', user.id);
            return NextResponse.json(
                { error: 'No AI provider configured. Please set up an API key in Settings > AI Configuration.' },
                { status: 500 }
            );
        }

        // ⭐️ منطق تحديد الهدف والموجه بناءً على ما إذا كان السؤال أم مراجعة ⭐️
        let systemRole = '';
        let promptHeader = '';

        if (isQuestion) {
            systemRole = `You are the official business representative. Provide a clear, concise, and helpful factual answer to the customer's question.`;
            promptHeader = `CUSTOMER QUESTION: "${reviewText}"\nTONE: ${tone}\nProvide the official answer.`;
        } else {
            systemRole = `You are an expert social media manager specializing in Google Business Profile review responses. 
                          Your goal is to generate a personalized response.`;
            promptHeader = `RATING: ${rating} / 5 Stars\nTONE REQUESTED: ${tone}\nCUSTOMER REVIEW: "${reviewText}"\nGenerate the response.`;
        }

        // بناء الموجه التفصيلي
        const systemInstruction = `
            ${systemRole}
            Instructions:
            1. Keep the response concise, typically under 500 characters.
            2. Match the requested tone: "${tone.toUpperCase()}".
            3. If the rating is low (3 or less), always include an apology and an invitation to contact the business offline.
            4. Do not include any introductory phrases like "Here is your response:".
        `;

        const userPrompt = `${systemInstruction}

BUSINESS NAME: ${locationName}
${promptHeader}`;

        const { content: aiReplyText, usage } = await aiProvider.generateCompletion(
            userPrompt,
            isQuestion ? 'question_auto_answer' : 'review_auto_reply'
        );

        if (!aiReplyText) {
            throw new Error('AI provider returned empty response');
        }

        console.log('[AI Generate Reply] Successfully generated, tokens used:', usage?.total_tokens);

        // إرجاع الرد
        return NextResponse.json({ success: true, reply: aiReplyText.trim() });

    } catch (error: any) {
        console.error('[AI Generate Reply] Error:', error);
        console.error('[AI Generate Reply] Error details:', {
            message: error.message,
            userId: user?.id,
        });
        return NextResponse.json({ 
            error: error.message || 'Failed to communicate with AI service.' 
        }, { status: 500 });
    }
}