import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Missing authentication token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const userId = userData.user.id;

    const { reviewId, replyText } = await req.json();

    if (!reviewId || !replyText) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1) Fetch review first
    const { data: review, error: reviewError } = await supabase
      .from("gmb_reviews")
      .select("external_review_id, location_id")
      .eq("id", reviewId)
      .maybeSingle();

    if (reviewError || !review) {
      return new Response(
        JSON.stringify({ error: "Review not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2) Derive account via review -> location -> account
    const { data: locationRow, error: locationError } = await supabase
      .from("gmb_locations")
      .select("gmb_account_id, location_id")
      .eq("id", review.location_id)
      .maybeSingle();

    if (locationError || !locationRow?.gmb_account_id) {
      return new Response(
        JSON.stringify({ error: "Location not found for this review" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accountId = locationRow.gmb_account_id as string;

    const { data: account, error: accountError } = await supabase
      .from("gmb_accounts")
      .select("account_id, access_token, refresh_token, token_expires_at")
      .eq("id", accountId)
      .eq("user_id", userId)
      .maybeSingle();

    if (accountError || !account) {
      return new Response(
        JSON.stringify({ error: "Account not found or not owned by user" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let accessToken = account.access_token;
    const expiresAt = new Date(account.token_expires_at);
    const now = new Date();

    if (expiresAt <= now) {
      if (!account.refresh_token) {
        return new Response(
          JSON.stringify({ error: "Token expired and refresh token is missing" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
      const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

      const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          refresh_token: account.refresh_token,
          client_id: googleClientId,
          client_secret: googleClientSecret,
          grant_type: "refresh_token",
        }),
      });

      if (!refreshResponse.ok) {
        throw new Error("Failed to refresh token");
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;

      const newExpiresAt = new Date();
      newExpiresAt.setSeconds(newExpiresAt.getSeconds() + refreshData.expires_in);

      await supabase
        .from("gmb_accounts")
        .update({
          access_token: accessToken,
          token_expires_at: newExpiresAt.toISOString(),
        })
        .eq("id", accountId);
    }

    const locIdPart = String(locationRow.location_id || '').split('/').pop();
    const reviewName = `${account.account_id}/locations/${locIdPart}/reviews/${review.external_review_id}`;

    const replyResponse = await fetch(
      `https://mybusiness.googleapis.com/v4/${reviewName}/reply`,
      {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          comment: replyText,
        }),
      }
    );

    if (!replyResponse.ok) {
      const errorData = await replyResponse.json();
      throw new Error(`GMB API error: ${errorData.error?.message || "Unknown error"}`);
    }

    await supabase
      .from("gmb_reviews")
      .update({
        reply_text: replyText,
        reply_date: new Date().toISOString(),
        has_reply: true,
      })
      .eq("id", reviewId);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Review reply error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});