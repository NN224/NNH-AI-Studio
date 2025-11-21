"use client";

/**
 * أمثلة استخدام GenericManagementCard
 * لاستبدال review-management-card, post-management-card, qa-management-card
 */

import { GenericManagementCard } from "./generic-management-card";
import {
  MessageSquare,
  Star,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  MessageCircle,
  CheckCircle,
  Clock,
  FileText,
  Plus,
  Calendar,
} from "lucide-react";
import { GMBLocation } from "@/lib/types/gmb-types";
import { useTranslations } from "next-intl";

// ===================================
// 1. Review Management Card
// ===================================
export function ReviewManagementCardNew({
  location,
}: {
  location: GMBLocation;
}) {
  const t = useTranslations("gmb.managementCards.reviews");
  const responseRate = location.response_rate || 0;
  const reviewCount = location.review_count || 0;

  return (
    <GenericManagementCard
      title={t("title")}
      description={t("description")}
      titleIcon={MessageSquare}
      titleIconColor="text-orange-500"
      stats={[
        {
          icon: Star,
          label: t("stats.totalReviews"),
          value: reviewCount,
          subtext: t("stats.allTime"),
        },
        {
          icon: TrendingUp,
          label: t("stats.responseRate"),
          value: `${responseRate}%`,
          subtext: t("stats.ofReviews"),
          valueClassName:
            responseRate >= 80
              ? "text-green-400"
              : responseRate >= 50
                ? "text-yellow-400"
                : "text-red-400",
        },
      ]}
      infoBanner={{
        icon: AlertCircle,
        title:
          responseRate < 50
            ? t("infoBanner.lowRate.title")
            : t("infoBanner.goodRate.title"),
        description:
          responseRate < 50
            ? t("infoBanner.lowRate.description")
            : t("infoBanner.goodRate.description"),
        variant: responseRate < 50 ? "warning" : "success",
      }}
      actions={[
        {
          label: t("actions.viewAll"),
          href: "/reviews",
          icon: MessageSquare,
          variant: "default",
        },
        {
          label: t("actions.respondPending"),
          href: "/reviews?status=pending",
          variant: "outline",
        },
      ]}
    />
  );
}

// ===================================
// 2. Q&A Management Card
// ===================================
export function QAManagementCardNew({ location }: { location: GMBLocation }) {
  const t = useTranslations("gmb.managementCards.qa");

  return (
    <GenericManagementCard
      title={t("title")}
      description={t("description", { locationName: location.location_name })}
      titleIcon={HelpCircle}
      titleIconColor="text-orange-500"
      stats={[
        {
          icon: CheckCircle,
          label: t("stats.answered"),
          value: 0,
          subtext: t("stats.questions"),
          valueClassName: "text-green-400",
        },
        {
          icon: Clock,
          label: t("stats.pending"),
          value: 0,
          subtext: t("stats.questions"),
          valueClassName: "text-orange-400",
        },
      ]}
      infoBanner={{
        icon: MessageCircle,
        title: t("infoBanner.title"),
        description: t("infoBanner.description"),
        variant: "info",
      }}
      tips={[
        { text: t("tips.tip1") },
        { text: t("tips.tip2") },
        { text: t("tips.tip3") },
      ]}
      actions={[
        {
          label: t("actions.viewAll"),
          href: "/questions",
          icon: HelpCircle,
          variant: "default",
        },
        {
          label: t("actions.answerPending"),
          href: "/questions?status=pending",
          variant: "outline",
        },
      ]}
    />
  );
}

// ===================================
// 3. Post Management Card
// ===================================
export function PostManagementCardNew({ location }: { location: GMBLocation }) {
  const t = useTranslations("gmb.managementCards.posts");

  return (
    <GenericManagementCard
      title={t("title")}
      description={t("description", { locationName: location.location_name })}
      titleIcon={FileText}
      titleIconColor="text-orange-500"
      infoBanner={{
        icon: TrendingUp,
        title: t("infoBanner.title"),
        description: t("infoBanner.description"),
        variant: "info",
      }}
      tips={[
        { text: t("tips.whatsNew") },
        { text: t("tips.events") },
        { text: t("tips.offers") },
        { text: t("tips.products") },
      ]}
      actions={[
        {
          label: t("actions.createNew"),
          href: "/posts",
          icon: Plus,
          variant: "default",
        },
        {
          label: t("actions.manageExisting"),
          href: "/posts",
          icon: FileText,
          variant: "outline",
        },
      ]}
    />
  );
}

// ===================================
// مثال: Insights Management Card
// ===================================
export function InsightsManagementCard({
  location,
}: {
  location: GMBLocation;
}) {
  return (
    <GenericManagementCard
      title="Insights & Analytics"
      description="Track performance and customer engagement"
      titleIcon={TrendingUp}
      titleIconColor="text-blue-500"
      badge={{
        label: location.is_active ? "Active" : "Inactive",
        variant: location.is_active ? "default" : "secondary",
      }}
      stats={[
        {
          icon: Star,
          label: "Rating",
          value: location.rating?.toFixed(1) || "N/A",
          subtext: "out of 5.0",
          valueClassName: "text-yellow-400",
        },
        {
          icon: MessageSquare,
          label: "Total Reviews",
          value: location.review_count || 0,
          subtext: "reviews",
        },
      ]}
      infoBanner={{
        icon: Calendar,
        title: "Weekly Performance Update",
        description:
          "Your business has been viewed 1,234 times this week. That's +15% from last week!",
        variant: "success",
      }}
      actions={[
        {
          label: "View Full Analytics",
          href: `/analytics?location=${location.id}`,
          icon: TrendingUp,
          variant: "default",
        },
        {
          label: "Download Report",
          href: `/analytics/export?location=${location.id}`,
          variant: "outline",
        },
      ]}
    />
  );
}
