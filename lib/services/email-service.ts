/**
 * IMPORTANT: This service uses Node.js APIs (nodemailer) that are not compatible with Edge Runtime.
 * For client-side usage or Edge Runtime compatibility, please use the API route at:
 * /api/email/send
 *
 * Or use the email-client.ts wrapper which calls the API route properly.
 * This file should only be imported in Node.js runtime contexts (API routes with runtime: 'nodejs')
 */

import { apiLogger } from "@/lib/utils/logger";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 465, // أو 587 إذا كنت تستخدم TLS
  secure: true, // true إذا كنت تستخدم SSL
  auth: {
    user: "noreply@nnh.ae", // بريدك الإلكتروني
    pass: "your_email_password", // كلمة المرور
  },
});

export async function sendEmail(to: string, subject: string, html: string) {
  const mailOptions = {
    from: '"NNH AI Studio" <noreply@nnh.ae>',
    to,
    subject,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    apiLogger.info("Email sent successfully", { to, subject });
  } catch (error) {
    apiLogger.error(
      "Failed to send email",
      error instanceof Error ? error : new Error(String(error)),
      { to, subject },
    );
    throw new Error("Failed to send email");
  }
}

// Contact form notification email
export async function sendContactNotification(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
  phone?: string;
  company?: string;
}) {
  const html = `
    <h2>New Contact Form Submission</h2>
    <p><strong>Name:</strong> ${data.name}</p>
    <p><strong>Email:</strong> ${data.email}</p>
    ${data.phone ? `<p><strong>Phone:</strong> ${data.phone}</p>` : ""}
    ${data.company ? `<p><strong>Company:</strong> ${data.company}</p>` : ""}
    <p><strong>Subject:</strong> ${data.subject}</p>
    <p><strong>Message:</strong></p>
    <p>${data.message.replace(/\n/g, "<br>")}</p>
    <hr>
    <p><small>Submitted from NNH AI Studio Contact Form</small></p>
  `;

  await sendEmail("support@nnh.ae", `Contact Form: ${data.subject}`, html);
}

// Newsletter welcome email
export async function sendNewsletterWelcome(email: string) {
  const html = `
    <h2>Welcome to NNH AI Studio Newsletter!</h2>
    <p>Thank you for subscribing to our newsletter.</p>
    <p>You'll receive updates on:</p>
    <ul>
      <li>Latest features and updates</li>
      <li>Tips and best practices</li>
      <li>Industry insights</li>
      <li>Special offers</li>
    </ul>
    <p>Stay tuned!</p>
    <hr>
    <p><small>To unsubscribe, click <a href="${process.env.NEXT_PUBLIC_APP_URL}/api/newsletter?email=${email}">here</a></small></p>
  `;

  await sendEmail(email, "Welcome to NNH AI Studio Newsletter", html);
}
