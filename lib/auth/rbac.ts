"use server";

import { authLogger } from "@/lib/utils/logger";
import type { SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

export type TeamRole = "owner" | "admin" | "editor" | "viewer";

export type Resource =
  | "locations"
  | "reviews"
  | "questions"
  | "settings"
  | "team";

type PermissionMatrix = Record<Resource, Record<string, TeamRole[]>>;

const ROLE_PRIORITY: Record<TeamRole, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
};

const PERMISSIONS: PermissionMatrix = {
  locations: {
    read: ["viewer", "editor", "admin", "owner"],
    sync: ["editor", "admin", "owner"],
    manage: ["admin", "owner"],
  },
  reviews: {
    read: ["viewer", "editor", "admin", "owner"],
    reply: ["editor", "admin", "owner"],
    moderate: ["admin", "owner"],
  },
  questions: {
    read: ["viewer", "editor", "admin", "owner"],
    answer: ["editor", "admin", "owner"],
    moderate: ["admin", "owner"],
  },
  settings: {
    read: ["admin", "owner"],
    update: ["admin", "owner"],
  },
  team: {
    manage: ["admin", "owner"],
    invite: ["admin", "owner"],
    transfer: ["owner"],
  },
};

export function checkPermission(
  role: TeamRole | null | undefined,
  resource: Resource,
  action: string,
) {
  if (!role) return false;
  const allowed = PERMISSIONS[resource]?.[action];
  if (!allowed) {
    return role === "owner";
  }
  return allowed.includes(role);
}

export function readTeamContextFromHeaders(sourceHeaders: Headers) {
  const teamId = sourceHeaders.get("x-team-id");
  const teamRole = sourceHeaders.get("x-team-role") as TeamRole | null;
  return { teamId, teamRole };
}

export function getRequestTeamContext() {
  const hdrs = headers();
  const cookieStore = cookies();
  const headerContext = readTeamContextFromHeaders(hdrs);
  const cookieTeamId = cookieStore.get("nnh-active-team")?.value ?? null;
  const cookieRole = cookieStore.get("nnh-team-role")?.value as
    | TeamRole
    | undefined;
  return {
    teamId: headerContext.teamId ?? cookieTeamId ?? null,
    role: headerContext.teamRole ?? cookieRole ?? null,
  };
}

export async function fetchMembershipRole(
  supabase: SupabaseClient,
  teamId: string,
  userId: string,
): Promise<TeamRole | null> {
  const { data, error } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    authLogger.warn("Failed to fetch membership role", { error });
    return null;
  }

  return (data?.role as TeamRole) ?? null;
}

export async function assertPermission(
  supabase: SupabaseClient,
  options: {
    userId?: string | null;
    teamId?: string | null;
    resource: Resource;
    action: string;
  },
) {
  const { userId, teamId, resource, action } = options;
  if (!teamId) {
    throw new Error("Team context missing");
  }

  let resolvedUserId = userId;
  if (!resolvedUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    resolvedUserId = user?.id ?? null;
  }

  if (!resolvedUserId) {
    throw new Error("Not authenticated");
  }

  const role = await fetchMembershipRole(supabase, teamId, resolvedUserId);
  if (!role || !checkPermission(role, resource, action)) {
    throw new Error("Insufficient permissions");
  }

  return role;
}

export async function getTeamsForUser(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("team_members")
    .select(
      `
        role,
        joined_at,
        team:teams (
          id,
          name,
          owner_id,
          created_at
        )
      `,
    )
    .eq("user_id", userId);

  if (error) {
    authLogger.error(
      "Failed to fetch teams",
      error instanceof Error ? error : new Error(String(error)),
    );
    return [];
  }

  return data;
}

export async function inviteTeamMember(
  supabase: SupabaseClient,
  params: { teamId: string; email: string; role: TeamRole; invitedBy: string },
) {
  const { teamId, email, role, invitedBy } = params;
  if (!checkPermission("admin", "team", "invite")) {
    throw new Error("Forbidden");
  }
  const token = crypto.randomUUID().replace(/-/g, "");
  const { error } = await supabase.from("team_invitations").insert({
    team_id: teamId,
    email: email.toLowerCase(),
    token,
    role,
    created_by: invitedBy,
  });
  if (error) {
    authLogger.error(
      "Failed to create invitation",
      error instanceof Error ? error : new Error(String(error)),
    );
    throw new Error(error.message);
  }
  return { token };
}

export async function updateMemberRole(
  supabase: SupabaseClient,
  params: { teamId: string; targetUserId: string; role: TeamRole },
) {
  const { teamId, targetUserId, role } = params;
  const { data, error } = await supabase
    .from("team_members")
    .update({ role })
    .eq("team_id", teamId)
    .eq("user_id", targetUserId)
    .select("team_id");
  if (error) {
    authLogger.error(
      "Failed to update member role",
      error instanceof Error ? error : new Error(String(error)),
    );
    throw new Error(error.message);
  }
  return data;
}

export async function removeMember(
  supabase: SupabaseClient,
  params: { teamId: string; targetUserId: string },
) {
  const { teamId, targetUserId } = params;
  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("team_id", teamId)
    .eq("user_id", targetUserId);
  if (error) {
    authLogger.error(
      "Failed to remove member",
      error instanceof Error ? error : new Error(String(error)),
    );
    throw new Error(error.message);
  }
}

export function guardSettingsAccess(role: TeamRole | null | undefined) {
  if (!role || ROLE_PRIORITY[role] < ROLE_PRIORITY["admin"]) {
    redirect("/dashboard");
  }
}
