import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

    const { data, error } = await supabase
      .from("youtube_drafts")
      .select("id, title, description, hashtags, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return NextResponse.json({ items: data || [] });
  } catch (e:any) {
    return NextResponse.json({ error: e.message || "Failed to load drafts" }, { status:500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

    const { title, description, hashtags } = await req.json();
    if (!title) return NextResponse.json({ error:"Missing title" }, { status:400 });

    const { error } = await supabase
      .from("youtube_drafts")
      .insert({ user_id: user.id, title, description: description || "", hashtags: hashtags || "" });
    if (error) throw error;

    return NextResponse.json({ ok:true });
  } catch (e:any) {
    return NextResponse.json({ error: e.message || "Failed to save draft" }, { status:500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

    const id = new URL(req.url).searchParams.get("id") || "";
    if (!id) return NextResponse.json({ error:"Missing id" }, { status:400 });

    const { error } = await supabase.from("youtube_drafts").delete().eq("id", id).eq("user_id", user.id);
    if (error) throw error;

    return NextResponse.json({ ok:true });
  } catch (e:any) {
    return NextResponse.json({ error: e.message || "Failed to delete draft" }, { status:500 });
  }
}