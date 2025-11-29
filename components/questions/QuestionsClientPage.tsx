"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useDashboardSnapshot } from "@/hooks/use-dashboard-cache";
import type { GMBQuestion } from "@/lib/types/database";
import {
  ArrowUpRight,
  BookOpen,
  Bot,
  Download,
  Layers,
  Lightbulb,
  Pause,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import { QuestionAISettings } from "./QuestionAISettings";
import { AnswerDialog } from "./answer-dialog";
import { BulkActionsBar } from "./bulk-actions-bar";
import { QuestionCard } from "./question-card";

type QuestionEntity = GMBQuestion & {
  locationId: string;
  questionText: string;
  createdAt: string | null;
  answerStatus: GMBQuestion["answer_status"] | "unanswered";
  upvoteCount: number;
};

interface QuestionStatsSnapshot {
  total: number;
  unanswered: number;
  answered: number;
  answerRate: number;
  totalUpvotes: number;
  avgUpvotes: number;
  byPriority: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
  recentQuestions: QuestionEntity[];
}

interface QuestionsClientPageProps {
  initialQuestions: QuestionEntity[];
  totalCount: number;
  locations: Array<{ id: string; location_name: string }>;
  currentFilters: {
    locationId?: string;
    status?: string;
    priority?: string;
    searchQuery?: string;
    page?: number;
    sortBy?: string;
  };
}

interface KnowledgeBaseItem {
  label: string;
  ready: boolean;
  count: number;
}

interface SuggestionInfo {
  title: string;
  topic: string;
  confidence: number;
  description: string;
}

interface InsightItem {
  label: string;
  value: string;
}

export function QuestionsClientPage({
  initialQuestions,
  totalCount,
  locations,
  currentFilters,
}: QuestionsClientPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams?.toString() || "";
  const [isPending, startTransition] = useTransition();
  const [selectedQuestion, setSelectedQuestion] =
    useState<QuestionEntity | null>(null);
  const [answerDialogOpen, setAnswerDialogOpen] = useState(false);
  const [_isSyncing, _setIsSyncing] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(
    currentFilters.searchQuery ?? "",
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [autoAnswerEnabled, setAutoAnswerEnabled] = useState(false);
  const [autoAnswerLoading, setAutoAnswerLoading] = useState(false);
  const [bulkAnswering, setBulkAnswering] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ completed: 0, total: 0 });
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const { data: dashboardSnapshot } = useDashboardSnapshot();

  const stats = useMemo<QuestionStatsSnapshot | null>(() => {
    const questionStats = dashboardSnapshot?.questionStats;
    if (!questionStats) {
      return null;
    }

    const recent = (questionStats.recentQuestions ?? []).map(
      normalizeQuestionEntity,
    );
    const upvotes = recent.reduce((acc: number, q) => acc + q.upvoteCount, 0);

    return {
      total: questionStats.totals?.total ?? 0,
      unanswered: questionStats.totals?.unanswered ?? 0,
      answered: questionStats.totals?.answered ?? 0,
      answerRate: questionStats.answerRate ?? 0,
      totalUpvotes: upvotes,
      avgUpvotes: recent.length > 0 ? upvotes / recent.length : 0,
      byPriority: questionStats.byPriority ?? {
        urgent: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
      recentQuestions: recent,
    };
  }, [dashboardSnapshot?.questionStats]);

  const normalizedQuestions = useMemo(() => {
    return Array.isArray(initialQuestions) ? initialQuestions : [];
  }, [initialQuestions]);

  const topicStats = useMemo(() => {
    const pool = [...(stats?.recentQuestions ?? []), ...normalizedQuestions];
    const definitions = [
      {
        key: "hours",
        label: "Hours",
        keywords: ["hour", "open", "close", "time"],
      },
      {
        key: "delivery",
        label: "Delivery",
        keywords: ["deliver", "delivery", "shipping"],
      },
      {
        key: "wifi",
        label: "WiFi",
        keywords: ["wifi", "internet", "password"],
      },
      { key: "pricing", label: "Pricing", keywords: ["price", "cost", "fee"] },
      {
        key: "parking",
        label: "Parking",
        keywords: ["parking", "park", "garage"],
      },
      {
        key: "services",
        label: "Services",
        keywords: ["service", "offer", "provide"],
      },
    ];

    return definitions
      .map((definition) => {
        const count = pool.reduce((acc, question) => {
          const text = (question.questionText ?? "").toLowerCase();
          return definition.keywords.some((keyword) => text.includes(keyword))
            ? acc + 1
            : acc;
        }, 0);

        return {
          key: definition.key,
          label: definition.label,
          count,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [stats?.recentQuestions, normalizedQuestions]);

  const patterns = useMemo(
    () => topicStats.filter((topic) => topic.count > 0),
    [topicStats],
  );

  const knowledgeBaseItems: KnowledgeBaseItem[] = useMemo(
    () =>
      topicStats.slice(0, 4).map((topic) => ({
        label: topic.label,
        ready: topic.count > 0,
        count: topic.count,
      })),
    [topicStats],
  );

  const suggestion = useMemo<SuggestionInfo | null>(() => {
    const pool = [...(stats?.recentQuestions ?? []), ...normalizedQuestions];
    if (pool.length === 0) {
      return null;
    }

    const target =
      pool.find((question) => {
        const status = question.answerStatus ?? question.answer_status;
        const hasAnswer = Boolean(question.answer_text);
        return !hasAnswer && (status === "unanswered" || status === "pending");
      }) ?? pool[0];

    const text = (target.questionText ?? "Upcoming question").trim();
    const topic = patterns[0]?.label ?? "General";
    const confidence = Math.min(98, Math.max(72, target.upvoteCount * 3 + 85));

    return {
      title: text.length > 80 ? `${text.slice(0, 80)}…` : text,
      topic,
      confidence,
      description:
        "Let AI draft a human-quality answer based on your knowledge base.",
    };
  }, [normalizedQuestions, patterns, stats?.recentQuestions]);

  const insights: InsightItem[] = useMemo(() => {
    const topPattern = patterns[0];
    return [
      {
        label: "Most asked",
        value: topPattern ? `${topPattern.label} (${topPattern.count})` : "—",
      },
      {
        label: "Answer rate",
        value: `${stats ? stats.answerRate.toFixed(1) : "0"}%`,
      },
      {
        label: "Avg. upvotes",
        value: stats ? stats.avgUpvotes.toFixed(1) : "0",
      },
    ];
  }, [patterns, stats]);

  const pendingCount = stats?.unanswered ?? 0;

  const bulkProgressPct = useMemo(() => {
    if (!bulkProgress.total) {
      return 0;
    }
    return Math.round((bulkProgress.completed / bulkProgress.total) * 100);
  }, [bulkProgress]);

  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParamsString);

      if (value && value.length > 0) {
        params.set(key, value);
      } else {
        params.delete(key);
      }

      if (key !== "page") {
        params.set("page", "1");
      }

      router.push(`/questions?${params.toString()}`);
    },
    [router, searchParamsString],
  );

  // Selection handlers
  const handleSelectQuestion = (questionId: string, isSelected: boolean) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(questionId);
      } else {
        newSet.delete(questionId);
      }
      return newSet;
    });
  };

  const _handleSelectAll = () => {
    const safeQuestions = Array.isArray(questions) ? questions : [];
    if (selectedIds.size === safeQuestions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(safeQuestions.map((q) => q.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const refreshData = useCallback(() => {
    startTransition(() => {
      router.refresh();
    });
  }, [router, startTransition]);

  useEffect(() => {
    setSearchInput(currentFilters.searchQuery ?? "");
  }, [currentFilters.searchQuery]);

  useEffect(() => {
    const initialValue = currentFilters.searchQuery ?? "";
    if (searchInput === initialValue) {
      return;
    }

    const timer = setTimeout(() => {
      const normalized = searchInput.trim();
      if (normalized === (currentFilters.searchQuery ?? "")) {
        return;
      }
      updateFilter("search", normalized.length ? normalized : null);
    }, 400);

    return () => {
      clearTimeout(timer);
    };
  }, [searchInput, currentFilters.searchQuery, updateFilter]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleRefresh = () => {
      refreshData();
    };

    window.addEventListener("dashboard:refresh", handleRefresh);
    window.addEventListener("gmb-sync-complete", handleRefresh);

    return () => {
      window.removeEventListener("dashboard:refresh", handleRefresh);
      window.removeEventListener("gmb-sync-complete", handleRefresh);
    };
  }, [refreshData]);

  // Sync functionality moved to global sync button in header

  const handleAnswer = useCallback((question: QuestionEntity) => {
    setSelectedQuestion(question);
    setAnswerDialogOpen(true);
  }, []);

  const handleToggleAutoAnswer = useCallback(async (enabled: boolean) => {
    setAutoAnswerLoading(true);
    try {
      setAutoAnswerEnabled(enabled);
      toast.success(enabled ? "Auto-answer enabled" : "Auto-answer paused");
    } catch (error) {
      console.error("[Questions] Auto-answer toggle error:", error);
      toast.error("Unable to update auto-answer right now");
    } finally {
      setAutoAnswerLoading(false);
    }
  }, []);

  const handleBulkAnswer = useCallback(() => {
    if (bulkAnswering) {
      return;
    }

    if (!pendingCount) {
      toast.info("No pending questions to answer");
      return;
    }

    setBulkAnswering(true);
    setBulkProgress({ completed: 0, total: pendingCount });
    toast.info("Bulk answering queued (beta)");

    setTimeout(() => {
      setBulkProgress({ completed: pendingCount, total: pendingCount });
      setBulkAnswering(false);
    }, 1200);
  }, [bulkAnswering, pendingCount]);

  const _handlePauseBulk = useCallback(() => {
    toast.info("Bulk answering paused");
  }, []);

  const handleCancelBulk = useCallback(() => {
    setBulkProgress({ completed: 0, total: 0 });
    setBulkAnswering(false);
    toast.success("Bulk queue cleared");
  }, []);

  const handleExport = useCallback(() => {
    toast.info("CSV export coming soon");
  }, []);

  const onOpenAnswerDialog = useCallback(() => {
    if (!selectedQuestion) {
      toast.info("Select a question first");
      return;
    }
    setAnswerDialogOpen(true);
  }, [selectedQuestion]);

  const _canSync = Boolean(currentFilters.locationId);
  const questions = normalizedQuestions;
  const totalPages = Math.max(1, Math.ceil(totalCount / 50));
  const currentPage = currentFilters.page ?? 1;
  const hasActiveFilters = Boolean(
    currentFilters.locationId ||
      currentFilters.status ||
      currentFilters.priority ||
      (currentFilters.searchQuery && currentFilters.searchQuery.length > 0) ||
      (currentFilters.sortBy && currentFilters.sortBy !== "newest"),
  );

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100">
      <QuestionsOverviewHeader
        stats={stats}
        pendingCount={pendingCount}
        onOpenAssistant={() => setAiPanelOpen(true)}
        onOpenAISettings={() => setAiSettingsOpen(true)}
      />

      <BulkActionsBar
        selectedCount={selectedIds.size}
        selectedIds={Array.from(selectedIds)}
        onComplete={refreshData}
        onClearSelection={handleClearSelection}
      />

      <QuestionsFilterBar
        locations={locations}
        filters={currentFilters}
        updateFilter={updateFilter}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => router.push("/questions")}
        onExport={handleExport}
      />

      <main className="flex-1 px-6 pb-8">
        <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
          <QuestionsFeedSection
            questions={questions}
            isPending={isPending}
            selectedQuestion={selectedQuestion}
            onSelectQuestion={setSelectedQuestion}
            onAnswer={handleAnswer}
            selectedIds={selectedIds}
            onCheckChange={handleSelectQuestion}
          />

          <AutoAnswerSidebar
            pendingCount={pendingCount}
            selectedQuestion={selectedQuestion}
            autoAnswerEnabled={autoAnswerEnabled}
            autoAnswerLoading={autoAnswerLoading}
            onToggleAutoAnswer={handleToggleAutoAnswer}
            bulkAnswering={bulkAnswering}
            bulkProgressPct={bulkProgressPct}
            onBulkAnswer={handleBulkAnswer}
            onPauseBulk={_handlePauseBulk}
            onCancelBulk={handleCancelBulk}
            knowledgeBase={knowledgeBaseItems}
            suggestion={suggestion}
            insights={insights}
            onOpenAnswerDialog={onOpenAnswerDialog}
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <QuestionInsightsCard stats={stats} patterns={patterns} />
          <AutoAnswerSettingsCard />
        </div>
      </main>

      <QuestionsPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(page) => updateFilter("page", String(page))}
      />

      <AnswerDialog
        question={selectedQuestion}
        isOpen={answerDialogOpen}
        onClose={() => {
          setAnswerDialogOpen(false);
          setSelectedQuestion(null);
        }}
        onSuccess={() => {
          refreshData();
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("dashboard:refresh"));
          }
        }}
      />

      <Sheet open={aiPanelOpen} onOpenChange={setAiPanelOpen}>
        <SheetContent
          side="right"
          className="w-full sm:w-96 bg-zinc-950 border-l border-zinc-800 p-0 overflow-y-auto"
        >
          <SheetHeader className="p-6 border-b border-zinc-800">
            <SheetTitle className="text-white">AI Answer Assistant</SheetTitle>
          </SheetHeader>
          <div className="p-6">
            <AutoAnswerSidebar
              pendingCount={pendingCount}
              selectedQuestion={selectedQuestion}
              autoAnswerEnabled={autoAnswerEnabled}
              autoAnswerLoading={autoAnswerLoading}
              onToggleAutoAnswer={handleToggleAutoAnswer}
              bulkAnswering={bulkAnswering}
              bulkProgressPct={bulkProgressPct}
              onBulkAnswer={handleBulkAnswer}
              onPauseBulk={_handlePauseBulk}
              onCancelBulk={handleCancelBulk}
              knowledgeBase={knowledgeBaseItems}
              suggestion={suggestion}
              insights={insights}
              onOpenAnswerDialog={onOpenAnswerDialog}
              isMobile
            />
          </div>
        </SheetContent>
      </Sheet>

      <QuestionAISettings
        open={aiSettingsOpen}
        onOpenChange={setAiSettingsOpen}
        locationId={currentFilters.locationId}
      />
    </div>
  );
}

