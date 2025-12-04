import { createAdminClient } from "@/lib/supabase/server";
import { refreshAccessToken } from "@/lib/gmb/helpers";
import { encryptToken } from "@/lib/security/encryption";
import { gmbLogger } from "@/lib/utils/logger";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max (Vercel Pro limit)

/**
 * Proactive Token Refresh Cron Job
 *
 * Purpose: Refresh GMB access tokens BEFORE they expire (proactive)
 * Schedule: Every 6 hours (Vercel cron: 0 star-slash-6 star star star)
 * Target: Accounts expiring within 24 hours AND have refresh_token
 *
 * Flow:
 * 1. Find accounts with tokens expiring within 24 hours
 * 2. Filter to only those WITH refresh_token
 * 3. Attempt to refresh each token
 * 4. Update database with new tokens
 * 5. Log results for monitoring
 *
 * Benefits:
 * - Reduces user-facing "reconnect" errors
 * - Prevents service interruption
 * - Increases OAuth success rate from ~70% to >95%
 */
export async function GET(request: Request) {
  const startTime = Date.now();

  try {
    // Verify cron secret (Vercel automatically adds this header)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      gmbLogger.warn("Unauthorized cron attempt", {
        hasAuthHeader: !!authHeader,
        hasCronSecret: !!cronSecret,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 1: Find accounts with tokens expiring within 24 hours
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const expiryThreshold = new Date();
    expiryThreshold.setHours(expiryThreshold.getHours() + 24);

    const { data: expiringAccounts, error: fetchError } = await adminClient
      .from("gmb_accounts")
      .select(
        `
        id,
        account_id,
        account_name,
        user_id,
        token_expires_at,
        gmb_secrets!inner (
          access_token,
          refresh_token
        )
      `,
      )
      .eq("is_active", true)
      .lt("token_expires_at", expiryThreshold.toISOString())
      .gt("token_expires_at", new Date().toISOString()); // Not yet expired

    if (fetchError) {
      gmbLogger.error(
        "Failed to fetch expiring accounts",
        fetchError instanceof Error
          ? fetchError
          : new Error(String(fetchError)),
      );
      return NextResponse.json(
        { error: "Failed to fetch accounts", details: fetchError },
        { status: 500 },
      );
    }

    if (!expiringAccounts || expiringAccounts.length === 0) {
      gmbLogger.info("No expiring tokens found", {
        expiryThreshold: expiryThreshold.toISOString(),
        executionTime: Date.now() - startTime,
      });
      return NextResponse.json({
        message: "No tokens need refresh",
        refreshed: 0,
        failed: 0,
        skipped: 0,
      });
    }

    gmbLogger.info("Found expiring accounts", {
      count: expiringAccounts.length,
      expiryThreshold: expiryThreshold.toISOString(),
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 2: Filter accounts WITH refresh_token and attempt refresh
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const results = {
      refreshed: 0,
      failed: 0,
      skipped: 0,
      errors: [] as Array<{ accountId: string; error: string }>,
    };

    // Process accounts sequentially to avoid rate limits
    for (const account of expiringAccounts) {
      const secrets = Array.isArray(account.gmb_secrets)
        ? account.gmb_secrets[0]
        : account.gmb_secrets;

      // Skip if no refresh_token available
      if (!secrets?.refresh_token) {
        results.skipped++;
        gmbLogger.warn("Skipping account without refresh_token", {
          accountId: account.id,
          accountName: account.account_name,
          expiresAt: account.token_expires_at,
        });
        continue;
      }

      try {
        // Decrypt refresh_token
        const { resolveTokenValue } = await import("@/lib/security/encryption");
        const refreshToken = resolveTokenValue(secrets.refresh_token);

        if (!refreshToken) {
          results.skipped++;
          gmbLogger.warn("Failed to decrypt refresh_token", {
            accountId: account.id,
          });
          continue;
        }

        // Refresh the token
        gmbLogger.info("Attempting token refresh", {
          accountId: account.id,
          accountName: account.account_name,
          expiresAt: account.token_expires_at,
          hoursUntilExpiry: Math.round(
            (new Date(account.token_expires_at).getTime() - Date.now()) /
              (1000 * 60 * 60),
          ),
        });

        const tokens = await refreshAccessToken(refreshToken);
        const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

        // Update gmb_accounts (expiry)
        await adminClient
          .from("gmb_accounts")
          .update({
            token_expires_at: newExpiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", account.id);

        // Update gmb_secrets (tokens)
        await adminClient
          .from("gmb_secrets")
          .update({
            access_token: encryptToken(tokens.access_token),
            ...(tokens.refresh_token && {
              refresh_token: encryptToken(tokens.refresh_token),
            }),
            updated_at: new Date().toISOString(),
          })
          .eq("account_id", account.id);

        results.refreshed++;
        gmbLogger.info("Token refreshed successfully (proactive cron)", {
          accountId: account.id,
          accountName: account.account_name,
          userId: account.user_id,
          oldExpiry: account.token_expires_at,
          newExpiry: newExpiresAt.toISOString(),
          hoursExtended: Math.round(
            (newExpiresAt.getTime() -
              new Date(account.token_expires_at).getTime()) /
              (1000 * 60 * 60),
          ),
        });
      } catch (error) {
        results.failed++;
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        results.errors.push({
          accountId: account.id,
          error: errorMessage,
        });

        gmbLogger.error(
          "Token refresh failed (proactive cron)",
          error instanceof Error ? error : new Error(String(error)),
          {
            accountId: account.id,
            accountName: account.account_name,
            userId: account.user_id,
            expiresAt: account.token_expires_at,
            errorMessage,
          },
        );

        // Optionally deactivate account if refresh fails
        // (Same as helpers.ts logic)
        if (
          errorMessage.includes("invalid_grant") ||
          errorMessage.includes("Token has been expired or revoked")
        ) {
          await adminClient
            .from("gmb_accounts")
            .update({
              is_active: false,
              updated_at: new Date().toISOString(),
            })
            .eq("id", account.id);

          gmbLogger.warn("Account deactivated due to invalid refresh_token", {
            accountId: account.id,
            userId: account.user_id,
          });
        }
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 3: Return summary
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const executionTime = Date.now() - startTime;

    gmbLogger.info("Proactive token refresh completed", {
      totalAccounts: expiringAccounts.length,
      refreshed: results.refreshed,
      failed: results.failed,
      skipped: results.skipped,
      executionTimeMs: executionTime,
      executionTimeSec: Math.round(executionTime / 1000),
    });

    return NextResponse.json({
      message: "Proactive token refresh completed",
      totalAccounts: expiringAccounts.length,
      refreshed: results.refreshed,
      failed: results.failed,
      skipped: results.skipped,
      executionTimeMs: executionTime,
      errors:
        results.errors.length > 0
          ? results.errors.slice(0, 10)
          : undefined /* max 10 errors */,
    });
  } catch (error: unknown) {
    const executionTime = Date.now() - startTime;

    gmbLogger.error(
      "Proactive token refresh cron failed",
      error instanceof Error ? error : new Error(String(error)),
      {
        errorMessage: error instanceof Error ? error.message : String(error),
        executionTimeMs: executionTime,
      },
    );

    return NextResponse.json(
      {
        error: "Cron execution failed",
        message: error instanceof Error ? error.message : String(error),
        executionTimeMs: executionTime,
      },
      { status: 500 },
    );
  }
}
