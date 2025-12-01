import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, company, subject, message } = body;

    // Validation
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
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

    // Store in database
    const { data, error } = await supabase
      .from("contact_submissions")
      .insert({
        name,
        email,
        phone: phone || null,
        company: company || null,
        subject,
        message,
        status: "new",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to save contact submission" },
        { status: 500 },
      );
    }

    // Send email notification (async, don't wait)
    try {
      const { sendContactNotification } = await import(
        "@/lib/services/email-service"
      );
      await sendContactNotification({
        name,
        email,
        phone,
        company,
        subject,
        message,
      });
    } catch (emailError) {
      console.error("Failed to send notification email:", emailError);
      // Continue even if email fails
    }

    return NextResponse.json(
      {
        success: true,
        message: "Contact form submitted successfully",
        id: data.id,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
