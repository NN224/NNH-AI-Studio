"use client";

import { ManagementCard } from "./management-card";
import { Star, FileText, HelpCircle, Plus, Eye } from "lucide-react";
import { useTranslations } from "next-intl";

interface ManagementData {
  reviews: {
    total: number;
    pending: number;
    responseRate: string;
  };
  posts: {
    published: number;
    scheduled: number;
    nextPost?: string;
  };
  questions: {
    total: number;
    unanswered: number;
    avgResponseTime?: string;
  };
}

interface ManagementSectionsGridProps {
  data?: ManagementData;
  isLoading?: boolean;
}

export function ManagementSectionsGrid({
  data,
  isLoading,
}: ManagementSectionsGridProps) {
  const t = useTranslations("aiCommandCenter.management");

  // Mock data
  const managementData: ManagementData = data || {
    reviews: { total: 150, pending: 5, responseRate: "85%" },
    posts: { published: 24, scheduled: 3, nextPost: "3:00 PM" },
    questions: { total: 18, unanswered: 3, avgResponseTime: "2.5h" },
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-64 bg-zinc-900/50 animate-pulse rounded-lg"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {/* Reviews Management */}
      <ManagementCard
        icon={Star}
        iconColor="text-yellow-500"
        title={t("reviews.title", { defaultValue: "Reviews Management" })}
        description={t("reviews.description", {
          defaultValue: "Monitor and respond to customer reviews",
        })}
        stats={{
          total: managementData.reviews.total,
          pending: managementData.reviews.pending,
          responseRate: managementData.reviews.responseRate,
        }}
        actions={[
          {
            label: t("reviews.viewAll", { defaultValue: "View All Reviews" }),
            href: "/reviews",
            icon: Eye,
          },
          {
            label: t("reviews.respondPending", {
              defaultValue: "Respond to Pending",
            }),
            href: "/reviews?status=pending",
            variant: "outline",
          },
        ]}
      />

      {/* Posts Management */}
      <ManagementCard
        icon={FileText}
        iconColor="text-blue-500"
        title={t("posts.title", { defaultValue: "Posts Management" })}
        description={t("posts.description", {
          defaultValue: "Create and schedule Google posts",
        })}
        stats={{
          published: managementData.posts.published,
          scheduled: managementData.posts.scheduled,
          ...(managementData.posts.nextPost && {
            nextPost: managementData.posts.nextPost,
          }),
        }}
        actions={[
          {
            label: t("posts.createNew", { defaultValue: "Create New Post" }),
            href: "/posts/create",
            icon: Plus,
          },
          {
            label: t("posts.manage", { defaultValue: "Manage Posts" }),
            href: "/posts",
            variant: "outline",
            icon: Eye,
          },
        ]}
      />

      {/* Q&A Management */}
      <ManagementCard
        icon={HelpCircle}
        iconColor="text-purple-500"
        title={t("qa.title", { defaultValue: "Q&A Management" })}
        description={t("qa.description", {
          defaultValue: "Answer customer questions",
        })}
        stats={{
          total: managementData.questions.total,
          unanswered: managementData.questions.unanswered,
          ...(managementData.questions.avgResponseTime && {
            avgTime: managementData.questions.avgResponseTime,
          }),
        }}
        actions={[
          {
            label: t("qa.answer", { defaultValue: "Answer Questions" }),
            href: "/questions?status=pending",
          },
          {
            label: t("qa.viewAll", { defaultValue: "View All" }),
            href: "/questions",
            variant: "outline",
            icon: Eye,
          },
        ]}
      />
    </div>
  );
}
