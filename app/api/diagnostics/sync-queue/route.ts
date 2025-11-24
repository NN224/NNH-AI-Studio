import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json(
        {
          success: false,
          error: "Unauthorized - No user session",
        },
        { status: 401 },
      );
    }

    // Query sync_queue table
    const { data: queueItems, error: queueError } = await supabase
      .from("sync_queue")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (queueError) {
      return Response.json({
        success: false,
        error: `Sync queue error: ${queueError.message}`,
        details: { queueError },
      });
    }

    const total = queueItems?.length || 0;
    const pending =
      queueItems?.filter((item) => item.status === "pending").length || 0;
    const processing =
      queueItems?.filter((item) => item.status === "processing").length || 0;
    const completed =
      queueItems?.filter((item) => item.status === "completed").length || 0;
    const failed =
      queueItems?.filter((item) => item.status === "failed").length || 0;

    // Detect stuck jobs (processing for more than 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const stuck =
      queueItems?.filter(
        (item) =>
          item.status === "processing" &&
          item.updated_at &&
          new Date(item.updated_at) < tenMinutesAgo,
      ).length || 0;

    const lastJob = queueItems && queueItems.length > 0 ? queueItems[0] : null;

    return Response.json({
      success: true,
      details: {
        total,
        pending,
        processing,
        completed,
        failed,
        stuck,
        last_job: lastJob
          ? {
              id: lastJob.id,
              status: lastJob.status,
              sync_type: lastJob.sync_type,
              created_at: lastJob.created_at,
              updated_at: lastJob.updated_at,
              error_message: lastJob.error_message,
            }
          : null,
        queue_items: queueItems?.slice(0, 10).map((item) => ({
          id: item.id,
          status: item.status,
          sync_type: item.sync_type,
          created_at: item.created_at,
        })),
      },
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
