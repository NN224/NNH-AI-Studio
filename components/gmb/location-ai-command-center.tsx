"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BarChart2,
  Bell,
  CheckCircle2,
  Clock,
  MapPin,
  MessageSquare,
  Phone,
  RefreshCw,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import LocationInsightsCard from "./location-insights-card";
import { GMBLocation } from "@/lib/types/gmb-types";
import { SyncButton, ViewDetailsButton } from "@/app/[locale]/(dashboard)/dashboard/DashboardClient";

type NumericMetric = number | null | undefined;

interface CommandCenterMetrics {
  status: string;
  statusTone: "success" | "warning" | "danger";
  isActive: boolean;
  rating: number | null;
  reviewCount: number;
  responseRate: number | null;
  pendingReviews: number | null;
  pendingQuestions: number | null;
  healthScore: number | null;
  weeklyGrowth: number | null;
  lastSync: string | null;
  lastSyncRelative: string;
  insights: {
    views: number;
    viewsTrend: number | null;
    clicks: number;
    clicksTrend: number | null;
    calls: number;
    callsTrend: number | null;
    directions: number;
    directionsTrend: number | null;
    website: number;
    websiteTrend: number | null;
  };
  aiInsights: string[];
}

const MAX_AI_INSIGHTS = 4;

function ensureObject(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof value === "object") {
    return value as Record<string, unknown>;
  }
  return {};
}

function ensureArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === "string") return entry;
        if (entry && typeof entry === "object") {
          const normalized = (entry as Record<string, unknown>).message ?? (entry as Record<string, unknown>).text;
          return typeof normalized === "string" ? normalized : null;
        }
        return null;
      })
      .filter((entry): entry is string => Boolean(entry));
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return ensureArray(parsed);
    } catch {
      return value
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function toNumber(value: NumericMetric, fallback = 0): number {
  const numeric = typeof value === "string" ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toNullableNumber(value: NumericMetric): number | null {
  const numeric = typeof value === "string" ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function getRelativeTime(timestamp: string | null): string {
  if (!timestamp) return "لم يتم التحديث";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "غير معروف";
  }

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return "قريباً";

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) return "قبل لحظات";
  if (diffMinutes < 60) return `قبل ${diffMinutes} دقيقة`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `قبل ${diffHours} ساعة`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `قبل ${diffDays} يوم`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `قبل ${diffMonths} شهر`;

  const diffYears = Math.floor(diffMonths / 12);
  return `قبل ${diffYears} سنة`;
}

function parseCommandCenterMetrics(location: GMBLocation): CommandCenterMetrics {
  const metadata = ensureObject(location.metadata);
  const insightsSource =
    ensureObject(metadata.insights_json) ||
    ensureObject(metadata.insights) ||
    ensureObject(metadata.insightsJson) ||
    {};

  const engagement = ensureObject((metadata as Record<string, unknown>).engagement);

  const statusRaw =
    (metadata.status as string) ??
    (metadata.connection_status as string) ??
    location.status ??
    (location.is_active ? "active" : "disconnected");

  const statusLower = String(statusRaw || "")
    .toLowerCase()
    .trim();

  const statusTone: CommandCenterMetrics["statusTone"] =
    statusLower === "active" || statusLower === "verified"
      ? "success"
      : statusLower === "pending" || statusLower === "sync_required"
      ? "warning"
      : "danger";

  const asNumericMetric = (value: unknown): NumericMetric => {
    if (typeof value === "number") return value;
    if (typeof value === "string") return Number.parseFloat(value);
    return null;
  };

  const getMetric = (value: unknown, fallback: NumericMetric = 0) =>
    toNumber(asNumericMetric(value) ?? fallback);

  const getNullableMetric = (value: unknown) => toNullableNumber(asNumericMetric(value));

  const derivedInsights = {
    views: getMetric(insightsSource.views, engagement.views),
    viewsTrend: getNullableMetric(insightsSource.viewsTrend ?? engagement.viewsTrend),
    clicks: getMetric(
      insightsSource.clicks ?? insightsSource.websiteClicks ?? engagement.clicks ?? engagement.websiteClicks,
    ),
    clicksTrend: getNullableMetric(
      insightsSource.clicksTrend ?? insightsSource.websiteClicksTrend ?? engagement.clicksTrend,
    ),
    calls: getMetric(insightsSource.calls, engagement.calls),
    callsTrend: getNullableMetric(insightsSource.callsTrend ?? engagement.callsTrend),
    directions: getMetric(insightsSource.directions, engagement.directions),
    directionsTrend: getNullableMetric(
      insightsSource.directionsTrend ?? engagement.directionsTrend ?? engagement.directionsTrend,
    ),
    website: getMetric(insightsSource.websiteClicks, engagement.websiteClicks),
    websiteTrend: getNullableMetric(
      insightsSource.websiteClicksTrend ?? engagement.websiteClicksTrend ?? engagement.websiteClicksTrend,
    ),
  };

  const aiInsights =
    ensureArray((metadata.ai_insights as unknown) ?? metadata.aiInsights ?? location.ai_insights).slice(
      0,
      MAX_AI_INSIGHTS,
    );

  const fallbackLastSync =
    (metadata.last_sync as string) ??
    (metadata.lastSync as string) ??
    (metadata.lastSyncedAt as string) ??
    location.updated_at ??
    location.created_at ??
    null;

  return {
    status:
      statusLower === "active"
        ? "متصل"
        : statusLower === "verified"
        ? "مُحقق"
        : statusLower === "pending"
        ? "قيد المراجعة"
        : statusLower === "suspended"
        ? "معلق"
        : "غير متصل",
    statusTone,
    isActive: location.is_active,
    rating: toNullableNumber(location.rating ?? metadata.rating),
    reviewCount: toNumber(location.review_count ?? metadata.review_count),
    responseRate: toNullableNumber(location.response_rate ?? metadata.responseRate ?? metadata.response_rate),
    pendingReviews: toNullableNumber(
      metadata.pending_reviews ??
        metadata.pending_review_count ??
        metadata.pendingReviews ??
        insightsSource.pendingReviews,
    ),
    pendingQuestions: toNullableNumber(
      metadata.pending_questions ?? metadata.pendingQuestions ?? insightsSource.pendingQuestions,
    ),
    healthScore: toNullableNumber(metadata.health_score ?? metadata.healthScore),
    weeklyGrowth: toNullableNumber(insightsSource.weeklyGrowth ?? engagement.weeklyGrowth),
    lastSync: fallbackLastSync,
    lastSyncRelative: getRelativeTime(fallbackLastSync),
    insights: derivedInsights,
    aiInsights: aiInsights.length > 0 ? aiInsights : ["لا توجد توصيات ذكية متاحة حالياً."],
  };
}

function getToneClasses(tone: CommandCenterMetrics["statusTone"]) {
  switch (tone) {
    case "success":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/40";
    case "warning":
      return "bg-yellow-500/15 text-yellow-300 border-yellow-500/40";
    default:
      return "bg-red-500/15 text-red-300 border-red-500/40";
  }
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "غير متاح";
  }
  return `${Math.round(value)}%`;
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "0";
  if (value < 1000) return value.toLocaleString();
  if (value < 10_000) return `${(value / 1000).toFixed(1)}K`;
  if (value < 1_000_000) return `${Math.round(value / 1000)}K`;
  return `${(value / 1_000_000).toFixed(1)}M`;
}

function MetricRow({
  icon: Icon,
  label,
  value,
  trend,
  trendLabel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  trend?: number | null;
  trendLabel?: string;
}) {
  const trendTone =
    typeof trend === "number"
      ? trend > 0
        ? "text-emerald-400"
        : trend < 0
        ? "text-red-400"
        : "text-zinc-400"
      : "text-zinc-400";

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-zinc-800/80 bg-zinc-900/60 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-content-center rounded-lg bg-zinc-800/60">
          <Icon className="h-5 w-5 text-orange-400" />
        </span>
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-400">{label}</p>
          <p className="text-lg font-semibold text-zinc-100">{value}</p>
        </div>
      </div>
      {typeof trend === "number" && trendLabel ? (
        <span className={`text-xs font-medium ${trendTone}`}>
          {trend > 0 ? "+" : ""}
          {trend}
          %
          <span className="ml-1 text-zinc-500">{trendLabel}</span>
        </span>
      ) : null}
    </div>
  );
}

