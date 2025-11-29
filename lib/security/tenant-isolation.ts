/**
 * ============================================================================
 * Tenant Isolation Utilities
 * ============================================================================
 *
 * Ensures strict multi-tenancy isolation by:
 * 1. ALWAYS deriving user ID from server-side authentication
 * 2. NEVER trusting client-provided user IDs or account IDs
 * 3. Enforcing user_id filters on all database queries
 *
 * Usage:
 * ```ts
 * import { getTenantContext, assertTenantAccess } from '@/lib/security/tenant-isolation';
 *
 * export async function GET(request: NextRequest) {
 *   const tenant = await getTenantContext();
 *   if (!tenant.isAuthenticated) {
 *     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *   }
 *
 *   // Use tenant.userId for all queries
 *   const { data } = await supabase
 *     .from('locations')
 *     .select('*')
 *     .eq('user_id', tenant.userId);
 * }
 * ```
 */

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

// ============================================================================
// Types
// ============================================================================

export interface TenantContext {
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** The authenticated user's ID (from server-side auth) */
  userId: string | null;
  /** The full user object */
  user: User | null;
  /** The Supabase client for this request */
  supabase: SupabaseClient;
}

export interface TenantAccessResult {
  allowed: boolean;
  reason?: string;
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get the tenant context for the current request.
 * ALWAYS use this instead of trusting client-provided user IDs.
 */
export async function getTenantContext(): Promise<TenantContext> {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      isAuthenticated: false,
      userId: null,
      user: null,
      supabase,
    };
  }

  return {
    isAuthenticated: true,
    userId: user.id,
    user,
    supabase,
  };
}

/**
 * Assert that the current user has access to a specific resource.
 * Throws an error if access is denied.
 */
export async function assertTenantAccess(
  resourceTable: string,
  resourceId: string,
  userIdColumn: string = "user_id",
): Promise<TenantAccessResult> {
  const tenant = await getTenantContext();

  if (!tenant.isAuthenticated || !tenant.userId) {
    return {
      allowed: false,
      reason: "Authentication required",
    };
  }

  // Query the resource to verify ownership
  const { data, error } = await tenant.supabase
    .from(resourceTable)
    .select(userIdColumn)
    .eq("id", resourceId)
    .single();

  if (error || !data) {
    return {
      allowed: false,
      reason: "Resource not found",
    };
  }

  // Verify the resource belongs to the authenticated user
  const resourceUserId = (data as unknown as Record<string, unknown>)[
    userIdColumn
  ];
  if (resourceUserId !== tenant.userId) {
    // Log potential unauthorized access attempt
    console.warn("[Tenant Isolation] Access denied:", {
      attemptedResourceId: resourceId,
      resourceTable,
      authenticatedUserId: tenant.userId,
      resourceOwnerId: resourceUserId,
      timestamp: new Date().toISOString(),
    });

    return {
      allowed: false,
      reason: "Access denied",
    };
  }

  return { allowed: true };
}

/**
 * Verify that a location belongs to the authenticated user.
 * Returns the location if access is allowed, null otherwise.
 */
export async function verifyLocationAccess(
  locationId: string,
): Promise<{ allowed: boolean; location?: Record<string, unknown> }> {
  const tenant = await getTenantContext();

  if (!tenant.isAuthenticated || !tenant.userId) {
    return { allowed: false };
  }

  const { data: location, error } = await tenant.supabase
    .from("gmb_locations")
    .select("*")
    .eq("id", locationId)
    .eq("user_id", tenant.userId)
    .single();

  if (error || !location) {
    return { allowed: false };
  }

  return { allowed: true, location };
}

/**
 * Verify that an account belongs to the authenticated user.
 * Returns the account if access is allowed, null otherwise.
 */
export async function verifyAccountAccess(
  accountId: string,
): Promise<{ allowed: boolean; account?: Record<string, unknown> }> {
  const tenant = await getTenantContext();

  if (!tenant.isAuthenticated || !tenant.userId) {
    return { allowed: false };
  }

  const { data: account, error } = await tenant.supabase
    .from("gmb_accounts")
    .select("*")
    .eq("id", accountId)
    .eq("user_id", tenant.userId)
    .single();

  if (error || !account) {
    return { allowed: false };
  }

  return { allowed: true, account };
}

// ============================================================================
// Query Helpers
// ============================================================================

/**
 * Create a base query that automatically filters by the authenticated user.
 * This ensures tenant isolation at the query level.
 *
 * @example
 * const query = await createTenantQuery('gmb_locations');
 * if (!query) return unauthorized();
 * const { data } = await query.select('*');
 */
export async function createTenantQuery(
  table: string,
  userIdColumn: string = "user_id",
) {
  const tenant = await getTenantContext();

  if (!tenant.isAuthenticated || !tenant.userId) {
    return null;
  }

  return tenant.supabase.from(table).select().eq(userIdColumn, tenant.userId);
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Strip any user_id or account_id from request body to prevent spoofing.
 * The actual user_id should ALWAYS come from server-side authentication.
 */
export function sanitizeRequestBody<T extends Record<string, unknown>>(
  body: T,
): Omit<T, "user_id" | "userId" | "account_id" | "accountId"> {
  const sanitized = { ...body };

  // Remove any client-provided user/account IDs
  delete sanitized.user_id;
  delete sanitized.userId;
  delete sanitized.account_id;
  delete sanitized.accountId;

  // Log if client attempted to provide these fields
  if (
    "user_id" in body ||
    "userId" in body ||
    "account_id" in body ||
    "accountId" in body
  ) {
    console.warn(
      "[Tenant Isolation] Client attempted to provide user/account ID:",
      {
        providedFields: Object.keys(body).filter((k) =>
          ["user_id", "userId", "account_id", "accountId"].includes(k),
        ),
        timestamp: new Date().toISOString(),
      },
    );
  }

  return sanitized as Omit<
    T,
    "user_id" | "userId" | "account_id" | "accountId"
  >;
}

/**
 * Validate that a query parameter is not trying to access another user's data.
 * Returns true if the parameter is safe to use.
 */
export async function validateQueryUserId(
  queryUserId: string | null,
): Promise<boolean> {
  if (!queryUserId) {
    return true; // No user ID provided, will use authenticated user
  }

  const tenant = await getTenantContext();

  if (!tenant.isAuthenticated || !tenant.userId) {
    return false;
  }

  // Only allow if the query user ID matches the authenticated user
  if (queryUserId !== tenant.userId) {
    console.warn("[Tenant Isolation] Query user ID mismatch:", {
      queryUserId,
      authenticatedUserId: tenant.userId,
      timestamp: new Date().toISOString(),
    });
    return false;
  }

  return true;
}
