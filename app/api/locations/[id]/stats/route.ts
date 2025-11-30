// Location Stats API
// Fetches statistics for a specific location including rating, reviews, and health score

import { createClient } from "@/lib/supabase/server";
import { getLocationStats } from "@/server/actions/locations";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  // Authentication check
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!params?.id) {
    return NextResponse.json(
      { error: "Location ID is required" },
      { status: 400 },
    );
  }

  try {
    const result = await getLocationStats(params.id);
    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load location stats";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
