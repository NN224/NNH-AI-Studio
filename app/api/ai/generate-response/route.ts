import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { review_text, rating, reviewer_name, location_name } = await request.json();

    // Validate input
    if (!review_text || !rating || !reviewer_name || !location_name) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Build context-aware prompt based on rating
    let tone = '';
    let instructions = '';
    
    if (rating >= 4) {
      tone = 'warm, grateful, and enthusiastic';
      instructions = 'Thank them warmly for their positive feedback and invite them to visit again.';
    } else if (rating === 3) {
      tone = 'understanding and improvement-focused';
      instructions = 'Thank them for feedback, acknowledge their experience, and express desire to improve.';
    } else {
      tone = 'empathetic, apologetic, and solution-oriented';
      instructions = 'Sincerely apologize, acknowledge their concerns, and offer to resolve the issue directly.';
    }

    const prompt = `You are a professional business manager responding to a Google My Business review for ${location_name}.

Review Details:
- Customer: ${reviewer_name}
- Rating: ${rating}/5 stars
- Review: "${review_text}"

Generate a professional response that:
1. Is ${tone}
2. ${instructions}
3. Is 2-4 sentences long (50-100 words)
4. Sounds natural and human (not robotic)
5. Addresses specific points from their review when possible
6. Uses proper English
7. Signs off appropriately (e.g., "Best regards, The ${location_name} Team")

Important: Write ONLY the response text, no additional commentary or explanations.`;

    // Call Anthropic Claude API
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 200,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Extract response text
    const responseText = message.content[0].type === 'text' 
      ? message.content[0].text 
      : '';

    if (!responseText) {
      throw new Error('No response generated');
    }

    return NextResponse.json({
      success: true,
      response: responseText.trim(),
      generated_at: new Date().toISOString(),
      model: 'claude-3-5-sonnet',
      usage: {
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens
      }
    });

  } catch (error: any) {
    console.error('AI Generation Error:', error);
    
    // Check for specific Anthropic errors
    if (error.status === 401) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key' },
        { status: 401 }
      );
    }
    
    if (error.status === 429) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please try again in a moment.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate response. Please try again.',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

