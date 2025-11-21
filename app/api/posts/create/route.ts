import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      locationId,
      content,
      callToAction,
      mediaUrl,
      aiGenerated,
      promptUsed,
      tone,
    } = body;

    if (!locationId || !content) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 },
      );
    }

    // 1. Save to Database
    const { data: post, error } = await supabase
      .from("gmb_posts")
      .insert({
        user_id: user.id,
        location_id: locationId,
        content,
        call_to_action: callToAction,
        media_url: mediaUrl,
        ai_generated: aiGenerated,
        prompt_used: promptUsed,
        tone: tone,
        status: "published", // Assuming immediate publish for now
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("[Create Post] DB Error:", error);
      return NextResponse.json(
        { message: "Failed to save post" },
        { status: 500 },
      );
    }

    // 2. Trigger GMB API (Placeholder for now)
    // In a real implementation, we would call the Google My Business API here
    // using the user's access token.
    // await publishToGMB(post);

    return NextResponse.json(post);
  } catch (error) {
    console.error("[Create Post] Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
