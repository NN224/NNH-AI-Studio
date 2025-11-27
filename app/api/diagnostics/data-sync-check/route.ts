import { requireAdmin } from "@/lib/auth/admin-check";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    // Check admin access first
    const adminCheck = await requireAdmin();
    if (adminCheck) {
      return adminCheck;
    }

    const adminClient = createAdminClient();
    const issues: any[] = [];
    const warnings: any[] = [];
    const summary = {
      totalChecks: 0,
      passedChecks: 0,
      issuesFound: 0,
      warningsFound: 0,
    };

    // 1. Check GMB Accounts vs Locations consistency
    summary.totalChecks++;
    try {
      const { data: accounts } = await adminClient
        .from("gmb_accounts")
        .select("id, account_id, is_active");

      const { data: locations } = await adminClient
        .from("gmb_locations")
        .select("id, gmb_account_id, user_id, is_active");

      if (accounts && locations) {
        // Find locations without valid accounts
        const accountIds = accounts.map((a) => a.id);
        const orphanedLocations = locations.filter(
          (l) => !accountIds.includes(l.gmb_account_id),
        );

        if (orphanedLocations.length > 0) {
          issues.push({
            type: "orphaned_locations",
            severity: "high",
            count: orphanedLocations.length,
            message: `Found ${orphanedLocations.length} locations without valid GMB accounts`,
            details: orphanedLocations.map((l) => ({
              location_id: l.id,
              invalid_account_id: l.gmb_account_id,
            })),
          });
        }

        // Find inactive accounts with active locations
        const inactiveAccounts = accounts.filter((a) => !a.is_active);
        const activeLocationsWithInactiveAccounts = locations.filter(
          (l) =>
            l.is_active &&
            inactiveAccounts.some((a) => a.id === l.gmb_account_id),
        );

        if (activeLocationsWithInactiveAccounts.length > 0) {
          warnings.push({
            type: "active_locations_inactive_accounts",
            severity: "medium",
            count: activeLocationsWithInactiveAccounts.length,
            message: `Found ${activeLocationsWithInactiveAccounts.length} active locations linked to inactive accounts`,
          });
        }

        summary.passedChecks++;
      }
    } catch (error) {
      issues.push({
        type: "account_location_check_failed",
        severity: "high",
        message: "Failed to check account-location consistency",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // 2. Check Users vs Profiles consistency
    summary.totalChecks++;
    try {
      // Get auth users count (approximate - we can't directly query auth.users)
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("id, full_name, avatar_url");

      const { data: gmbAccounts } = await adminClient
        .from("gmb_accounts")
        .select("user_id")
        .eq("is_active", true);

      if (profiles && gmbAccounts) {
        const profileIds = profiles.map((p) => p.id);
        const userIdsWithGMB = [...new Set(gmbAccounts.map((a) => a.user_id))];

        // Find GMB accounts without profiles
        const gmbWithoutProfiles = userIdsWithGMB.filter(
          (userId) => !profileIds.includes(userId),
        );

        if (gmbWithoutProfiles.length > 0) {
          issues.push({
            type: "gmb_without_profiles",
            severity: "medium",
            count: gmbWithoutProfiles.length,
            message: `Found ${gmbWithoutProfiles.length} GMB accounts without user profiles`,
            details: gmbWithoutProfiles,
          });
        }

        // Find profiles without complete data
        const incompleteProfiles = profiles.filter(
          (p) => !p.full_name || !p.avatar_url,
        );

        if (incompleteProfiles.length > 0) {
          warnings.push({
            type: "incomplete_profiles",
            severity: "low",
            count: incompleteProfiles.length,
            message: `Found ${incompleteProfiles.length} profiles with missing data`,
          });
        }

        summary.passedChecks++;
      }
    } catch (error) {
      issues.push({
        type: "user_profile_check_failed",
        severity: "high",
        message: "Failed to check user-profile consistency",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // 3. Check Reviews vs Locations consistency
    summary.totalChecks++;
    try {
      const { data: reviews } = await adminClient
        .from("gmb_reviews")
        .select("id, location_id, user_id");

      const { data: locations } = await adminClient
        .from("gmb_locations")
        .select("id, user_id");

      if (reviews && locations) {
        const locationIds = locations.map((l) => l.id);
        const orphanedReviews = reviews.filter(
          (r) => r.location_id && !locationIds.includes(r.location_id),
        );

        if (orphanedReviews.length > 0) {
          issues.push({
            type: "orphaned_reviews",
            severity: "medium",
            count: orphanedReviews.length,
            message: `Found ${orphanedReviews.length} reviews without valid locations`,
          });
        }

        // Check user_id consistency
        const reviewsWithMismatchedUsers = reviews.filter((r) => {
          const location = locations.find((l) => l.id === r.location_id);
          return location && r.user_id !== location.user_id;
        });

        if (reviewsWithMismatchedUsers.length > 0) {
          warnings.push({
            type: "mismatched_review_users",
            severity: "medium",
            count: reviewsWithMismatchedUsers.length,
            message: `Found ${reviewsWithMismatchedUsers.length} reviews with mismatched user IDs`,
          });
        }

        summary.passedChecks++;
      }
    } catch (error) {
      issues.push({
        type: "review_location_check_failed",
        severity: "high",
        message: "Failed to check review-location consistency",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // 4. Check Sync Queue integrity
    summary.totalChecks++;
    try {
      const { data: syncQueue } = await adminClient
        .from("sync_queue")
        .select("id, account_id, user_id, status, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (syncQueue) {
        // Find old pending jobs (older than 1 hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const stalePendingJobs = syncQueue.filter(
          (job) =>
            job.status === "pending" && new Date(job.created_at) < oneHourAgo,
        );

        if (stalePendingJobs.length > 0) {
          warnings.push({
            type: "stale_sync_jobs",
            severity: "medium",
            count: stalePendingJobs.length,
            message: `Found ${stalePendingJobs.length} sync jobs pending for over 1 hour`,
          });
        }

        // Find jobs with invalid account references
        const { data: validAccounts } = await adminClient
          .from("gmb_accounts")
          .select("id");

        if (validAccounts) {
          const validAccountIds = validAccounts.map((a) => a.id);
          const jobsWithInvalidAccounts = syncQueue.filter(
            (job) => !validAccountIds.includes(job.account_id),
          );

          if (jobsWithInvalidAccounts.length > 0) {
            issues.push({
              type: "sync_jobs_invalid_accounts",
              severity: "high",
              count: jobsWithInvalidAccounts.length,
              message: `Found ${jobsWithInvalidAccounts.length} sync jobs with invalid account references`,
            });
          }
        }

        summary.passedChecks++;
      }
    } catch (error) {
      issues.push({
        type: "sync_queue_check_failed",
        severity: "high",
        message: "Failed to check sync queue integrity",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // Calculate summary
    summary.issuesFound = issues.length;
    summary.warningsFound = warnings.length;

    const overallHealth =
      summary.issuesFound === 0
        ? "healthy"
        : summary.issuesFound <= 2
          ? "warning"
          : "critical";

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      overallHealth,
      summary,
      issues,
      warnings,
      recommendations: generateRecommendations(issues, warnings),
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

function generateRecommendations(issues: any[], warnings: any[]): string[] {
  const recommendations: string[] = [];

  if (issues.some((i) => i.type === "orphaned_locations")) {
    recommendations.push(
      "🔧 Clean up orphaned locations or restore missing GMB accounts",
    );
  }

  if (issues.some((i) => i.type === "orphaned_reviews")) {
    recommendations.push(
      "🔧 Archive orphaned reviews or restore missing locations",
    );
  }

  if (warnings.some((w) => w.type === "stale_sync_jobs")) {
    recommendations.push("⚡ Clear stale sync jobs and restart sync process");
  }

  if (issues.some((i) => i.type === "gmb_without_profiles")) {
    recommendations.push(
      "👤 Create missing user profiles or clean up invalid GMB accounts",
    );
  }

  if (warnings.some((w) => w.type === "incomplete_profiles")) {
    recommendations.push("📝 Complete missing profile information");
  }

  if (recommendations.length === 0) {
    recommendations.push("✅ All data consistency checks passed!");
  }

  return recommendations;
}