export function LocationAICommandCenter({ location }: Readonly<{ location: GMBLocation }>) {
  const metrics = useMemo(() => parseCommandCenterMetrics(location), [location]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <LocationInsightsCard location={location} />

          <Card className="bg-zinc-900/50 border-orange-500/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2 text-zinc-100">
                  <MapPin className="h-4 w-4 text-orange-400" />
                  حالة الاتصال
                </CardTitle>
                <CardDescription>راجع حالة مزامنة الموقع وخيارات التحكم</CardDescription>
              </div>
              <Badge className={`${getToneClasses(metrics.statusTone)} uppercase`}>
                {metrics.status}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm text-zinc-400">
                <span>آخر مزامنة</span>
                <span className="font-medium text-zinc-200">{metrics.lastSyncRelative}</span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <SyncButton locationId={location.id} />
                <ViewDetailsButton href={`/locations/${location.id}`} />
              </div>
              <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/60 p-3 text-xs text-zinc-400">
                <p className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-orange-400" />
                  تأكد من مزامنة البيانات بانتظام للحفاظ على دقة الأرقام والذكاء الاصطناعي.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-zinc-900/50 border-orange-500/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2 text-zinc-100">
                  <BarChart2 className="h-4 w-4 text-orange-400" />
                  أداء التفاعل خلال هذا الأسبوع
                </CardTitle>
                <CardDescription>
                  أرقام التفاعل المستخرجة من إحصاءات Google Business Profile
                </CardDescription>
              </div>
              {metrics.weeklyGrowth !== null ? (
                <Badge
                  variant="outline"
                  className={`border ${
                    metrics.weeklyGrowth > 0
                      ? "border-emerald-500/50 text-emerald-400"
                      : metrics.weeklyGrowth < 0
                      ? "border-red-500/50 text-red-400"
                      : "border-zinc-700 text-zinc-300"
                  }`}
                >
                  <TrendingUp className="mr-1 h-3 w-3" />
                  نمو {metrics.weeklyGrowth > 0 ? "+" : ""}
                  {metrics.weeklyGrowth ?? 0}%
                </Badge>
              ) : null}
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <MetricRow
                icon={Users}
                label="مرات الظهور"
                value={formatNumber(metrics.insights.views)}
                trend={metrics.insights.viewsTrend}
                trendLabel="آخر 7 أيام"
              />
              <MetricRow
                icon={Activity}
                label="زيارات الموقع"
                value={formatNumber(metrics.insights.website)}
                trend={metrics.insights.websiteTrend}
                trendLabel="أسبوعياً"
              />
              <MetricRow
                icon={Phone}
                label="مكالمات واردة"
                value={formatNumber(metrics.insights.calls)}
                trend={metrics.insights.callsTrend}
                trendLabel="أسبوعياً"
              />
              <MetricRow
                icon={MapPin}
                label="طلبات الاتجاهات"
                value={formatNumber(metrics.insights.directions)}
                trend={metrics.insights.directionsTrend}
                trendLabel="أسبوعياً"
              />
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-orange-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-zinc-100">
                <Bell className="h-4 w-4 text-orange-400" />
                تنبيهات الصحة والسمعة
              </CardTitle>
              <CardDescription>راقب مؤشرات الجودة والمهام ذات الأولوية العالية</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/60 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-zinc-400">معدل الاستجابة</span>
                  <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                    الهدف 80%+
                  </Badge>
                </div>
                <p className="mt-2 text-2xl font-semibold text-zinc-100">
                  {formatPercent(metrics.responseRate)}
                </p>
                <Progress
                  value={metrics.responseRate ?? 0}
                  className="mt-3 h-2 bg-zinc-800"
                />
                <p className="mt-3 flex items-start gap-2 text-xs text-zinc-400">
                  <MessageSquare className="mt-0.5 h-3.5 w-3.5 text-orange-400" />
                  {metrics.pendingReviews !== null && metrics.pendingReviews > 0
                    ? `لديك ${metrics.pendingReviews} مراجعة تحتاج إلى رد.`
                    : "كل المراجعات الحديثة تم الرد عليها."}
                </p>
              </div>

              <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/60 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-zinc-400">صحة الملف</span>
                  <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                    الذكاء الاصطناعي
                  </Badge>
                </div>
                <p className="mt-2 text-2xl font-semibold text-zinc-100">
                  {metrics.healthScore !== null ? `${Math.round(metrics.healthScore)} / 100` : "غير متاح"}
                </p>
                <p className="mt-3 flex items-start gap-2 text-xs text-zinc-400">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-yellow-400" />
                  {metrics.pendingQuestions !== null && metrics.pendingQuestions > 0
                    ? `هناك ${metrics.pendingQuestions} سؤال ينتظر الرد حالياً.`
                    : "لا توجد أسئلة معلقة من العملاء."}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-orange-500/30">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2 text-zinc-100">
                  <BadgeCheck className="h-4 w-4 text-orange-400" />
                  توصيات الذكاء الاصطناعي
                </CardTitle>
                <CardDescription>اقتراحات مستمدة من أداء الموقع وسلوك العملاء</CardDescription>
              </div>
              <Badge variant="outline" className="border-zinc-700 text-xs text-zinc-300">
                {metrics.aiInsights.length} توصية
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {metrics.aiInsights.map((item, index) => (
                <div
                  key={`${item}-${index.toString()}`}
                  className="flex items-start gap-3 rounded-md border border-zinc-800/60 bg-zinc-900/60 p-3 text-sm text-zinc-300"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-400" />
                  <p>{item}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-orange-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-zinc-100">
                <Clock className="h-4 w-4 text-orange-400" />
                مركز الإجراءات السريعة
              </CardTitle>
              <CardDescription>إبدأ بالأولوية القصوى لتحسين حضورك الرقمي</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <Link href={`/reviews?location=${location.id}`} className="group">
                <div className="flex h-full flex-col justify-between rounded-lg border border-zinc-800/70 bg-zinc-900/60 p-4 transition-all group-hover:-translate-y-0.5 group-hover:border-orange-500/40 group-hover:shadow-lg">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-orange-400" />
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">الرد على المراجعات</p>
                      <p className="text-xs text-zinc-400">عزز ثقة العملاء</p>
                    </div>
                  </div>
                  <ArrowRight className="mt-4 h-4 w-4 text-zinc-500 transition group-hover:text-orange-400" />
                </div>
              </Link>

              <Link href={`/questions?location=${location.id}`} className="group">
                <div className="flex h-full flex-col justify-between rounded-lg border border-zinc-800/70 bg-zinc-900/60 p-4 transition-all group-hover:-translate-y-0.5 group-hover:border-orange-500/40 group-hover:shadow-lg">
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-orange-400" />
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">إجابة الأسئلة</p>
                      <p className="text-xs text-zinc-400">قلّل وقت انتظار العملاء</p>
                    </div>
                  </div>
                  <ArrowRight className="mt-4 h-4 w-4 text-zinc-500 transition group-hover:text-orange-400" />
                </div>
              </Link>

              <Link href={`/posts?location=${location.id}`} className="group">
                <div className="flex h-full flex-col justify-between rounded-lg border border-zinc-800/70 bg-zinc-900/60 p-4 transition-all group-hover:-translate-y-0.5 group-hover:border-orange-500/40 group-hover:shadow-lg">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-5 w-5 text-orange-400" />
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">إنشاء منشور جديد</p>
                      <p className="text-xs text-zinc-400">حافظ على تحديث الملف التجاري</p>
                    </div>
                  </div>
                  <ArrowRight className="mt-4 h-4 w-4 text-zinc-500 transition group-hover:text-orange-400" />
                </div>
              </Link>
            </CardContent>
            <CardContent className="border-t border-zinc-800/60 bg-zinc-900/40 py-3">
              <div className="flex flex-col items-start justify-between gap-2 text-xs text-zinc-500 sm:flex-row sm:items-center">
                <span>
                  يتم تحديث هذه الأرقام بعد كل مزامنة ناجحة — تأكد من مزامنة الحساب عند حدوث تغييرات في Google.
                </span>
                <Button variant="ghost" className="h-8 px-2 text-orange-400 hover:text-orange-300" asChild>
                  <Link href={`/analytics?location=${location.id}`}>عرض تحليلات الموقع</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default LocationAICommandCenter;

