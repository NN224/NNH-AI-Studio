import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken, refreshAccessToken } from "@/lib/gmb/helpers";
import { resolveTokenValue } from "@/lib/security/encryption";

export const dynamic = "force-dynamic";

export async function GET() {
  const logs: string[] = [];
  const log = (msg: string, data?: any) => {
    console.log(`[OAuth Check] ${msg}`, data || "");
    logs.push(`${msg} ${data ? JSON.stringify(data, null, 2) : ""}`);
  };

  try {
    log("Starting Advanced OAuth Check...");
    const supabase = createClient();

    // 1. Check User Session
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      log("❌ No active user session");
      return Response.json({ success: false, logs }, { status: 401 });
    }
    log(`✅ User authenticated: ${user.email} (${user.id})`);

    // 2. Get GMB Account
    const { data: accounts, error: accountsError } = await supabase
      .from("gmb_accounts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (accountsError) {
      log("❌ Database error fetching accounts", accountsError);
      return Response.json(
        { success: false, logs, error: accountsError },
        { status: 500 },
      );
    }

    if (!accounts || accounts.length === 0) {
      log("❌ No GMB accounts found for this user");
      return Response.json({ success: false, logs }, { status: 404 });
    }

    const account = accounts[0];
    log(
      `✅ Found GMB Account: ${account.account_name} (${account.account_id})`,
    );
    log(`   ID: ${account.id}`);
    log(`   Created: ${account.created_at}`);
    log(`   Updated: ${account.updated_at}`);

    // 3. Check Token Existence & Decryption
    log("Checking tokens...");
    let accessToken: string | null = null;
    let refreshToken: string | null = null;

    try {
      if (!account.access_token) throw new Error("Missing access_token in DB");
      if (!account.refresh_token)
        throw new Error("Missing refresh_token in DB");

      accessToken = resolveTokenValue(account.access_token, {
        context: "check_access",
      });
      refreshToken = resolveTokenValue(account.refresh_token, {
        context: "check_refresh",
      });

      if (!accessToken) throw new Error("Decrypted access token is null");
      if (!refreshToken) throw new Error("Decrypted refresh token is null");

      log("✅ Tokens decrypted successfully");
    } catch (e: any) {
      log("❌ Token decryption failed", e.message);
      return Response.json(
        { success: false, logs, error: e.message },
        { status: 500 },
      );
    }

    // 4. Check Expiration
    const now = Date.now();
    const expiresAt = account.token_expires_at
      ? new Date(account.token_expires_at).getTime()
      : 0;
    const expiresInMinutes = (expiresAt - now) / 1000 / 60;

    log(`Token Status:`);
    log(`   Expires at: ${account.token_expires_at}`);
    log(`   Expires in: ${expiresInMinutes.toFixed(2)} minutes`);

    if (expiresInMinutes < 0) {
      log("⚠️ Token is EXPIRED");
    } else {
      log("✅ Token is valid (time-wise)");
    }

    // 5. Test Refresh Mechanism
    log("Testing Refresh Token mechanism...");
    try {
      if (!refreshToken) throw new Error("No refresh token available");

      const refreshResult = await refreshAccessToken(refreshToken);
      log("✅ Refresh Token works! Got new access token.");
      log(`   New expires_in: ${refreshResult.expires_in}`);

      // We are NOT saving this to DB to avoid side effects during this check,
      // unless we want to "fix" it. For now, just verifying it works.
      // Actually, if we don't save it, the next real call might fail if the refresh token was rotated (unlikely for Google).
      // Google refresh tokens don't usually rotate on use unless configured.
    } catch (e: any) {
      log("❌ Refresh Token failed", e.message);
      return Response.json(
        { success: false, logs, error: "Refresh token invalid" },
        { status: 500 },
      );
    }

    // 6. Test API Call (UserInfo)
    log("Testing API Call to Google UserInfo...");
    try {
      // Use the *current* access token (or the refreshed one if we wanted to be sure, but let's test the stored one first if valid)
      // If it's expired, we should have used the refreshed one.

      let tokenToUse = accessToken;
      if (expiresInMinutes < 0) {
        log(
          "   (Using refreshed token for API call since stored one is expired)",
        );
        const refreshResult = await refreshAccessToken(refreshToken!);
        tokenToUse = refreshResult.access_token;
      }

      const userInfoResponse = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: {
            Authorization: `Bearer ${tokenToUse}`,
          },
        },
      );

      if (!userInfoResponse.ok) {
        const errorText = await userInfoResponse.text();
        log(`❌ API Call failed: ${userInfoResponse.status}`, errorText);
        throw new Error(`API Call failed: ${userInfoResponse.status}`);
      }

      const userInfo = await userInfoResponse.json();
      log("✅ API Call successful!");
      log(`   User: ${userInfo.email}`);
      log(`   Name: ${userInfo.name}`);
    } catch (e: any) {
      log("❌ API Test failed", e.message);
      return Response.json(
        { success: false, logs, error: "API call failed" },
        { status: 500 },
      );
    }

    log("🎉 ALL CHECKS PASSED");
    return Response.json({
      success: true,
      logs,
      account: {
        id: account.id,
        email: account.email,
        is_active: account.is_active,
      },
    });
  } catch (error: any) {
    log("❌ Unexpected error", error.message);
    return Response.json(
      { success: false, logs, error: error.message },
      { status: 500 },
    );
  }
}
