"use client";

import { createClient } from "@/lib/supabase/client";
import { authLogger } from "@/lib/utils/logger";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function useSupabase() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  if (!supabase) {
    throw new Error("Failed to initialize Supabase client");
  }

  useEffect(() => {
    const getUser = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          // Handle session expiration
          if (
            error.code === "session_expired" ||
            error.message?.includes("expired") ||
            error.message?.includes("Invalid Refresh Token")
          ) {
            console.log("Session expired, redirecting to login...");
            toast.error("Your session has expired. Please log in again.");
            router.push("/auth/login");
            return;
          }
        }

        setUser(user);
      } catch (err) {
        authLogger.error(
          "Error getting user",
          err instanceof Error ? err : new Error(String(err)),
        );
      } finally {
        setLoading(false);
      }
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Handle various auth events
      if (event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        if (event === "SIGNED_OUT") {
          setUser(null);
          router.push("/auth/login");
        }
      }

      // For other events, get the user data
      if (
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED"
      ) {
        try {
          const {
            data: { user },
            error,
          } = await supabase.auth.getUser();

          if (
            error &&
            (error.code === "session_expired" ||
              error.message?.includes("expired"))
          ) {
            toast.error("Your session has expired. Please log in again.");
            router.push("/auth/login");
            return;
          }

          setUser(user);
        } catch (err) {
          authLogger.error(
            "Error in auth state change",
            err instanceof Error ? err : new Error(String(err)),
          );
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, router]);

  return { user, loading, supabase };
}
