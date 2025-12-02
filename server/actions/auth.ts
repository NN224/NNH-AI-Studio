"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/auth/login");
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return { user: null, error: error.message };
  }

  return { user, error: null };
}

/**
 * @deprecated SECURITY WARNING: Using getSession() is insecure!
 *
 * This function reads session data directly from storage (cookies) without verifying
 * its authenticity with the Supabase Auth server. An attacker could modify cookies
 * to impersonate another user.
 *
 * Use getCurrentUser() instead, which validates the session by contacting the
 * Supabase Auth server and ensures the data is authentic.
 *
 * @see {@link https://supabase.com/docs/guides/auth/server-side/creating-a-client#creating-a-client}
 */
export async function getSession() {
  // SECURITY: Redirect to secure method
  console.warn(
    "SECURITY WARNING: getSession() is deprecated and insecure. Use getCurrentUser() instead.",
  );
  return getCurrentUser();
}
