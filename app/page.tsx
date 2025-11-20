import { redirect } from "next/navigation";

export default function RootPage() {
  // Redirect to locale root (which now shows landing page)
  redirect("/en");
}
