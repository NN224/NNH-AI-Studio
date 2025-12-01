"use client";

import { useState, useTransition } from "react";
import { apiLogger } from "@/lib/utils/logger";
import { generateWeeklyTasks } from "./actions";
import { toast } from "sonner";

export default function GenerateTasksButton({
  accountId,
}: {
  accountId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleGenerate = () => {
    startTransition(async () => {
      try {
        await generateWeeklyTasks(accountId);
        setStatus("success");
        toast.success("Weekly tasks generated successfully!");
        window.dispatchEvent(new Event("dashboard:refresh"));
      } catch (error) {
        apiLogger.error(
          "[GenerateTasksButton] Error generating tasks",
          error instanceof Error ? error : new Error(String(error)),
          { accountId },
        );
        setStatus("error");
        toast.error("Failed to generate weekly tasks. Please try again.");
      }
    });
  };

  return (
    <button
      onClick={handleGenerate}
      disabled={isPending}
      className={`px-5 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
        isPending
          ? "bg-zinc-700 cursor-wait text-zinc-300"
          : "bg-green-600 hover:bg-green-700 text-white"
      }`}
    >
      {isPending ? (
        <>
          <span>⚙️</span>
          <span>Generating...</span>
        </>
      ) : status === "success" ? (
        <>
          <span>✅</span>
          <span>Generated</span>
        </>
      ) : status === "error" ? (
        <>
          <span>⚠️</span>
          <span>Error</span>
        </>
      ) : (
        <>
          <span>🧠</span>
          <span>Generate Tasks</span>
        </>
      )}
    </button>
  );
}
