import { logger } from "@/lib/utils/logger";
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured =
  typeof supabaseUrl === "string" &&
  supabaseUrl.length > 0 &&
  typeof supabaseAnonKey === "string" &&
  supabaseAnonKey.length > 0;

export function createClient() {
  if (!isSupabaseConfigured) {
    logger.error(
      "Supabase environment variables are not configured on the client",
      new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
      ),
    );
    return null;
  }

  return createBrowserClient(supabaseUrl as string, supabaseAnonKey as string);
}
