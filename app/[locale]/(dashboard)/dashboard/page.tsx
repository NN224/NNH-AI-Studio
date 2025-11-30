/**
 * Dashboard Page - Redirects to Home
 *
 * This page used to be "AI Command Center" but has been consolidated
 * with the Home page for a simpler user experience.
 */

import { redirect } from "next/navigation";

export default function DashboardPage() {
  // Redirect to home page
  redirect("/home");
}
