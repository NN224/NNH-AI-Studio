"use client";

import { useMemo, type MouseEvent } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MessageSquare,
  ThumbsUp,
  MapPin,
  Clock,
  Sparkles,
  AlertTriangle,
  Bot,
  PenSquare,
  Send,
  Bookmark,
  CornerDownRight,
  Layers,
} from "lucide-react";
import type { GMBQuestion } from "@/lib/types/database";
import { questionsLogger } from "@/lib/utils/logger";

interface QuestionMetadata {
  [key: string]: unknown;
  aiDraft?: string;
  ai_draft?: string;
  aiSuggestedAnswer?: string;
  ai_suggested_answer?: string;
  aiGeneratedResponse?: string;
  ai_generated_response?: string;
  aiSource?: string;
  ai_source?: string;
  autoAnswered?: boolean;
  auto_answered?: boolean;
  aiAnswered?: boolean;
  ai_answered?: boolean;
  requiresManualReview?: boolean;
  sensitive?: boolean;
  manualReviewReason?: string;
  manual_review_reason?: string;
  flagged_reason?: string;
}

type QuestionType = GMBQuestion & {
  flagged?: boolean;
  language?: string;
  location_name?: string;
  gmb_locations?: { location_name?: string };
  metadata?: QuestionMetadata | null;
};

interface QuestionCardProps {
  question: QuestionType;
  isSelected?: boolean;
  isChecked?: boolean;
  onClick?: () => void;
  onAnswer?: () => void;
  onCheckChange?: (checked: boolean) => void;
}

