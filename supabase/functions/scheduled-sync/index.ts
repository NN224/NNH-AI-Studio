// Supabase Edge Function for Scheduled GMB Sync
// This function is called by pg_cron from Supabase Database

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify the request is from pg_cron (internal Supabase call)
    // You can add additional security checks here if needed
    const cronSecret =
      Deno.env.get("TRIGGER_SECRET") || Deno.env.get("CRON_SECRET");

    // Get the authorization header
    const authHeader = req.headers.get("authorization");

    // For production, verify the secret
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error("[Scheduled Sync] Unauthorized request");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[Scheduled Sync] Edge Function triggered");

    // Get the base URL of your Next.js app
    const baseUrl =
      Deno.env.get("NEXT_PUBLIC_BASE_URL") || "https://your-domain.com";
    const syncUrl = `${baseUrl}/api/gmb/scheduled-sync`;

    // Call the Next.js API endpoint
    const response = await fetch(syncUrl, {
      method: "GET",
      headers: {
        "X-Internal-Run": cronSecret || "",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("[Scheduled Sync] API Error:", errorData);
      return new Response(
        JSON.stringify({
          error: "Sync failed",
          details: errorData,
          status: response.status,
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const result = await response.json();
    console.log("[Scheduled Sync] Success:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[Scheduled Sync] Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
