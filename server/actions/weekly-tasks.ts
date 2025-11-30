"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type PriorityLevel = "high" | "medium" | "low";

interface WeeklyTaskInsert {
  user_id: string;
  week_start_date: string;
  week_end_date: string;
  title: string;
  description: string;
  category: string;
  priority: PriorityLevel;
  effort_level: string;
  estimated_minutes: number;
  status: "pending";
  reasoning: string;
  expected_impact: string;
}

interface WeeklyTaskSeeds {
  pendingReviews: Array<{ rating: number | null }>;
  unansweredQuestions: Array<unknown>;
  recentPosts: Array<{ published_at: string | null }>;
}

const PRIORITY_RANK: Record<PriorityLevel, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const MAX_DEFAULT_TASKS = 5;

function calculateWeekStart(date = new Date()): string {
  const result = new Date(date);
  const dayOfWeek = result.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result.toISOString().split("T")[0]!;
}

function calculateWeekEnd(weekStartIso: string): string {
  const start = new Date(weekStartIso);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end.toISOString().split("T")[0]!;
}

async function requireAuthenticatedUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: "Not authenticated" as const, user: null };
  }

  return { user, error: null };
}

async function loadTaskSeeds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  locationId?: string,
): Promise<WeeklyTaskSeeds> {
  let reviewsQuery = supabase
    .from("gmb_reviews")
    .select("rating")
    .eq("user_id", userId)
    .eq("has_reply", false);

  let questionsQuery = supabase
    .from("gmb_questions")
    .select("id")
    .eq("user_id", userId)
    .eq("answer_status", "pending");

  let postsQuery = supabase
    .from("gmb_posts")
    .select("published_at")
    .eq("user_id", userId)
    .order("published_at", { ascending: false })
    .limit(1);

  if (locationId && locationId !== "all") {
    reviewsQuery = reviewsQuery.eq("location_id", locationId);
    questionsQuery = questionsQuery.eq("location_id", locationId);
    postsQuery = postsQuery.eq("location_id", locationId);
  }

  const [
    { data: pendingReviews = [] },
    { data: unansweredQuestions = [] },
    { data: recentPosts = [] },
  ] = await Promise.all([reviewsQuery, questionsQuery, postsQuery]);

  return {
    pendingReviews: pendingReviews ?? [],
    unansweredQuestions: unansweredQuestions ?? [],
    recentPosts: recentPosts ?? [],
  };
}

async function tasksAlreadyExist(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  weekStartDate: string,
) {
  const { data: existingTasks } = await supabase
    .from("weekly_task_recommendations")
    .select("id")
    .eq("user_id", userId)
    .eq("week_start_date", weekStartDate)
    .limit(1);

  return Boolean(existingTasks?.length);
}

function buildReviewTask(
  userId: string,
  weekStartDate: string,
  weekEndDate: string,
  reviews: WeeklyTaskSeeds["pendingReviews"],
) {
  if (reviews.length === 0) {
    return null;
  }

  const urgentCount = reviews.filter(
    (review) => (review.rating ?? 5) <= 3,
  ).length;
  const totalCount = Math.min(reviews.length, 10);
  const hasUrgentReviews = urgentCount > 0;
  const priority: PriorityLevel = hasUrgentReviews
    ? "high"
    : reviews.length > 5
      ? "medium"
      : "low";
  const effort = reviews.length > 5 ? "moderate" : "quick";
  const urgentSuffix = totalCount > 1 ? "s" : "";
  const title = hasUrgentReviews
    ? `⚠️ Reply to ${urgentCount} low-rating review${urgentCount > 1 ? "s" : ""} (${totalCount} total pending)`
    : `Reply to ${totalCount} pending review${urgentSuffix}`;

  const reasoningDetail = hasUrgentReviews
    ? `, including ${urgentCount} with 3 stars or lower`
    : "";
  const reasoning = `You have ${reviews.length} unanswered reviews${reasoningDetail}.`;

  return {
    user_id: userId,
    week_start_date: weekStartDate,
    week_end_date: weekEndDate,
    title,
    description: hasUrgentReviews
      ? "Low-rating reviews need immediate attention to show you care about customer feedback."
      : "Respond to customer feedback to improve engagement and show you value their opinions.",
    category: "reviews",
    priority,
    effort_level: effort,
    estimated_minutes: Math.min(reviews.length * 3, 30),
    status: "pending" as const,
    reasoning,
    expected_impact:
      "Replying to reviews improves customer relationships and signals to Google that you're an active business.",
  };
}