export function QuestionCard({
  question,
  isSelected,
  isChecked = false,
  onClick,
  onAnswer,
  onCheckChange,
}: QuestionCardProps) {
  const metadata: QuestionMetadata = useMemo(
    () => ({ ...(question.metadata ?? {}) }),
    [question.metadata],
  );

  const needsAnswer =
    !question.answer_text &&
    (question.answer_status === "unanswered" ||
      question.answer_status === "pending");
  const isAnswered = Boolean(
    question.answer_status === "answered" && question.answer_text,
  );
  const isAutoAnswered = Boolean(
    metadata.autoAnswered ??
      metadata.auto_answered ??
      metadata.aiAnswered ??
      metadata.ai_answered ??
      (question as any).answer_source === "auto",
  );

  const requiresManualReview = Boolean(
    question.flagged ||
      metadata.requiresManualReview ||
      metadata.sensitive ||
      question.priority === "urgent" ||
      metadata.manualReviewReason ||
      metadata.manual_review_reason,
  );

  const aiDraftText =
    (metadata.aiDraft as string | undefined) ||
    (metadata.ai_draft as string | undefined) ||
    (metadata.aiSuggestedAnswer as string | undefined) ||
    (metadata.ai_suggested_answer as string | undefined) ||
    (metadata.aiGeneratedResponse as string | undefined) ||
    (metadata.ai_generated_response as string | undefined) ||
    (question as any).ai_suggested_answer ||
    (question as any).ai_generated_response ||
    null;

  const aiSourceLabel =
    (metadata.aiSource as string | undefined) ||
    (metadata.ai_source as string | undefined) ||
    (question as any).ai_source ||
    "Knowledge Graph";

  const helpfulVotes =
    question.upvote_count ?? (question as any).upvoteCount ?? 0;
  const totalAnswers =
    question.total_answer_count ?? (question as any).totalAnswerCount ?? 0;
  const locationName =
    question.location_name ||
    question.gmb_locations?.location_name ||
    "Unknown location";
  const askedAt = question.asked_at || question.created_at || null;

  const cardClassName = [
    "group cursor-pointer border border-zinc-800 bg-zinc-900/45 transition hover:border-orange-500/40 hover:bg-zinc-900/70",
    needsAnswer ? "border-orange-500/30 bg-orange-500/10" : "",
    isAutoAnswered ? "border-emerald-500/30 bg-emerald-500/10" : "",
    isSelected
      ? "ring-2 ring-orange-500/60 border-orange-500/50 shadow-[0_0_25px_rgba(251,146,60,0.25)]"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const statusBadge = useMemo(() => {
    if (isAutoAnswered) {
      return {
        label: "Auto answered",
        className: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40",
        icon: Sparkles,
      };
    }

    if (needsAnswer && aiDraftText) {
      return {
        label: "AI draft ready",
        className: "bg-orange-500/20 text-orange-200 border-orange-500/40",
        icon: Bot,
      };
    }

    if (needsAnswer) {
      return {
        label: "Needs answer",
        className: "bg-red-500/20 text-red-200 border-red-500/40",
        icon: AlertTriangle,
      };
    }

    return {
      label: "Answered",
      className: "bg-sky-500/20 text-sky-200 border-sky-500/40",
      icon: MessageSquare,
    };
  }, [aiDraftText, isAutoAnswered, needsAnswer]);

  const priorityBadge = question.priority
    ? {
        label: question.priority,
        className:
          question.priority === "urgent"
            ? "bg-red-500/20 text-red-200 border-red-500/40"
            : question.priority === "high"
              ? "bg-orange-500/20 text-orange-200 border-orange-500/40"
              : question.priority === "medium"
                ? "bg-yellow-500/20 text-yellow-200 border-yellow-500/40"
                : "bg-blue-500/20 text-blue-200 border-blue-500/40",
      }
    : null;

  const manualReviewReason =
    (metadata.manualReviewReason as string | undefined) ||
    (metadata.manual_review_reason as string | undefined) ||
    (metadata.flagged_reason as string | undefined) ||
    (question as any).flagged_reason ||
    (question.priority === "urgent" ? "Flagged due to urgent priority" : null);

  const handleAnswerClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onAnswer?.();
  };

  return (
    <Card onClick={onClick} className={cardClassName}>
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          {onCheckChange && (
            <Checkbox
              checked={isChecked}
              onCheckedChange={(checked) => {
                if (onCheckChange) onCheckChange(checked as boolean);
              }}
              onClick={(e) => e.stopPropagation()}
              className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
            />
          )}
          <div className="flex flex-col gap-6 lg:flex-row w-full">
            <div className="flex-1 space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-base font-semibold text-white shadow-lg shadow-orange-500/20">
                  {question.author_name?.[0]?.toUpperCase() ||
                    question.author_display_name?.[0]?.toUpperCase() ||
                    "?"}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-white">
                      {question.author_name ||
                        question.author_display_name ||
                        "Anonymous"}
                    </span>
                    <Badge
                      className={`${statusBadge.className} flex items-center gap-1 text-[11px] uppercase tracking-wide`}
                    >
                      <statusBadge.icon className="h-3.5 w-3.5" />
                      {statusBadge.label}
                    </Badge>
                    {priorityBadge ? (
                      <Badge
                        className={`${priorityBadge.className} text-[11px] uppercase tracking-wide`}
                      >
                        {priorityBadge.label}
                      </Badge>
                    ) : null}
                    {requiresManualReview ? (
                      <Badge className="flex items-center gap-1 bg-red-500/15 text-red-200 border-red-500/40 text-[11px] uppercase tracking-wide">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Manual review
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{askedAt ? formatTimeAgo(askedAt) : "Unknown"}</span>
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="truncate">{locationName}</span>
                    {question.language ? (
                      <Badge
                        variant="outline"
                        className="border-zinc-700 text-[10px] uppercase text-zinc-300"
                      >
                        Lang: {String(question.language).toUpperCase()}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-zinc-200">
                {question.question_text || "No question text available"}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
                {helpfulVotes > 0 ? (
                  <div className="flex items-center gap-1">
                    <ThumbsUp className="h-4 w-4" />
                    <span>
                      {helpfulVotes === 1
                        ? "1 person found helpful"
                        : `${helpfulVotes} found helpful`}
                    </span>
                  </div>
                ) : null}
                {totalAnswers > 0 ? (
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    <span>{totalAnswers} answers on Google</span>
                  </div>
                ) : null}
                {question.ai_category ? (
                  <div className="flex items-center gap-1">
                    <Layers className="h-4 w-4" />
                    <span>
                      Intent: {String(question.ai_category).replace(/_/g, " ")}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className={
                    needsAnswer
                      ? "bg-orange-500 text-white hover:bg-orange-600"
                      : "bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                  }
                  onClick={handleAnswerClick}
                >
                  <PenSquare className="mr-2 h-4 w-4" />{" "}
                  {needsAnswer ? "Write answer" : "Edit answer"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-zinc-700 text-zinc-200 hover:border-orange-500/60 hover:text-orange-200"
                  onClick={handleAnswerClick}
                >
                  <MessageSquare className="mr-2 h-4 w-4" /> Review thread
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-zinc-400 hover:text-emerald-200"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Bookmark className="mr-2 h-4 w-4" /> Pin
                </Button>
              </div>

              {isAnswered && question.answer_text ? (
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-emerald-200">
                    <MessageSquare className="h-3.5 w-3.5" /> Published answer
                  </div>
                  <p className="mt-2 text-emerald-50/90 line-clamp-3">
                    {question.answer_text}
                  </p>
                </div>
              ) : null}

              {requiresManualReview ? (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  <div className="flex items-center gap-2 font-medium">
                    <AlertTriangle className="h-4 w-4" /> Manual review
                    suggested
                  </div>
                  <p className="mt-1 text-xs text-red-200/80">
                    {manualReviewReason ||
                      "Flagged by AI guardrails for additional attention."}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="w-full flex-shrink-0 space-y-3 rounded-xl border border-orange-500/25 bg-orange-500/10 p-4 shadow-inner lg:max-w-[260px]">
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-orange-100/90">
                <span className="flex items-center gap-2">
                  <Bot className="h-4 w-4" /> AI suggestion
                </span>
                {aiDraftText ? (
                  <span>
                    {Math.min(98, Math.max(72, helpfulVotes * 3 + 85))}% match
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-orange-50/90 line-clamp-6">
                {aiDraftText ||
                  "Generate a tailored answer based on knowledge base coverage."}
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  className="bg-white/20 text-white hover:bg-white/30"
                  onClick={handleAnswerClick}
                >
                  <Send className="mr-2 h-4 w-4" />{" "}
                  {aiDraftText ? "Review & send" : "Generate draft"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-orange-200 hover:text-orange-100"
                  onClick={(event) => event.stopPropagation()}
                >
                  <CornerDownRight className="mr-2 h-4 w-4" /> Configure rules
                </Button>
              </div>
              <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-xs text-orange-100/80">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5" /> Knowledge base
                </div>
                <p className="mt-1">Source: {aiSourceLabel}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatTimeAgo(date: string | undefined | null): string {
  if (!date) {
    return "Unknown";
  }

  try {
    const now = new Date();
    let questionDate: Date;

    const hasTimezone =
      date.includes("Z") ||
      /[+-]\d{2}:\d{2}$/.test(date) ||
      /[+-]\d{4}$/.test(date);

    questionDate = hasTimezone ? new Date(date) : new Date(`${date}Z`);

    if (Number.isNaN(questionDate.getTime())) {
      return "Unknown";
    }

    const diffMs = now.getTime() - questionDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "Recently";
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
    }
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return months === 1 ? "1 month ago" : `${months} months ago`;
    }
    const years = Math.floor(diffDays / 365);
    return years === 1 ? "1 year ago" : `${years} years ago`;
  } catch (error) {
    questionsLogger.error(
      "[formatTimeAgo] Date formatting error",
      error instanceof Error ? error : new Error(String(error)),
      { date },
    );
    return "Unknown";
  }
}
