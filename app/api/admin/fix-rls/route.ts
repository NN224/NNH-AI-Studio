import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = await createClient();

    // Drop old conflicting policies
    const sql = `
      -- Drop old user-based policies that conflict with team RBAC
      DROP POLICY IF EXISTS "Users can view their own locations" ON gmb_locations;
      DROP POLICY IF EXISTS "Users can insert their own locations" ON gmb_locations;
      DROP POLICY IF EXISTS "Users can update their own locations" ON gmb_locations;
      DROP POLICY IF EXISTS "Users can delete their own locations" ON gmb_locations;
    `;

    const { error } = await supabase.rpc("exec_sql", { sql_query: sql });

    if (error) {
      console.error("[fix-rls] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message:
        "Old RLS policies dropped successfully. Team policies will now handle access.",
    });
  } catch (error) {
    console.error("[fix-rls] Exception:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
