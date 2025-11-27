/**
 * Admin/Owner access control utilities
 */

import { createClient } from "@/lib/supabase/server";

// List of admin emails (can be moved to environment variable)
const ADMIN_EMAILS = [
  "fouadnightclub@gmail.com", // Owner email
  // Add more admin emails here
];

/**
 * Check if the current user is an admin/owner
 */
export async function isCurrentUserAdmin(): Promise<{
  isAdmin: boolean;
  user: { id: string; email?: string } | null;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        isAdmin: false,
        user: null,
        error: "User not authenticated",
      };
    }

    // Check if user email is in admin list
    const isAdmin = ADMIN_EMAILS.includes(user.email || "");

    return {
      isAdmin,
      user,
    };
  } catch (error) {
    return {
      isAdmin: false,
      user: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Middleware helper to check admin access
 */
export async function requireAdmin() {
  const { isAdmin, user, error } = await isCurrentUserAdmin();

  if (error || !user) {
    return Response.json(
      {
        success: false,
        error: "Authentication required",
      },
      { status: 401 },
    );
  }

  if (!isAdmin) {
    return Response.json(
      {
        success: false,
        error: "Admin access required",
      },
      { status: 403 },
    );
  }

  return null; // No error, user is admin
}