function buildQuestionTask(
  userId: string,
  weekStartDate: string,
  weekEndDate: string,
  questions: WeeklyTaskSeeds["unansweredQuestions"],
) {
  if (questions.length === 0) {
    return null;
  }

  const count = Math.min(questions.length, 10);
  const pluralSuffix = count > 1 ? "s" : "";

  return {
    user_id: userId,
    week_start_date: weekStartDate,
    week_end_date: weekEndDate,
    title: `Answer ${count} customer question${pluralSuffix}`,
    description:
      "Help potential customers by answering their questions about your business.",
    category: "questions",
    priority: "medium" as const,
    effort_level: count > 3 ? "moderate" : "quick",
    estimated_minutes: count * 2,
    status: "pending" as const,
    reasoning: `${questions.length} unanswered customer questions are waiting.`,
    expected_impact:
      "Answering questions helps convert browsers into customers and improves your Q&A visibility.",
  };
}

function buildContentTask(
  userId: string,
  weekStartDate: string,
  weekEndDate: string,
  recentPosts: WeeklyTaskSeeds["recentPosts"],
) {
  const latestPublishedAt = recentPosts[0]?.published_at;
  const daysSinceLastPost = latestPublishedAt
    ? Math.floor(
        (Date.now() - new Date(latestPublishedAt).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 30;
  const isOverdue = daysSinceLastPost > 14;

  const title = isOverdue
    ? "🚨 Create a Google Business post (overdue)"
    : "Create a new post to engage customers";
  const reasoning = isOverdue
    ? `It's been ${daysSinceLastPost} days since your last post. Regular posting improves visibility.`
    : "Regular posting (2-3x per week) keeps your business profile fresh and engaging.";

  return {
    user_id: userId,
    week_start_date: weekStartDate,
    week_end_date: weekEndDate,
    title,
    description:
      "Share updates, offers, or news to keep your profile active and visible in search results.",
    category: "content",
    priority: isOverdue ? ("high" as const) : ("medium" as const),
    effort_level: "quick",
    estimated_minutes: 5,
    status: "pending" as const,
    reasoning,
    expected_impact:
      "Posts appear in Google Search and Maps, attracting more potential customers to your business.",
  };
}

function buildPhotoTask(
  userId: string,
  weekStartDate: string,
  weekEndDate: string,
): WeeklyTaskInsert {
  return {
    user_id: userId,
    week_start_date: weekStartDate,
    week_end_date: weekEndDate,
    title: "Upload 3-5 new photos",
    description:
      "Fresh, high-quality photos attract more customers and improve your profile's appeal.",
    category: "media",
    priority: "low",
    effort_level: "quick",
    estimated_minutes: 10,
    status: "pending",
    reasoning:
      "Businesses with recent photos get 42% more requests for directions and 35% more clicks to their website.",
    expected_impact:
      "Updated photos increase engagement and help customers visualize your business.",
  };
}

function buildInfoTask(
  userId: string,
  weekStartDate: string,
  weekEndDate: string,
): WeeklyTaskInsert {
  return {
    user_id: userId,
    week_start_date: weekStartDate,
    week_end_date: weekEndDate,
    title: "Verify business hours and contact info",
    description:
      "Ensure all business information is accurate, especially for holidays or special events.",
    category: "info_management",
    priority: "low",
    effort_level: "quick",
    estimated_minutes: 5,
    status: "pending",
    reasoning:
      "Accurate business information prevents customer frustration and improves trust.",
    expected_impact:
      "Correct information reduces customer complaints and improves your business reputation.",
  };
}

function selectTasksForInsertion(tasks: WeeklyTaskInsert[]) {
  const sortedTasks = [...tasks].sort(
    (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
  );
  return sortedTasks.slice(0, MAX_DEFAULT_TASKS);
}

/**
 * Generate intelligent weekly tasks based on location data
 */
export async function generateWeeklyTasks(locationId?: string) {
  try {
    const supabase = await createClient();

    const { user, error } = await requireAuthenticatedUser(supabase);

    if (error || !user) {
      return {
        success: false,
        error: error ?? "Not authenticated",
        data: [],
      };
    }

    const weekStartDate = calculateWeekStart();
    const weekEndDate = calculateWeekEnd(weekStartDate);
    const seeds = await loadTaskSeeds(supabase, user.id, locationId);

    if (await tasksAlreadyExist(supabase, user.id, weekStartDate)) {
      return {
        success: false,
        error: "Tasks for this week already exist",
        data: [],
      };
    }

    const generatedTasks: WeeklyTaskInsert[] = [
      buildReviewTask(
        user.id,
        weekStartDate,
        weekEndDate,
        seeds.pendingReviews,
      ),
      buildQuestionTask(
        user.id,
        weekStartDate,
        weekEndDate,
        seeds.unansweredQuestions,
      ),
      buildContentTask(user.id, weekStartDate, weekEndDate, seeds.recentPosts),
      buildPhotoTask(user.id, weekStartDate, weekEndDate),
      buildInfoTask(user.id, weekStartDate, weekEndDate),
    ].filter(Boolean) as WeeklyTaskInsert[];

    const tasksToInsert = selectTasksForInsertion(generatedTasks);

    const { data, error: insertError } = await supabase
      .from("weekly_task_recommendations")
      .insert(tasksToInsert)
      .select();

    if (insertError) {
      console.error("[Weekly Tasks] Insert error:", insertError);
      return {
        success: false,
        error: "Failed to generate tasks",
        data: [],
      };
    }

    revalidatePath("/dashboard");

    return {
      success: true,
      data: data ?? [],
    };
  } catch (error: unknown) {
    console.error("[Weekly Tasks] Error generating tasks:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to generate weekly tasks",
      data: [],
    };
  }
}

/**
 * Toggle task completion status
 */
export async function toggleTask(taskId: string, completed: boolean) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Not authenticated",
      };
    }

    const { error } = await supabase
      .from("weekly_task_recommendations")
      .update({
        status: completed ? "completed" : "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)
      .eq("user_id", user.id);

    if (error) {
      console.error("[Weekly Tasks] Toggle error:", error);
      return {
        success: false,
        error: "Failed to update task",
      };
    }

    revalidatePath("/dashboard");

    return {
      success: true,
    };
  } catch (error: unknown) {
    console.error("[Weekly Tasks] Error toggling task:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update task",
    };
  }
}

/**
 * Get weekly tasks for current week
 */
export async function getWeeklyTasks(_locationId?: string) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Not authenticated",
        data: [],
      };
    }

    // Calculate week start date (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);

    const weekStartDate = weekStart.toISOString().split("T")[0];
    const weekEndDate = calculateWeekEnd(weekStartDate);

    const { data, error } = await supabase
      .from("weekly_task_recommendations")
      .select("*")
      .eq("user_id", user.id)
      .eq("week_start_date", weekStartDate)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[Weekly Tasks] Fetch error:", error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }

    return {
      success: true,
      data: (data ?? []).map((task) => ({
        ...task,
        week_end_date: task.week_end_date ?? weekEndDate,
      })),
    };
  } catch (error: unknown) {
    console.error("[Weekly Tasks] Error fetching tasks:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch weekly tasks",
      data: [],
    };
  }
}

/**
 * Delete a task
 */
export async function deleteTask(taskId: string) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Not authenticated",
      };
    }

    const { error } = await supabase
      .from("weekly_task_recommendations")
      .delete()
      .eq("id", taskId)
      .eq("user_id", user.id);

    if (error) {
      console.error("[Weekly Tasks] Delete error:", error);
      return {
        success: false,
        error: "Failed to delete task",
      };
    }

    revalidatePath("/dashboard");

    return {
      success: true,
    };
  } catch (error: unknown) {
    console.error("[Weekly Tasks] Error deleting task:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete task",
    };
  }
}
