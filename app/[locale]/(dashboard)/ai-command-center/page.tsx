/**
 * AI Command Center - Redirects to Home
 *
 * The Chat-First AI Command Center is now the main Home page
 */

import { redirect } from "next/navigation";

export default function AICommandCenterPage({
  params,
}: {
  params: { locale: string };
}) {
  redirect(`/${params.locale}/home`);
}
