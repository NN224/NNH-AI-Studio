"use server";

import { createClient } from "@/lib/supabase/server";

export interface OnboardingTask {
  id: string;
  title: string;
  completed: boolean;
  description?: string;
  impact?: string;
  estimatedMinutes?: number;
  actionLabel?: string;
  actionUrl?: string;
  aiSuggestion?: string;
  locked?: boolean;
}

export async function getOnboardingTasks(): Promise<OnboardingTask[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data: activeAccounts } = await supabase
    .from("gmb_accounts")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true);

  const activeAccountIds = activeAccounts?.map((acc) => acc.id) || [];
  const hasActiveAccount = activeAccountIds.length > 0;

  let locations: {
    id: string;
    metadata: { photos?: unknown[]; description?: string } | null;
    regular_hours: unknown;
  }[] = [];
  let reviews: {
    id: string;
    reply_comment: string | null;
    has_reply: boolean | null;
  }[] = [];
  let posts: { id: string }[] = [];

  if (hasActiveAccount) {
    const [locationsRes, reviewsRes, postsRes] = await Promise.all([
      supabase
        .from("gmb_locations")
        .select("id, metadata, regular_hours")
        .eq("user_id", user.id)
        .in("gmb_account_id", activeAccountIds),
      supabase
        .from("gmb_reviews")
        .select("id, reply_comment, has_reply")
        .eq("user_id", user.id),
      supabase.from("gmb_posts").select("id").eq("user_id", user.id),
    ]);

    locations = locationsRes.data || [];
    reviews = reviewsRes.data || [];
    posts = postsRes.data || [];
  }

  const repliedReviews = reviews.filter((r) => r.has_reply === true);
  const locationsWithPhotos = locations.filter(
    (l) => l.metadata?.photos && l.metadata.photos.length >= 3,
  );
  const locationsWithDescription = locations.filter(
    (l) => l.metadata?.description && l.metadata.description.trim().length > 0,
  );
  const locationsWithHours = locations.filter((l) => l.regular_hours);

  const tasks: OnboardingTask[] = [
    {
      id: "connect-gmb",
      title: "Connect GMB Account",
      completed: hasActiveAccount,
      description: "Link your Google My Business account",
      impact: "Unlock all features",
      estimatedMinutes: 2,
      actionLabel: hasActiveAccount ? "Connected" : "Connect Now",
      actionUrl: "/api/gmb/create-auth-url",
      aiSuggestion:
        "This is the first step to unlock the power of AI-driven local SEO.",
    },
    {
      id: "sync-locations",
      title: "Sync Locations",
      completed: locations.length > 0,
      description: `${locations.length} location${locations.length !== 1 ? "s" : ""} found`,
      impact: "Access location data",
      estimatedMinutes: 1,
      actionLabel: "Sync Now",
      locked: !hasActiveAccount,
      aiSuggestion:
        "Syncing imports all your business locations and their data.",
    },
    {
      id: "import-reviews",
      title: "Import Reviews",
      completed: reviews.length > 0,
      description: `${reviews.length} review${reviews.length !== 1 ? "s" : ""} imported`,
      impact: "Monitor reputation",
      estimatedMinutes: 1,
      actionLabel: "Import",
      locked: locations.length === 0,
      aiSuggestion:
        "Reviews help AI understand customer sentiment and generate better responses.",
    },
    {
      id: "add-photos",
      title: "Add 3+ Photos",
      completed:
        locationsWithPhotos.length >= locations.length && locations.length > 0,
      description: `${locationsWithPhotos.length}/${locations.length} locations have photos`,
      impact: "+35% CTR",
      estimatedMinutes: 5,
      actionLabel: "Upload",
      actionUrl: "/locations",
      locked: locations.length === 0,
      aiSuggestion: "Locations with 3+ photos see 35% more clicks on average.",
    },
    {
      id: "reply-reviews",
      title: "Reply to 3 Reviews",
      completed: repliedReviews.length >= 3,
      description: `${repliedReviews.length} review${repliedReviews.length !== 1 ? "s" : ""} replied`,
      impact: "+15% rating boost",
      estimatedMinutes: 5,
      actionLabel: "AI Reply",
      actionUrl: "/reviews",
      locked: reviews.length === 0,
      aiSuggestion: "Replying within 24 hours can increase your rating by 15%.",
    },
    {
      id: "create-post",
      title: "Create First Post",
      completed: posts.length > 0,
      description:
        posts.length > 0
          ? `${posts.length} post${posts.length !== 1 ? "s" : ""} created`
          : "Boost visibility",
      impact: "+40% visibility",
      estimatedMinutes: 3,
      actionLabel: "AI Generate",
      actionUrl: "/posts",
      locked: locations.length === 0,
      aiSuggestion:
        "Posts 3x/week increase visibility by 40% and improve local rankings.",
    },
    {
      id: "complete-info",
      title: "Complete Business Info",
      completed:
        locationsWithDescription.length >= locations.length &&
        locationsWithHours.length >= locations.length &&
        locations.length > 0,
      description: "Add description & hours",
      impact: "+25% calls",
      estimatedMinutes: 5,
      actionLabel: "Add Info",
      actionUrl: "/locations",
      locked: locations.length === 0,
      aiSuggestion:
        "Complete profiles get 25% more phone calls and direction requests.",
    },
    {
      id: "setup-auto-reply",
      title: "Setup Auto-Reply",
      completed: false,
      description: "Let AI reply to reviews automatically",
      impact: "Save 2+ hours weekly",
      estimatedMinutes: 3,
      actionLabel: "Quick Setup",
      actionUrl: "/settings",
      locked: repliedReviews.length < 3,
      aiSuggestion:
        "Auto-reply maintains engagement while saving you hours each week.",
    },
  ];

  return tasks;
}

export async function getProfileStrength(): Promise<{
  strength: number;
  tasksCompleted: number;
  totalTasks: number;
  estimatedMinutes: number;
}> {
  const tasks = await getOnboardingTasks();
  const completed = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const strength = Math.round((completed / total) * 100);

  const remainingTasks = tasks.filter((t) => !t.completed && !t.locked);
  const estimatedMinutes = remainingTasks.reduce(
    (sum, t) => sum + (t.estimatedMinutes || 0),
    0,
  );

  return {
    strength,
    tasksCompleted: completed,
    totalTasks: total,
    estimatedMinutes,
  };
}
