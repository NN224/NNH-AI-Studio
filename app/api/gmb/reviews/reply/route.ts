import { NextRequest, NextResponse } from "next/server";
import { replyToReview } from "@/server/actions/reviews-management";
import { reviewReplySchema } from "@/lib/validations/schemas";
import { validateBody } from "@/middleware/validate-request";
import { sanitizeHtml } from "@/lib/security/sanitize-html";
import { checkRateLimit } from "@/lib/rate-limit";
import { withAuth } from "@/lib/api/auth-middleware";

export const dynamic = "force-dynamic";

async function handler(request: NextRequest, user: any) {
  try {
    // Rate limiting
    const { success, headers: rateLimitHeaders } = await checkRateLimit(
      user.id,
    );
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests", message: "Rate limit exceeded" },
        { status: 429, headers: rateLimitHeaders },
      );
    }

    const validation = await validateBody(request, reviewReplySchema);
    if (!validation.success) {
      return validation.response;
    }

    const { reviewId, replyText } = validation.data;
    const safeReplyText = sanitizeHtml(replyText).trim();

    // Delegate to existing server action which:
    // - Validates ownership
    // - Calls Google Business Profile API
    // - Updates gmb_reviews row
    const result = await replyToReview(reviewId, safeReplyText);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || "Failed to post reply",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message ?? "Reply posted successfully",
      data: result.data ?? null,
    });
  } catch (error: any) {
    console.error("[GMB Reviews][Reply] Unexpected error", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}

export const POST = withAuth(handler);
