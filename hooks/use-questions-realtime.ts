"use client";

import { useEffect, useCallback, useState } from "react";
import { useRealtimeQuestions } from "@/hooks/use-realtime";
import { useQuestionsStore } from "@/lib/stores/questions-store";
import { createClient } from "@/lib/supabase/client";
import type { GMBQuestion } from "@/lib/types/database";

/**
 * Hook that connects Questions store with Realtime updates
 *
 * @example
 * ```tsx
 * // In your Questions page component
 * useQuestionsRealtime();
 *
 * // The store will automatically update when new questions arrive
 * const questions = useQuestionsStore((state) => state.questions);
 * ```
 */
export function useQuestionsRealtime() {
  const { setQuestions, questions, filters } = useQuestionsStore();

  // Get user ID
  const supabase = createClient();

  // Handle new question from realtime
  const handleNewQuestion = useCallback(
    (question: unknown) => {
      const newQuestion = question as GMBQuestion;

      // Check if question matches current filters
      if (
        filters.locationId &&
        newQuestion.location_id !== filters.locationId
      ) {
        return; // Skip if doesn't match location filter
      }

      // Add to beginning of list (newest first)
      const exists = questions.some((q) => q.id === newQuestion.id);
      if (!exists) {
        setQuestions([newQuestion, ...questions], false);
      }
    },
    [questions, filters, setQuestions],
  );

  // Handle question update from realtime
  const handleQuestionUpdate = useCallback(
    (question: unknown) => {
      const updatedQuestion = question as GMBQuestion;

      setQuestions(
        questions.map((q) =>
          q.id === updatedQuestion.id ? updatedQuestion : q,
        ),
        false,
      );
    },
    [questions, setQuestions],
  );

  // Get user ID for realtime subscription
  const [userId, setUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id);
    });
  }, [supabase]);

  // Subscribe to realtime updates
  useRealtimeQuestions(userId, {
    onNewQuestion: handleNewQuestion,
    onQuestionUpdate: handleQuestionUpdate,
    showToasts: true,
  });
}
