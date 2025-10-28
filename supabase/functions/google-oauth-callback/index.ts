import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      throw new Error(`OAuth error: ${error}`);
    }

    if (!code || !state) {
      throw new Error("Missing code or state parameter");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: stateRecord, error: stateError } = await supabase
      .from("oauth_states")
      .select("*")
      .eq("state", state)
      .eq("used", false)
      .single();

    if (stateError || !stateRecord) {
      throw new Error("Invalid or expired state parameter");
    }

    const expiresAt = new Date(stateRecord.expires_at);
    if (expiresAt < new Date()) {
      throw new Error("State has expired");
    }

    await supabase
      .from("oauth_states")
      .update({ used: true })
      .eq("state", state);

    const userId = stateRecord.user_id;

    if (!userId) {
      throw new Error("Missing user ID in state");
    }

    const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
    const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
    const GOOGLE_REDIRECT_URI = Deno.env.get("GOOGLE_REDIRECT_URI");

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
      throw new Error("Missing Google OAuth configuration");
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      throw new Error(`Token exchange failed: ${errorData.error_description || errorData.error}`);
    }

    const tokens = await tokenResponse.json();

    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      throw new Error("Failed to fetch user info from Google");
    }

    const userInfo = await userInfoResponse.json();

    const tokenExpiresAt = new Date();
    tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + (tokens.expires_in || 3600));

    const gmbAccountsResponse = await fetch(
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    if (!gmbAccountsResponse.ok) {
      console.error("Failed to fetch GMB accounts:", await gmbAccountsResponse.text());
      throw new Error("Failed to fetch GMB accounts from Google");
    }

    const gmbAccountsData = await gmbAccountsResponse.json();
    const gmbAccounts = gmbAccountsData.accounts || [];

    if (gmbAccounts.length === 0) {
      console.warn("No GMB accounts found for user");
    }

    for (const gmbAccount of gmbAccounts) {
      const accountName = gmbAccount.accountName || gmbAccount.name;
      const accountId = gmbAccount.name; // هذا هو (e.g., "accounts/12345")

      const { data: existingAccount } = await supabase
        .from("gmb_accounts")
        .select("id, refresh_token")
        .eq("user_id", userId)
        .eq("account_id", accountId)
        .maybeSingle();

      let savedAccountId: string;

      if (existingAccount) {
        // Try with status first
        let { error: updateError } = await supabase
          .from("gmb_accounts")
          .update({
            account_name: accountName,
            account_id: accountId,
            email: userInfo.email,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token ?? existingAccount.refresh_token,
            token_expires_at: tokenExpiresAt.toISOString(),
            status: "active",
            last_sync: new Date().toISOString(),
          })
          .eq("id", existingAccount.id);

        // Fallback if 'status' column is missing
        if (updateError) {
          const fb = await supabase
            .from("gmb_accounts")
            .update({
              account_name: accountName,
              account_id: accountId,
              email: userInfo.email,
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token ?? existingAccount.refresh_token,
              token_expires_at: tokenExpiresAt.toISOString(),
              is_active: true,
              last_sync: new Date().toISOString(),
            })
            .eq("id", existingAccount.id);
          if (fb.error) {
            console.error("Error updating account:", fb.error);
            continue;
          }
        }
        savedAccountId = existingAccount.id;
      } else {
        // Try insert with status first
        let insert = await supabase
          .from("gmb_accounts")
          .insert({
            user_id: userId,
            account_name: accountName,
            account_id: accountId,
            email: userInfo.email,
            google_account_id: userInfo.id,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expires_at: tokenExpiresAt.toISOString(),
            status: "active",
          })
          .select("id")
          .single();

        if (insert.error || !insert.data) {
          // Fallback insert with is_active
          const fb = await supabase
            .from("gmb_accounts")
            .insert({
              user_id: userId,
              account_name: accountName,
              account_id: accountId,
              email: userInfo.email,
              google_account_id: userInfo.id,
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token,
              token_expires_at: tokenExpiresAt.toISOString(),
              is_active: true,
            })
            .select("id")
            .single();
          if (fb.error || !fb.data) {
            console.error("Error inserting account:", insert.error || fb.error);
            continue;
          }
          savedAccountId = fb.data.id;
        } else {
          savedAccountId = insert.data.id;
        }
      }

      // *** هذا هو السطر الذي تم إصلاحه ***
      // تم استخدام الرابط الكامل لـ Google API
      const locationsResponse = await fetch(
        `https://mybusinessbusinessinformation.googleapis.com/v1/${accountId}/locations?readMask=name,title,storefrontAddress,phoneNumbers,websiteUri,categories`,
        {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
          },
        }
      );

      if (locationsResponse.ok) {
        const locationsData = await locationsResponse.json();
        const locations = locationsData.locations || [];

        for (const location of locations) {
          const { data: existingLocation } = await supabase
            .from("gmb_locations")
            .select("id")
            .eq("gmb_account_id", savedAccountId)
            .eq("location_id", location.name)
            .maybeSingle();

          const locationData = {
            gmb_account_id: savedAccountId,
            location_name: location.title || "Unnamed Location",
            location_id: location.name,
            address: location.storefrontAddress
              ? `${location.storefrontAddress.addressLines?.join(", ") || ""}, ${location.storefrontAddress.locality || ""}, ${location.storefrontAddress.administrativeArea || ""} ${location.storefrontAddress.postalCode || ""}`
              : null,
            phone: location.phoneNumbers?.primaryPhone || null,
            category: location.categories?.primaryCategory?.displayName || null,
            website: location.websiteUri || null,
            is_active: true,
            metadata: location,
          };

          if (existingLocation) {
            await supabase
              .from("gmb_locations")
              .update(locationData)
              .eq("id", existingLocation.id);
          } else {
            await supabase
              .from("gmb_locations")
              .insert(locationData);
          }
        }
      }
    }

    const successUrl = Deno.env.get("FRONTEND_REDIRECT_SUCCESS") || "https://www.nnh.ae/accounts";

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        "Location": `${successUrl}#success=true`, // إرسال رسالة النجاح كـ hash
      },
    });
  } catch (error) {
    console.error("OAuth callback error:", error);

    const errorUrl = Deno.env.get("FRONTEND_REDIRECT_ERROR") || "https://www.nnh.ae/accounts";
    const errorMessage = error instanceof Error ? error.message : "OAuth callback failed";

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        "Location": `${errorUrl}#error=${encodeURIComponent(errorMessage)}`, // إرسال رسالة الخطأ كـ hash
      },
    });
  }
});