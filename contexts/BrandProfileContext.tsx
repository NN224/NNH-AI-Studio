"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { ClientProfile } from "@/lib/types/database";
import { authLogger } from "@/lib/utils/logger";

interface BrandProfileContextType {
  profile: ClientProfile | null;
  loading: boolean;
  refetchProfile: () => Promise<void>;
}

const BrandProfileContext = createContext<BrandProfileContextType | undefined>(
  undefined,
);

interface BrandProfileProviderProps {
  children: ReactNode;
}

export function BrandProfileProvider({ children }: BrandProfileProviderProps) {
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchProfile = async () => {
    if (!supabase) {
      authLogger.warn(
        "Supabase client not initialized, skipping profile fetch",
      );
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setProfile(null);
        return;
      }

      // Prefer profiles (built-in) instead of deprecated client_profiles
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, updated_at")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        if (error.code === "PGRST116") {
          // No profile found, use defaults
          setProfile(null);
        } else {
          authLogger.error(
            "Error fetching client profile",
            error instanceof Error ? error : new Error(String(error)),
          );
          setProfile(null);
        }
      } else {
        setProfile(data as any);
      }
    } catch (error) {
      authLogger.error(
        "Error in fetchProfile",
        error instanceof Error ? error : new Error(String(error)),
      );
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refetchProfile = async () => {
    await fetchProfile();
  };

  return (
    <BrandProfileContext.Provider value={{ profile, loading, refetchProfile }}>
      {children}
    </BrandProfileContext.Provider>
  );
}

export function useBrandProfile() {
  const context = useContext(BrandProfileContext);
  if (context === undefined) {
    throw new Error(
      "useBrandProfile must be used within a BrandProfileProvider",
    );
  }
  return context;
}
