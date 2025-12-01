import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

// Input validation schema
const updateTaskSchema = z.object({
  task_id: z.string().uuid("Invalid task ID format"),
  status: z.enum(["pending", "in_progress", "completed", "dismissed"], {
    errorMap: () => ({ message: "Invalid status value" }),
  }),
});

/**
 * PATCH /api/tasks/update
 * Update task status with server-side validation and authorization
 */
export async function PATCH(request: Request) {
  const supabase = await createClient();

  // 1. Authenticate
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 2. Validate input
    const body = await request.json();
    const validation = updateTaskSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: validation.error.issues,
          message:
            validation.error.issues[0]?.message || "Invalid request data",
        },
        { status: 400 },
      );
    }

    const { task_id, status } = validation.data;

    // 3. Authorize: Check task belongs to user
    const { data: task, error: fetchError } = await supabase
      .from("weekly_task_recommendations")
      .select("user_id")
      .eq("id", task_id)
      .single();

    if (fetchError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 4. Update task
    const { error: updateError } = await supabase
      .from("weekly_task_recommendations")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", task_id)
      .eq("user_id", user.id); // Extra safety check

    if (updateError) {
      console.error("Task update error:", updateError);
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: "Task updated successfully",
    });
  } catch (error) {
    console.error("Task update error:", {
      error: error instanceof Error ? error.message : String(error),
      userId: user?.id || "unknown",
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Unable to update task. Please try again later.",
        code: "TASK_UPDATE_ERROR",
      },
      { status: 500 },
    );
  }
}
