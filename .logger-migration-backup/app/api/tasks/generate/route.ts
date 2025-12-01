import { NextResponse } from "next/server";
import { generateWeeklyTasks } from "@/server/actions/weekly-tasks";

interface GenerateWeeklyTasksBody {
  locationId?: string | null;
}

export async function POST(request: Request) {
  try {
    const body = (await request
      .json()
      .catch(() => ({}))) as GenerateWeeklyTasksBody;
    const locationId = body?.locationId ?? undefined;

    const result = await generateWeeklyTasks(locationId);

    if (!result.success) {
      if (result.error === "Not authenticated") {
        return NextResponse.json({ error: result.error }, { status: 401 });
      }

      if (result.error === "Tasks for this week already exist") {
        return NextResponse.json({ success: true, tasks_exist: true });
      }

      return NextResponse.json(
        { success: false, error: result.error ?? "Failed to generate tasks" },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, tasks: result.data ?? [] });
  } catch (error) {
    console.error("[Weekly Tasks API] Error generating tasks:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
