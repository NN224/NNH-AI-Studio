"use client";

import { t } from "@/lib/i18n/stub";
import { ComingSoon } from "@/components/common/coming-soon";

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="mx-auto max-w-4xl">
        <ComingSoon
          title={t("title")}
          description={t("description")}
          icon="📈"
        />
      </div>
    </div>
  );
}
