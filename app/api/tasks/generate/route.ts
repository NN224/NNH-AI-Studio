import { apiLogger } from "@/lib/utils/logger";
import { generateWeeklyTasks } from "@/server/actions/weekly-tasks";
import { NextResponse } from "next/server";

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
    apiLogger.error(
      "Error generating weekly tasks",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