interface QuestionsOverviewHeaderProps {
  stats: QuestionStatsSnapshot | null;
  pendingCount: number;
  onOpenAssistant: () => void;
  onOpenAISettings?: () => void;
}

function QuestionsOverviewHeader({
  stats,
  pendingCount,
  onOpenAssistant,
  onOpenAISettings,
}: QuestionsOverviewHeaderProps) {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
      <div className="flex flex-col gap-4 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">
            Questions Command Center
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Monitor community questions, automate AI answers, and uncover intent
            patterns in one place.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={onOpenAssistant}
            variant="outline"
            className="lg:hidden border-orange-500/40 text-orange-300 hover:bg-orange-500/10"
          >
            <Bot className="mr-2 h-4 w-4" />
            AI Assistant
          </Button>
          {onOpenAISettings && (
            <Button
              onClick={onOpenAISettings}
              variant="outline"
              className="border-orange-500/40 text-orange-300 hover:bg-orange-500/10"
            >
              <Bot className="mr-2 h-4 w-4" />
              إعدادات AI
            </Button>
          )}
          {/* Sync button removed - use global sync in header */}
        </div>
      </div>

      <div className="grid gap-4 px-6 pb-6 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <MetricTile
          label="Total Questions"
          value={stats?.total ?? 0}
          accent="bg-orange-500/10 text-orange-200 border-orange-500/30"
        />
        <MetricTile
          label="Pending Answers"
          value={pendingCount}
          accent="bg-red-500/10 text-red-200 border-red-500/30"
        />
        <MetricTile
          label="Answered"
          value={stats?.answered ?? 0}
          accent="bg-green-500/10 text-green-200 border-green-500/30"
        />
        <MetricTile
          label="Answer Rate"
          value={`${stats ? stats.answerRate.toFixed(1) : "0"}%`}
          accent="bg-emerald-500/10 text-emerald-200 border-emerald-500/30"
        />
        <MetricTile
          label="Helpful Votes"
          value={stats?.totalUpvotes ?? 0}
          accent="bg-sky-500/10 text-sky-200 border-sky-500/30"
        />
      </div>
    </header>
  );
}

function MetricTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent: string;
}) {
  return (
    <Card className={`border bg-zinc-900/60 ${accent}`}>
      <CardContent className="py-5">
        <p className="text-sm text-zinc-400">{label}</p>
        <p className="mt-1 text-3xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

interface QuestionsFilterBarProps {
  locations: Array<{ id: string; location_name: string }>;
  filters: QuestionsClientPageProps["currentFilters"];
  updateFilter: (key: string, value: string | null) => void;
  searchInput: string;
  onSearchChange: (value: string) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onExport: () => void;
}

function QuestionsFilterBar({
  locations,
  filters,
  updateFilter,
  searchInput,
  onSearchChange,
  hasActiveFilters,
  onClearFilters,
  onExport,
}: QuestionsFilterBarProps) {
  const quickFilters = [
    {
      id: "all",
      label: "All",
      active:
        !filters.status && (!filters.sortBy || filters.sortBy === "newest"),
      onClick: () => {
        updateFilter("status", null);
        updateFilter("sortBy", "newest");
      },
    },
    {
      id: "pending",
      label: "Pending",
      active: filters.status === "unanswered",
      onClick: () => updateFilter("status", "unanswered"),
    },
    {
      id: "answered",
      label: "Answered",
      active: filters.status === "answered",
      onClick: () => updateFilter("status", "answered"),
    },
    {
      id: "popular",
      label: "Popular",
      active: filters.sortBy === "most_upvoted",
      onClick: () => updateFilter("sortBy", "most_upvoted"),
    },
    {
      id: "recent",
      label: "Recent",
      active:
        !filters.status && (!filters.sortBy || filters.sortBy === "newest"),
      onClick: () => updateFilter("sortBy", "newest"),
    },
  ];

  return (
    <section className="border-b border-zinc-800 bg-zinc-950/60 px-6 py-5">
      <div className="flex flex-wrap items-center gap-2">
        {quickFilters.map((filter) => (
          <FilterChip
            key={filter.id}
            active={filter.active}
            onClick={filter.onClick}
          >
            {filter.label}
          </FilterChip>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={onExport}
          className="ml-auto flex items-center gap-2 text-zinc-300 hover:text-white"
        >
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">
            Location
          </label>
          <select
            value={filters.locationId ?? ""}
            onChange={(event) =>
              updateFilter("location", event.target.value || null)
            }
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-100 focus:border-orange-500 focus:outline-none"
          >
            <option value="">All locations</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.location_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">
            Priority
          </label>
          <select
            value={filters.priority ?? ""}
            onChange={(event) =>
              updateFilter("priority", event.target.value || null)
            }
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-100 focus:border-orange-500 focus:outline-none"
          >
            <option value="">All priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">
            Sort by
          </label>
          <select
            value={filters.sortBy ?? "newest"}
            onChange={(event) => updateFilter("sortBy", event.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-100 focus:border-orange-500 focus:outline-none"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="most_upvoted">Most upvoted</option>
            <option value="urgent">Priority</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              value={searchInput}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search questions, keywords, or authors"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 pl-9 text-sm text-zinc-100 focus:border-orange-500"
            />
          </div>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="mt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-zinc-400"
          >
            Reset filters
          </Button>
        </div>
      )}
    </section>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
        active
          ? "border-orange-500 bg-orange-500/20 text-orange-200 shadow-[0_0_12px_rgba(251,146,60,0.2)]"
          : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-orange-500/40 hover:text-orange-200"
      }`}
    >
      {children}
    </button>
  );
}

interface QuestionsFeedSectionProps {
  questions: QuestionEntity[];
  isPending: boolean;
  selectedQuestion: QuestionEntity | null;
  onSelectQuestion: (question: QuestionEntity) => void;
  onAnswer: (question: QuestionEntity) => void;
  selectedIds?: Set<string>;
  onCheckChange?: (questionId: string, checked: boolean) => void;
}

function QuestionsFeedSection({
  questions,
  isPending,
  selectedQuestion,
  onSelectQuestion,
  onAnswer,
  selectedIds,
  onCheckChange,
}: QuestionsFeedSectionProps) {
  if (isPending) {
    return (
      <section className="flex min-h-[300px] items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/40">
        <div className="flex items-center gap-3 text-zinc-400">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Refreshing questions…
        </div>
      </section>
    );
  }

  const safeQuestions = Array.isArray(questions) ? questions : [];

  if (!safeQuestions.length) {
    return (
      <section className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/30 text-center">
        <h3 className="text-lg font-semibold text-zinc-200">
          No questions found
        </h3>
        <p className="max-w-md text-sm text-zinc-500">
          Try syncing Google Business questions or adjust your filters to see
          more conversations.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {safeQuestions.map((question) => (
        <QuestionCard
          key={question.id}
          question={question}
          isSelected={selectedQuestion?.id === question.id}
          isChecked={selectedIds?.has(question.id) ?? false}
          onClick={() => onSelectQuestion(question)}
          onAnswer={() => onAnswer(question)}
          onCheckChange={
            onCheckChange
              ? (checked) => onCheckChange(question.id, checked)
              : undefined
          }
        />
      ))}
    </section>
  );
}

interface AutoAnswerSidebarProps {
  pendingCount: number;
  selectedQuestion: QuestionEntity | null;
  autoAnswerEnabled: boolean;
  autoAnswerLoading: boolean;
  onToggleAutoAnswer: (enabled: boolean) => void;
  bulkAnswering: boolean;
  bulkProgressPct: number;
  onBulkAnswer: () => void;
  onPauseBulk: () => void;
  onCancelBulk: () => void;
  knowledgeBase: KnowledgeBaseItem[];
  suggestion: SuggestionInfo | null;
  insights: InsightItem[];
  onOpenAnswerDialog: () => void;
  isMobile?: boolean;
}

function AutoAnswerSidebar({
  pendingCount,
  selectedQuestion,
  autoAnswerEnabled,
  autoAnswerLoading,
  onToggleAutoAnswer,
  bulkAnswering,
  bulkProgressPct,
  onBulkAnswer,
  onPauseBulk,
  onCancelBulk,
  knowledgeBase,
  suggestion,
  insights,
  onOpenAnswerDialog,
  isMobile,
}: AutoAnswerSidebarProps) {
  return (
    <div
      className={`flex h-full flex-col gap-4 rounded-xl border border-orange-500/20 bg-linear-to-br from-zinc-950/90 via-zinc-950 to-zinc-900/90 p-6 shadow-[0_0_40px_rgba(251,146,60,0.08)] ${
        isMobile ? "" : "sticky top-14"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full border border-zinc-900 bg-emerald-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white">AI Answer Engine</h3>
          <p className="text-xs text-zinc-400">
            Smart auto-replies keep you under 1-hour response time.
          </p>
        </div>
        <Badge className="bg-orange-500/20 text-orange-200 border border-orange-500/40">
          {autoAnswerEnabled ? "Active" : "Standby"}
        </Badge>
      </div>

      <Card className="border border-zinc-800/60 bg-zinc-900/40">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-emerald-300" />
              <div>
                <p className="text-sm font-semibold text-white">Auto-answer</p>
                <p className="text-xs text-zinc-400">
                  {autoAnswerEnabled
                    ? "AI replies to new questions."
                    : "Manual reviews required."}
                </p>
              </div>
            </div>
            <Switch
              checked={autoAnswerEnabled}
              disabled={autoAnswerLoading}
              onCheckedChange={onToggleAutoAnswer}
              className="data-[state=checked]:bg-orange-500"
            />
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-zinc-800/80 bg-zinc-900/60 px-3 py-2">
            <Lightbulb className="h-4 w-4 text-amber-300" />
            <p className="text-xs text-zinc-400">
              Pending queue:{" "}
              <span className="font-semibold text-zinc-200">
                {pendingCount}
              </span>{" "}
              questions need answers.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-zinc-800/60 bg-zinc-900/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-zinc-200">
            Knowledge base coverage
          </CardTitle>
          <Layers className="h-4 w-4 text-orange-300" />
        </CardHeader>
        <CardContent className="grid gap-2">
          {knowledgeBase.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-zinc-400" />
                <span className="text-sm text-zinc-200">{item.label}</span>
              </div>
              <Badge
                variant="outline"
                className={`${
                  item.ready
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                    : "border-zinc-700 bg-zinc-800 text-zinc-300"
                }`}
              >
                {item.ready ? "Ready" : "Missing"} · {item.count}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border border-orange-500/30 bg-orange-500/10">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">AI suggestion</p>
              <p className="text-xs text-orange-100/80">
                Topic: {suggestion?.topic ?? "General"}
              </p>
            </div>
            <Badge className="bg-white/10 text-white">
              {suggestion ? `${suggestion.confidence}% match` : "Ready"}
            </Badge>
          </div>
          <p className="text-sm text-orange-50/90">
            {suggestion?.title ??
              "Select a question to generate a tailored answer."}
          </p>
          <Button
            onClick={onOpenAnswerDialog}
            disabled={!selectedQuestion}
            className="w-full bg-white/20 text-white hover:bg-white/30"
          >
            <Sparkles className="mr-2 h-4 w-4" /> Generate AI draft
          </Button>
        </CardContent>
      </Card>

      <Card className="border border-zinc-800/60 bg-zinc-900/40">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-zinc-200">
            Bulk answering
          </CardTitle>
          <Zap className="h-4 w-4 text-orange-300" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Status: {bulkAnswering ? "Processing…" : "Idle"}</span>
            <span>{bulkProgressPct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-linear-to-r from-orange-500 via-amber-400 to-yellow-300 transition-all"
              style={{ width: `${bulkProgressPct}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={onBulkAnswer}
              size="sm"
              className="bg-orange-500 text-white hover:bg-orange-600"
            >
              Start
            </Button>
            <Button
              onClick={onPauseBulk}
              size="sm"
              variant="outline"
              className="border-zinc-700 text-zinc-200 hover:border-orange-500 hover:text-orange-200"
            >
              <Pause className="mr-2 h-3 w-3" /> Pause
            </Button>
            <Button
              onClick={onCancelBulk}
              size="sm"
              variant="ghost"
              className="text-zinc-400 hover:text-red-300"
            >
              <XCircle className="mr-2 h-3 w-3" /> Cancel
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-zinc-800/60 bg-zinc-900/40">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-zinc-200">
            Performance snapshot
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-emerald-300" />
        </CardHeader>
        <CardContent className="grid gap-2">
          {insights.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2"
            >
              <span className="text-xs uppercase tracking-wide text-zinc-500">
                {item.label}
              </span>
              <span className="text-sm font-semibold text-zinc-100">
                {item.value}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

interface QuestionInsightsCardProps {
  stats: QuestionStatsSnapshot | null;
  patterns: Array<{ key: string; label: string; count: number }>;
}

function QuestionInsightsCard({ stats, patterns }: QuestionInsightsCardProps) {
  return (
    <Card className="border border-zinc-800 bg-zinc-900/40">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base font-semibold text-white">
            Smart insights
          </CardTitle>
          <p className="text-xs text-zinc-500">
            Trending topics and engagement patterns across locations
          </p>
        </div>
        <TrendingUp className="h-5 w-5 text-orange-300" />
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          {patterns.slice(0, 4).map((pattern) => (
            <div
              key={pattern.key}
              className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3"
            >
              <div className="flex items-center gap-3 text-sm text-zinc-200">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/10 text-orange-200">
                  {pattern.count}
                </span>
                {pattern.label}
              </div>
              <ArrowUpRight className="h-4 w-4 text-zinc-500" />
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-xs text-zinc-400">
          Answer rate sits at{" "}
          <span className="font-semibold text-zinc-100">
            {stats ? stats.answerRate.toFixed(1) : "0"}%
          </span>{" "}
          with an average of{" "}
          <span className="font-semibold text-zinc-100">
            {stats ? stats.avgUpvotes.toFixed(1) : "0"}
          </span>{" "}
          helpful votes per response.
        </div>
      </CardContent>
    </Card>
  );
}

function AutoAnswerSettingsCard() {
  return (
    <Card className="border border-zinc-800 bg-zinc-900/40">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-white">
          Automation settings
        </CardTitle>
        <p className="text-xs text-zinc-500">
          Fine-tune tone, escalation rules, and compliance safeguards
        </p>
      </CardHeader>
      <CardContent className="grid gap-3">
        <Button
          variant="outline"
          className="justify-start border-zinc-700 text-zinc-200"
        >
          <Sparkles className="mr-3 h-4 w-4 text-orange-300" /> Configure AI
          rules
        </Button>
        <Button
          variant="outline"
          className="justify-start border-zinc-700 text-zinc-200"
        >
          <Shield className="mr-3 h-4 w-4 text-emerald-300" /> Sensitive topic
          guardrails
        </Button>
        <Button
          variant="outline"
          className="justify-start border-zinc-700 text-zinc-200"
        >
          <BookOpen className="mr-3 h-4 w-4 text-sky-300" /> Manage FAQ
          knowledge base
        </Button>
      </CardContent>
    </Card>
  );
}

interface QuestionsPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function QuestionsPagination({
  currentPage,
  totalPages,
  onPageChange,
}: QuestionsPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <footer className="border-t border-zinc-800 bg-zinc-950/80 px-6 py-4">
      <div className="flex items-center justify-center gap-3 text-sm text-zinc-400">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="border-zinc-700 text-zinc-200"
        >
          Previous
        </Button>
        <span>
          Page <span className="text-zinc-100">{currentPage}</span> of{" "}
          <span className="text-zinc-100">{totalPages}</span>
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="border-zinc-700 text-zinc-200"
        >
          Next
        </Button>
      </div>
    </footer>
  );
}

function normalizeQuestionEntity(
  questionInput: Partial<GMBQuestion> & Record<string, unknown>,
): QuestionEntity {
  const q = questionInput as Record<string, unknown>;
  const now = new Date().toISOString();

  // Safe type extraction with proper fallbacks
  const getString = (key: string, fallback = ""): string => {
    const value = q[key];
    return typeof value === "string" ? value : fallback;
  };

  const getOptionalString = (key: string): string | undefined => {
    const value = q[key];
    return typeof value === "string" ? value : undefined;
  };

  const getNumber = (key: string, fallback = 0): number => {
    const value = q[key];
    return typeof value === "number" ? value : fallback;
  };

  const getOptionalNumber = (key: string): number | undefined => {
    const value = q[key];
    return typeof value === "number" ? value : undefined;
  };

  const getOptionalBoolean = (key: string): boolean | undefined => {
    const value = q[key];
    return typeof value === "boolean" ? value : undefined;
  };

  const locationId = getString("location_id") || getString("locationId") || "";
  const questionText =
    getString("question_text") || getString("questionText") || "";
  const createdAtValue = q.asked_at ?? q.created_at ?? q.createdAt ?? null;
  const createdAt = typeof createdAtValue === "string" ? createdAtValue : null;
  const answerStatusRaw =
    q.answer_status ??
    (q.status === "answered"
      ? "answered"
      : q.status === "pending"
        ? "pending"
        : undefined);
  const answerStatus = (answerStatusRaw ??
    "unanswered") as QuestionEntity["answerStatus"];
  const upvoteCount =
    getNumber("upvote_count") || getNumber("upvoteCount") || 0;

  const base: GMBQuestion = {
    id: getString("id") || crypto.randomUUID?.() || `${Date.now()}`,
    location_id: locationId,
    user_id: getString("user_id"),
    gmb_account_id: getOptionalString("gmb_account_id"),
    question_id: getOptionalString("question_id"),
    external_question_id: getOptionalString("external_question_id"),
    question_text: questionText,
    asked_at: createdAt ?? undefined,
    author_name: getOptionalString("author_name"),
    author_display_name: getOptionalString("author_display_name"),
    author_profile_photo_url: getOptionalString("author_profile_photo_url"),
    author_type: getOptionalString("author_type"),
    answer_text: getOptionalString("answer_text"),
    answered_at: getOptionalString("answered_at"),
    answered_by: getOptionalString("answered_by"),
    answer_status:
      answerStatus === "unanswered"
        ? "unanswered"
        : (answerStatus as GMBQuestion["answer_status"]),
    answer_id: getOptionalString("answer_id"),
    upvote_count: upvoteCount,
    total_answer_count: getOptionalNumber("total_answer_count"),
    ai_suggested_answer: getOptionalString("ai_suggested_answer"),
    ai_confidence_score: getOptionalNumber("ai_confidence_score"),
    ai_answer_generated: getOptionalBoolean("ai_answer_generated"),
    ai_category: getOptionalString("ai_category"),
    status: getOptionalString("status") as GMBQuestion["status"],
    priority: getOptionalString("priority") as GMBQuestion["priority"],
    question_url: getOptionalString("question_url"),
    google_resource_name: getOptionalString("google_resource_name"),
    internal_notes: getOptionalString("internal_notes"),
    created_at: getString("created_at") || createdAt || now,
    updated_at: getString("updated_at") || now,
    location_name:
      getOptionalString("location_name") || getOptionalString("locationName"),
    location_address:
      getOptionalString("location_address") ||
      getOptionalString("locationAddress"),
  };

  return {
    ...base,
    locationId,
    questionText,
    createdAt,
    answerStatus,
    upvoteCount,
  };
}
