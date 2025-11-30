/**
 * @deprecated MIGRATION NOTICE
 *
 * This API route is deprecated. Use Server Actions instead:
 *
 * ```ts
 * import { createNotification } from '@/server/actions/notifications';
 *
 * const { success, notification, error } = await createNotification({
 *   type: 'info',
 *   title: 'Title',
 *   message: 'Message',
 * });
 * ```
 *
 * This route will be removed in a future release.
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Helper function to create notifications
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, title, message, link, metadata } = await request.json();

    if (!type || !title || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // ✅ Use regular client - RLS handles user access
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: user.id,
        type,
        title,
        message,
        link: link || null,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ notification: data });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create notification";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
