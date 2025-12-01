import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  getAutoReplySettings,
  saveAutoReplySettings,
  type AutoReplySettings,
} from "@/server/actions/auto-reply";
import { reviewsLogger } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

const controlSchema = z.object({
  action: z.enum(["pause", "resume", "reset"]),
  locationId: z.string().uuid().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const locationIdParam = request.nextUrl.searchParams.get("locationId");
    const result = await getAutoReplySettings(locationIdParam ?? undefined);

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error ?? "Failed to load auto-reply settings" },
        { status: 500 },
      );
    }

    return NextResponse.json({ settings: result.data });
  } catch (error) {
    reviewsLogger.error(
      "[Reviews][AutoReply][GET] Unexpected error",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Unexpected error while loading auto-reply settings" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const parsed = controlSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { action, locationId } = parsed.data;

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settingsResult = await getAutoReplySettings(locationId ?? undefined);

    if (!settingsResult.success || !settingsResult.data) {
      return NextResponse.json(
        { error: settingsResult.error ?? "Failed to load auto-reply settings" },
        { status: 500 },
      );
    }

    const updatedSettings: AutoReplySettings = {
      ...settingsResult.data,
      locationId: locationId ?? undefined,
      enabled: action === "resume" ? true : false,
    };

    const saveResult = await saveAutoReplySettings(updatedSettings);

    if (!saveResult.success) {
      return NextResponse.json(
        { error: saveResult.error ?? "Failed to update auto-reply settings" },
        { status: 500 },
      );
    }

    if (action === "reset") {
      const updateQuery = supabase
        .from("gmb_reviews")
        .update({
          ai_generated_response: null,
          ai_suggested_reply: null,
          status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("has_reply", false)
        .eq("status", "in_progress");

      if (locationId) {
        updateQuery.eq("location_id", locationId);
      }

      const { error: resetError } = await updateQuery;

      if (resetError) {
        reviewsLogger.error(
          "[Reviews][AutoReply][POST] Failed to clear queue",
          resetError instanceof Error
            ? resetError
            : new Error(String(resetError)),
          { userId: user.id, locationId },
        );
        return NextResponse.json(
          {
            error:
              "Auto-reply settings updated, but queue could not be cleared",
          },
          { status: 500 },
        );
      }
    }

    const message =
      action === "pause"
        ? "Auto-reply paused successfully"
        : action === "resume"
          ? "Auto-reply resumed"
          : "Auto-reply queue cleared and automation paused";

    return NextResponse.json({
      success: true,
      settings: updatedSettings,
      message,
    });
  } catch (error) {
    reviewsLogger.error(
      "[Reviews][AutoReply][POST] Unexpected error",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Unexpected error while updating auto-reply settings" },
      { status: 500 },
    );
  }
}
