interface HealthScoreInput {
  reviewsCount: number;
  responseRate: number;
  averageRating: number;
  weeklyGrowth: number;
  locationsCount: number;
}

/**
 * Derives a business health score (0-100) using the key engagement metrics
 * surfaced on the dashboard. This keeps the calculation deterministic so
 * server and client output always match.
 */
export function calculateHealthScore({
  reviewsCount,
  responseRate,
  averageRating,
  weeklyGrowth,
  locationsCount,
}: HealthScoreInput): number {
  let score = 100;

  if (reviewsCount === 0) {
    score -= 10;
  }

  if (locationsCount === 0) {
    score -= 10;
  }

  const normalizedRating = Number.isFinite(averageRating)
    ? Math.max(0, Math.min(5, averageRating))
    : 0;
  const ratingPenalty = Math.max(0, 4.5 - normalizedRating) * 10;
  score -= ratingPenalty;

  if (responseRate < 90) {
    score -= Math.min(20, Math.round((90 - responseRate) * 0.4));
  } else if (responseRate > 95) {
    score += 3;
  }

  if (weeklyGrowth < 0) {
    score -= Math.min(15, Math.abs(weeklyGrowth) * 0.3);
  } else if (weeklyGrowth > 0) {
    score += Math.min(5, weeklyGrowth * 0.1);
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

interface ProgressItemLike {
  completed: boolean;
}

export function calculateProfileCompleteness(
  items: ProgressItemLike[],
): number {
  if (!items.length) {
    return 0;
  }

  const completedCount = items.filter((item) => item.completed).length;
  return Math.min(100, Math.round((completedCount / items.length) * 100));
}
