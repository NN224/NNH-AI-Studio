"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface ComingSoonProps {
  readonly title: string;
  readonly description?: string;
  readonly icon?: string;
  readonly badge?: string | null;
  readonly className?: string;
  readonly children?: React.ReactNode;
}

export function ComingSoon({
  title,
  description,
  icon = "🚧",
  badge,
  className,
  children,
}: ComingSoonProps) {
  const t = useTranslations("dashboard.comingSoon");
  const finalDescription = description || t("defaultDescription");
  const finalBadge = badge === null ? null : badge || t("badge");
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-5 rounded-3xl border border-zinc-800 bg-zinc-900/50 p-12 text-center shadow-[0_0_40px_rgba(0,0,0,0.45)]",
        className,
      )}
    >
      <div className="text-5xl">{icon}</div>
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold text-white">{title}</h1>
        {finalDescription ? (
          <p className="max-w-2xl text-sm text-zinc-400">{finalDescription}</p>
        ) : null}
      </div>
      {finalBadge ? (
        <span className="rounded-full border border-orange-500/40 bg-orange-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-200">
          {finalBadge}
        </span>
      ) : null}
      {children}
    </div>
  );
}
