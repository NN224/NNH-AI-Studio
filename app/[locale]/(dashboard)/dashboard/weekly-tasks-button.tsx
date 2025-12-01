"use client";

import { Button } from "@/components/ui/button";
import { apiLogger } from "@/lib/utils/logger";

export function WeeklyTasksButton() {
  const handleGenerate = () => {
    try {
      window.dispatchEvent(new Event("dashboard:refresh"));
    } catch (error) {
      apiLogger.error(
        "[WeeklyTasksButton] Error during generation",
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  };

  return (
    <Button
      className="bg-orange-600 hover:bg-orange-700 text-white"
      onClick={handleGenerate}
    >
      Generate Weekly Tasks
    </Button>
  );
}
