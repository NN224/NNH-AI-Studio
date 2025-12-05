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
      
      // Don't fetch if locationId is undefined - wait for a location to be selected
      if (locationId === undefined) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const supabase = createClient();
        if (!supabase) {
          throw new Error("Failed to initialize Supabase client");
        }
        
        let query = supabase
          .from("question_auto_answer_settings")
          .select("*")
          .eq("user_id", userId);
        
        // Handle null vs undefined: null means global settings, undefined means no location selected yet
        if (locationId === null) {
          query = query.is("location_id", null);
        } else {
          query = query.eq("location_id", locationId);
        }
        
        const { data, error } = await query.maybeSingle();

        // maybeSingle() returns null if no rows found, which is not an error
        if (error) throw error;

        if (data) {
          setSettings(data);
        }
        // If no data found, keep default settings
      } catch (error) {
        // Extract meaningful error message from PostgrestError
        let errorMessage = "Unknown error";
        if (error && typeof error === "object" && "message" in error) {
          errorMessage = String(error.message);
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }
        
        questionsLogger.error(
          "Failed to fetch settings",
          new Error(errorMessage),
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
    
    // Don't update if locationId is undefined
    if (locationId === undefined) {
      questionsLogger.warn("Cannot update settings without a location selected", {
        userId,
      });
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) {
        throw new Error("Failed to initialize Supabase client");
      }
      
      // Use upsert to handle both insert and update cases
      const settingsData = {
        user_id: userId,
        location_id: locationId,
        ...updates,
      };
      
      const { error } = await supabase
        .from("question_auto_answer_settings")
        .upsert(settingsData, {
          onConflict: "user_id,location_id",
        });

      if (error) throw error;

      setSettings((prevSettings) => ({ ...prevSettings, ...updates }));
    } catch (error) {
      // Extract meaningful error message from PostgrestError
      let errorMessage = "Unknown error";
      if (error && typeof error === "object" && "message" in error) {
        errorMessage = String(error.message);
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      questionsLogger.error(
        "Failed to update settings",
        new Error(errorMessage),
        { userId, locationId },
      );
    } finally {
      setIsLoading(false);
    }
  };

  return { settings, updateSettings, isLoading };
}
