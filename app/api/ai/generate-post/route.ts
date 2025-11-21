import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const anthropic = new Anthropic({
  apiKey: process.env.SYSTEM_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { locationId, intent, tone = "professional" } = body;

    if (!locationId || !intent) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // 1. Fetch Business Context
    const { data: services } = await supabase
      .from("gmb_services")
      .select("name, description, price")
      .eq("location_id", locationId)
      .limit(5);

    const { data: reviews } = await supabase
      .from("gmb_reviews")
      .select("comment, star_rating, reviewer")
      .eq("location_id", locationId)
      .eq("star_rating", "FIVE")
      .limit(3);

    // 2. Construct Prompt
    const contextPrompt = `
      Business Context:
      Services: ${JSON.stringify(services?.map((s) => s.name).join(", ") || "General Services")}
      Recent 5-Star Reviews: ${JSON.stringify(reviews?.map((r) => r.comment).join(" | ") || "No recent reviews")}
      
      User Intent: ${intent}
      Tone: ${tone}
    `;

    const systemPrompt = `
      You are an expert Social Media Manager for a local business. 
      Your goal is to create engaging Google Business Profile posts that drive action.
      
      Rules:
      - Keep it under 1500 characters.
      - Use emojis moderately but effectively.
      - Include a clear Call to Action (CTA).
      - Use the provided Business Context to make the post specific and relevant.
      - If the user intent relates to a service, mention that service's details.
      - If the user intent relates to reviews, quote a positive review.
      - IMPORTANT: Return ONLY a valid JSON object. Do not include any conversational text before or after the JSON.
      
      Output Format (JSON):
      {
        "content": "The post text...",
        "callToAction": "BOOK_now" | "ORDER_online" | "LEARN_more" | "CALL_now",
        "imagePrompt": "A detailed prompt for DALL-E to generate an image for this post"
      }
    `;

    // 3. Generate Content with Claude 3.5 Sonnet
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 1024,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: "user", content: contextPrompt }],
    });

    // Parse the response
    // Claude might return text blocks, we need to extract the JSON
    const textContent =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Basic cleanup to ensure we get just the JSON
    const jsonString = textContent.replace(/```json\n?|\n?```/g, "").trim();

    let result;
    try {
      result = JSON.parse(jsonString);
    } catch (_e) {
      console.error("Failed to parse JSON from Claude:", textContent);
      // Fallback if JSON parsing fails
      result = {
        content: textContent,
        callToAction: "LEARN_more",
        imagePrompt: "A professional photo representing the business service",
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[AI Generate Post] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
