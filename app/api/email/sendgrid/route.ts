import { createClient } from "@/lib/supabase/server";
import { apiLogger } from "@/lib/utils/logger";
import sgMail from "@sendgrid/mail";
import { NextRequest, NextResponse } from "next/server";

// This route uses Node.js APIs and cannot run in Edge Runtime
export const runtime = "nodejs";

interface EmailRequestBody {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: EmailRequestBody = await request.json();
    const { to, subject, html, from } = body;

    // Validate required fields
    if (!to || !subject || !html) {
      return NextResponse.json(
        {
          error: "Missing required fields: to, subject, and html are required",
        },
        { status: 400 },
      );
    }

    // Check for SendGrid API key
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      apiLogger.error(
        "SENDGRID_API_KEY environment variable is not set",
        new Error("SENDGRID_API_KEY missing"),
      );
      return NextResponse.json(
        {
          error:
            "SendGrid service is not configured. Please set SENDGRID_API_KEY environment variable.",
        },
        { status: 500 },
      );
    }

    // Check for sender email
    const senderEmail =
      from || process.env.SENDGRID_FROM_EMAIL || "noreply@nnh.ae";
    const senderName = process.env.SENDGRID_FROM_NAME || "NNH AI Studio";

    // Initialize SendGrid
    sgMail.setApiKey(apiKey);

    // Email message configuration
    const msg = {
      to,
      from: {
        email: senderEmail,
        name: senderName,
      },
      subject,
      html,
    };

    // Send email
    const [response] = await sgMail.send(msg);

    console.log("SendGrid email sent successfully:", response.statusCode);

    return NextResponse.json(
      {
        success: true,
        message: "Email sent successfully",
        statusCode: response.statusCode,
        headers: response.headers,
      },
      { status: 200 },
    );
  } catch (error) {
    apiLogger.error(
      "Failed to send email via SendGrid",
      error instanceof Error ? error : new Error(String(error)),
    );

    // Handle SendGrid specific errors
    if (error && typeof error === "object" && "response" in error) {
      const sgError = error as any;
      const statusCode = sgError.response?.statusCode || 500;
      const errorBody = sgError.response?.body || {};

      return NextResponse.json(
        {
          error: "SendGrid error",
          statusCode,
          details:
            process.env.NODE_ENV === "development" ? errorBody : undefined,
        },
        { status: statusCode },
      );
    }

    // Handle general errors
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const isConfigError =
      errorMessage.includes("API") || errorMessage.includes("key");

    return NextResponse.json(
      {
        error: "Failed to send email",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        isConfigError,
      },
      { status: isConfigError ? 500 : 400 },
    );
  }
}
