import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, source = "website" } = body;

    // Validation
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Check if already subscribed
    const { data: existing } = await supabase
      .from("newsletter_subscriptions")
      .select("*")
      .eq("email", email)
      .single();

    if (existing) {
      if (existing.status === "active") {
        return NextResponse.json(
          { message: "Email already subscribed" },
          { status: 200 },
        );
      } else {
        // Reactivate subscription
        const { error } = await supabase
          .from("newsletter_subscriptions")
          .update({
            status: "active",
            subscribed_at: new Date().toISOString(),
            unsubscribed_at: null,
          })
          .eq("email", email);

        if (error) {
          console.error("Resubscribe error:", error);
          return NextResponse.json(
            { error: "Failed to resubscribe" },
            { status: 500 },
          );
        }

        return NextResponse.json(
          { success: true, message: "Resubscribed successfully" },
          { status: 200 },
        );
      }
    }

    // New subscription
    const { error } = await supabase.from("newsletter_subscriptions").insert({
      email,
      source,
      status: "active",
      subscribed_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Subscribe error:", error);
      return NextResponse.json(
        { error: "Failed to subscribe" },
        { status: 500 },
      );
    }

    // TODO: Send welcome email
    // await sendWelcomeEmail(email);

    return NextResponse.json(
      {
        success: true,
        message: "Successfully subscribed to newsletter",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Newsletter subscription error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Unsubscribe endpoint
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("newsletter_subscriptions")
      .update({
        status: "unsubscribed",
        unsubscribed_at: new Date().toISOString(),
      })
      .eq("email", email);

    if (error) {
      console.error("Unsubscribe error:", error);
      return NextResponse.json(
        { error: "Failed to unsubscribe" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Successfully unsubscribed from newsletter",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Newsletter unsubscribe error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
