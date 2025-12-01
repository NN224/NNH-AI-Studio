"use client";

import { logger } from "@/lib/utils/logger";

export interface DashboardWidgetPreferences {
  showPerformanceComparison: boolean;
  showLocationHighlights: boolean;
  showWeeklyTasks: boolean;
  showBottlenecks: boolean;
  showAchievements: boolean;
  showAIInsights: boolean;
}

const DEFAULT_PREFERENCES: DashboardWidgetPreferences = {
  showPerformanceComparison: true,
  showLocationHighlights: true,
  showWeeklyTasks: true,
  showBottlenecks: true,
  showAchievements: true,
  showAIInsights: true,
};

const NEW_USER_PREFERENCES: DashboardWidgetPreferences = DEFAULT_PREFERENCES;

const PREFERENCES_KEY = "dashboard_widget_preferences";
const HAS_CUSTOMIZED_KEY = "dashboard_has_customized";

export function getDashboardPreferences(): DashboardWidgetPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;

  try {
    const hasCustomized = localStorage.getItem(HAS_CUSTOMIZED_KEY);
    const stored = localStorage.getItem(PREFERENCES_KEY);

    // If user hasn't customized yet, we show the full dashboard by default
    if (!hasCustomized) {
      return NEW_USER_PREFERENCES;
    }

    if (stored) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
    }

    return DEFAULT_PREFERENCES;
  } catch (error) {
    logger.error(
      "Error reading dashboard preferences",
      error instanceof Error ? error : new Error(String(error)),
    );
    return DEFAULT_PREFERENCES;
  }
}

export function saveDashboardPreferences(
  preferences: DashboardWidgetPreferences,
): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    localStorage.setItem(HAS_CUSTOMIZED_KEY, "true");
  } catch (error) {
    logger.error(
      "Error saving dashboard preferences",
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

export function hasUserCustomizedDashboard(): boolean {
  if (typeof window === "undefined") return false;

  try {
    return localStorage.getItem(HAS_CUSTOMIZED_KEY) === "true";
  } catch (error) {
    return false;
  }
}

export function resetDashboardPreferences(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(PREFERENCES_KEY);
    localStorage.removeItem(HAS_CUSTOMIZED_KEY);
  } catch (error) {
    logger.error(
      "Error resetting dashboard preferences",
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}
