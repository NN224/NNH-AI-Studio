import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

// This route uses Node.js APIs and cannot run in Edge Runtime
export const runtime = "nodejs";

interface EmailRequestBody {
  to: string;
  subject: string;
  html: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: EmailRequestBody = await request.json();
    const { to, subject, html } = body;

    // Validate required fields
    if (!to || !subject || !html) {
      return NextResponse.json(
        {
          error: "Missing required fields: to, subject, and html are required",
        },
        { status: 400 },
      );
    }

    // Check for required environment variables
    const emailUser = process.env.EMAIL_USER || "noreply@nnh.ae";
    const emailPassword = process.env.EMAIL_PASSWORD;
    const emailHost = process.env.EMAIL_HOST || "smtp.hostinger.com";
    const emailPort = process.env.EMAIL_PORT
      ? parseInt(process.env.EMAIL_PORT)
      : 465;

    if (!emailPassword) {
      console.error("EMAIL_PASSWORD environment variable is not set");
      return NextResponse.json(
        {
          error:
            "Email service is not configured. Please set EMAIL_PASSWORD environment variable.",
        },
        { status: 500 },
      );
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: emailHost,
      port: emailPort,
      secure: emailPort === 465, // true for 465, false for other ports
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
    });

    // Email options
    const mailOptions = {
      from: `"NNH AI Studio" <${emailUser}>`,
      to,
      subject,
      html,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log("Email sent successfully:", info.messageId);

    return NextResponse.json(
      {
        success: true,
        message: "Email sent successfully",
        messageId: info.messageId,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to send email:", error);

    // Determine if it's a configuration error or sending error
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const isConfigError =
      errorMessage.includes("auth") || errorMessage.includes("connect");

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
