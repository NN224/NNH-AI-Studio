import { redirect } from "next/navigation";

export default function RootPage() {
  // Redirect to home page which handles auth check
  redirect("/en/home");
}
