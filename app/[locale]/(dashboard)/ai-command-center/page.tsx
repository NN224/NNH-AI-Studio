/**
 * AI Command Center Page - Redirects to Home
 *
 * AI features have been integrated into the Home page
 * for a unified experience.
 */

import { redirect } from "next/navigation";

export default function AICommandCenterPage() {
  redirect("/home");
}
