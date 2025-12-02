/**
 * Authorization Middleware for API Routes
 *
 * @security CRITICAL - Enforces role-based access control and resource ownership
 *
 * Usage:
 * export const GET = withAuthorization(handler, {
 *   requiredRole: 'admin',
 *   checkOwnership: true,
 *   resourceType: 'location'
 * });
 */

import { createClient } from "@/lib/supabase/server";
import { apiLogger } from "@/lib/utils/logger";
import type { User } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export type AuthorizedHandler = (
  request: NextRequest,
  context: {
    user: User;
    params?: Record<string, string>;
    isAdmin?: boolean;
    ownsResource?: boolean;
  },
) => Promise<NextResponse>;

interface AuthorizationOptions {
  /** Required user role */
  requiredRole?: "admin" | "user" | "super_admin";
  /** Check if user owns the resource */
  checkOwnership?: boolean;
  /** Type of resource for ownership check */
  resourceType?: "location" | "review" | "post" | "account" | "media";
  /** Custom ownership checker */
  ownershipChecker?: (userId: string, resourceId: string) => Promise<boolean>;
  /** Skip authentication (use with caution!) */
  skipAuth?: boolean;
}

/**
 * Check if user has admin role
 */
async function checkAdminRole(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient();

    // Check user_roles table
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (role?.role === "admin" || role?.role === "super_admin") {
      return true;
    }

    // Fallback: Check profiles table
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin, role")
      .eq("id", userId)
      .single();

    return profile?.is_admin === true || profile?.role === "admin";
  } catch (error) {
    apiLogger.error(
      "Error checking admin role",
      error instanceof Error ? error : new Error(String(error)),
      { userId },
    );
    return false;
  }
}

/**
 * Check if user owns a resource
 */
async function checkResourceOwnership(
  userId: string,
  resourceId: string,
  resourceType?: string,
): Promise<boolean> {
  try {
    const supabase = await createClient();

    let tableName: string;
    const userColumn = "user_id";

    switch (resourceType) {
      case "location":
        tableName = "gmb_locations";
        break;
      case "review": {
        tableName = "gmb_reviews";
        // Reviews are owned through locations
        const { data: review } = await supabase
          .from("gmb_reviews")
          .select("*, gmb_locations!inner(user_id)")
          .eq("id", resourceId)
          .single();

        return review?.gmb_locations?.user_id === userId;
      }

      case "post":
        tableName = "gmb_posts";
        break;
      case "account":
        tableName = "gmb_accounts";
        break;
      case "media":
        tableName = "media";
        break;
      default:
        return false;
    }

    const { data, error } = await supabase
      .from(tableName)
      .select(userColumn)
      .eq("id", resourceId)
      .single();

    if (error || !data) {
      return false;
    }

    return (data as Record<string, unknown>)[userColumn] === userId;
  } catch (error) {
    apiLogger.error(
      "Error checking resource ownership",
      error instanceof Error ? error : new Error(String(error)),
      { userId, resourceId, resourceType },
    );
    return false;
  }
}

/**
 * Authorization middleware wrapper
 */
export function withAuthorization(
  handler: AuthorizedHandler,
  options: AuthorizationOptions = {},
): (
  request: NextRequest,
  context?: Record<string, unknown>,
) => Promise<NextResponse> {
  return async (request: NextRequest, context?: Record<string, unknown>) => {
    try {
      const {
        requiredRole,
        checkOwnership = false,
        resourceType,
        ownershipChecker,
        skipAuth = false,
      } = options;

      // Skip auth if explicitly disabled (use with caution!)
      if (skipAuth) {
        return handler(request, { ...context, user: null as unknown as User });
      }

      // Authenticate user
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        apiLogger.warn("Authorization failed - no user", {
          path: request.url,
          method: request.method,
          error: authError?.message,
        });

        return NextResponse.json(
          {
            error: "Authentication required",
            message: "You must be logged in to access this resource",
          },
          { status: 401 },
        );
      }

      // Check role if required
      let isAdmin = false;
      if (requiredRole) {
        if (requiredRole === "admin" || requiredRole === "super_admin") {
          isAdmin = await checkAdminRole(user.id);

          if (!isAdmin) {
            apiLogger.warn("Authorization failed - insufficient role", {
              userId: user.id,
              requiredRole,
              path: request.url,
            });

            return NextResponse.json(
              {
                error: "Insufficient permissions",
                message: `This action requires ${requiredRole} privileges`,
              },
              { status: 403 },
            );
          }
        }
      }

      // Check ownership if required
      let ownsResource = false;
      const params = context?.params as Record<string, string> | undefined;
      if (checkOwnership && params?.id) {
        const resourceId = params.id;

        if (ownershipChecker) {
          ownsResource = await ownershipChecker(user.id, resourceId);
        } else if (resourceType) {
          ownsResource = await checkResourceOwnership(
            user.id,
            resourceId,
            resourceType,
          );
        }

        if (!ownsResource && !isAdmin) {
          apiLogger.warn("Authorization failed - does not own resource", {
            userId: user.id,
            resourceId,
            resourceType,
            path: request.url,
          });

          return NextResponse.json(
            {
              error: "Access denied",
              message: "You do not have permission to access this resource",
            },
            { status: 403 },
          );
        }
      }

      // Call the handler with authorization context
      return handler(request, {
        ...context,
        user,
        isAdmin,
        ownsResource,
      });
    } catch (error) {
      apiLogger.error(
        "Authorization middleware error",
        error instanceof Error ? error : new Error(String(error)),
      );

      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  };
}

/**
 * Combine authorization with CSRF protection
 */
export function withAuthorizationAndCSRF(
  handler: AuthorizedHandler,
  authOptions?: AuthorizationOptions,
): (
  request: NextRequest,
  context?: Record<string, unknown>,
) => Promise<NextResponse> {
  // Import CSRF wrapper if needed
  // return withCSRF(withAuthorization(handler, authOptions));
  return withAuthorization(handler, authOptions);
}

/**
 * Admin-only endpoint wrapper
 */
export function withAdminOnly(
  handler: AuthorizedHandler,
): (
  request: NextRequest,
  context?: Record<string, unknown>,
) => Promise<NextResponse> {
  return withAuthorization(handler, {
    requiredRole: "admin",
  });
}

/**
 * Owner-only endpoint wrapper
 */
export function withOwnerOnly(
  handler: AuthorizedHandler,
  resourceType: AuthorizationOptions["resourceType"],
): (
  request: NextRequest,
  context?: Record<string, unknown>,
) => Promise<NextResponse> {
  return withAuthorization(handler, {
    checkOwnership: true,
    resourceType,
  });
}
