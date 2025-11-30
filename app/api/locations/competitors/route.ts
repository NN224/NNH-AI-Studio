import { createClient } from "@/lib/supabase/server";
import { getCompetitors } from "@/server/actions/locations";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Authentication check
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng");
  const categoryId = searchParams.get("categoryId") ?? undefined;
  const categoryName = searchParams.get("categoryName") ?? undefined;
  const keywordsParam = searchParams.get("keywords") ?? "";

  if (!latParam || !lngParam) {
    return NextResponse.json(
      { error: "Latitude and longitude are required" },
      { status: 400 },
    );
  }

  const lat = Number(latParam);
  const lng = Number(lngParam);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "Latitude and longitude must be valid numbers" },
      { status: 400 },
    );
  }

  try {
    const keywords = keywordsParam
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    const result = await getCompetitors({
      lat,
      lng,
      categoryId,
      categoryName,
      keywords,
    });
    return NextResponse.json({
      success: true,
      competitors: result.competitors,
      error: result.error ?? null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to retrieve competitors";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
