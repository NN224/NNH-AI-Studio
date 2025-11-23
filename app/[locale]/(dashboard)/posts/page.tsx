import { useTranslations } from "next-intl";
import { PostCreator } from "@/components/posts/post-creator";

export default function PostsPage() {
  const t = useTranslations("dashboard.posts");

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-zinc-400 mt-2">{t("description")}</p>
        </div>

        <PostCreator />
      </div>
    </div>
  );
}
