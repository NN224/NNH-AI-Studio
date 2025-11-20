import { redirect } from "next/navigation";

export default function LocaleRootPage({
  params,
}: {
  params: { locale: string };
}) {
  // Redirect to home page with the locale
  redirect(`/${params.locale}/home`);
}
