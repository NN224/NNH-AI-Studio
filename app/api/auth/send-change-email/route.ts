import { createClient } from "@/lib/supabase/server";
import { authLogger } from "@/lib/utils/logger";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

    const { newEmail, redirectTo } = await request.json();

    if (!newEmail || !newEmail.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase.auth.updateUser(
      { email: newEmail },
      {
        emailRedirectTo:
          redirectTo ||
          `${process.env.NEXT_PUBLIC_BASE_URL || "https://nnh.ae"}/auth/callback`,
      },
    );

    if (error) {
      authLogger.error(
        "[Send Change Email] Error",
        error instanceof Error ? error : new Error(String(error)),
        { newEmail },
      );
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      message: "Change email confirmation sent successfully",
      data,
    });
  } catch (e: any) {
    authLogger.error(
      "[Send Change Email] Unexpected error",
      e instanceof Error ? e : new Error(String(e)),
      { email: request.headers.get("x-user-email") || undefined },
    );
    return NextResponse.json(
      { error: e.message || "Failed to send change email confirmation" },
      { status: 500 },
    );
  }
}
