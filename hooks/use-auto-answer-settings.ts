import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { questionsLogger } from "@/lib/utils/logger";

interface AutoAnswerSettings {
  enabled: boolean;
  confidence_threshold: number;
  answer_hours_questions: boolean;
  answer_location_questions: boolean;
  answer_services_questions: boolean;
  answer_pricing_questions: boolean;
  answer_general_questions: boolean;
  tone: "professional" | "friendly" | "casual";
}

export function useAutoAnswerSettings(locationId?: string) {
  const [settings, setSettings] = useState<AutoAnswerSettings>({
    enabled: false,
    confidence_threshold: 80,
    answer_hours_questions: true,
    answer_location_questions: true,
    answer_services_questions: true,
    answer_pricing_questions: false,
    answer_general_questions: true,
    tone: "professional",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      if (!supabase) {
        throw new Error("Failed to initialize Supabase client");
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    }
    init();
  }, []);

  useEffect(() => {
    async function fetchSettings() {
      if (!userId) return;

      setIsLoading(true);
      try {
        const supabase = createClient();
        if (!supabase) {
          throw new Error("Failed to initialize Supabase client");
        }
        const { data, error } = await supabase
          .from("auto_reply_settings")
          .select("*")
          .eq("user_id", userId)
          .eq("location_id", locationId || "")
          .single();

        if (error) throw error;

        if (data) {
          setSettings(data);
        }
      } catch (error) {
        questionsLogger.error(
          "Failed to fetch settings",
          error instanceof Error ? error : new Error(String(error)),
          { userId, locationId },
        );
      } finally {
        setIsLoading(false);
      }
    }

    if (userId) {
      fetchSettings();
    }
  }, [userId, locationId]);

  const updateSettings = async (updates: Partial<AutoAnswerSettings>) => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) {
        throw new Error("Failed to initialize Supabase client");
      }
      const { error } = await supabase
        .from("auto_reply_settings")
        .update(updates)
        .eq("user_id", userId)
        .eq("location_id", locationId || "");

      if (error) throw error;

      setSettings((prevSettings) => ({ ...prevSettings, ...updates }));
    } catch (error) {
      questionsLogger.error(
        "Failed to update settings",
        error instanceof Error ? error : new Error(String(error)),
        { userId, locationId },
      );
    } finally {
      setIsLoading(false);
    }
  };

  return { settings, updateSettings, isLoading };
}
