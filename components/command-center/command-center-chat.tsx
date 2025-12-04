"use client";

/**
 * 🎛️ COMMAND CENTER CHAT
 *
 * Chat-First AI Command Center
 * - AI يبادر بـ insights
 * - Approval cards داخل المحادثة
 * - Quick actions
 * - Real AI backend
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bot,
  User,
  Send,
  Loader2,
  Star,
  Check,
  X,
  Edit3,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  MessageSquare,
  ChevronRight,
  Zap,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

interface PendingAction {
  id: string;
  actionType: "review_reply" | "question_answer" | "post";
  referenceData: {
    reviewerName?: string;
    rating?: number;
    reviewText?: string;
    questionText?: string;
  };
  aiGeneratedContent: string;
  aiConfidence: number;
  requiresAttention: boolean;
  attentionReason?: string;
}

interface ProactiveInsight {
  type: string;
  priority: "high" | "medium" | "low";
  title: string;
  message: string;
  suggestedActions: Array<{
    label: string;
    action: string;
    primary?: boolean;
  }>;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  // Special content types
  type?:
    | "text"
    | "greeting"
    | "approval_card"
    | "approval_list"
    | "stats"
    | "insight";
  // For approval cards
  pendingAction?: PendingAction;
  pendingActions?: PendingAction[];
  // For insights
  insight?: ProactiveInsight;
  // For stats
  stats?: {
    rating: number;
    pendingCount: number;
    responseRate: number;
  };
  // Quick actions
  quickActions?: Array<{
    label: string;
    action: string;
    icon?: string;
    primary?: boolean;
  }>;
}

interface CommandCenterStats {
  rating: number;
  ratingChange: number;
  totalReviews: number;
  responseRate: number;
  pendingCount: number;
  attentionCount: number;
}

interface CommandCenterChatProps {
  userId: string;
  locationId?: string;
  businessName: string;
  businessLogo?: string;
  userName: string;
}

// ============================================
// SUB-COMPONENTS
// ============================================

// Rating Stars Component
function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "h-3.5 w-3.5",
            star <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "fill-zinc-600 text-zinc-600",
          )}
        />
      ))}
    </div>
  );
}

// Approval Card Component (inline in chat)
function ApprovalCard({
  action,
  onApprove,
  onReject,
  onEdit,
  isProcessing,
}: {
  action: PendingAction;
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
  isProcessing: boolean;
}) {
  const isReview = action.actionType === "review_reply";
  const isNegative = (action.referenceData.rating || 5) <= 2;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "rounded-xl border p-4 space-y-3",
        isNegative
          ? "bg-red-500/10 border-red-500/30"
          : "bg-zinc-800/50 border-zinc-700",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {isReview && (
            <RatingStars rating={action.referenceData.rating || 0} />
          )}
          <span className="text-sm font-medium text-zinc-200">
            {action.referenceData.reviewerName || "Customer"}
          </span>
          {action.requiresAttention && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              يحتاج انتباهك
            </Badge>
          )}
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-xs",
            action.aiConfidence >= 85
              ? "border-green-500/50 text-green-400"
              : action.aiConfidence >= 70
                ? "border-yellow-500/50 text-yellow-400"
                : "border-red-500/50 text-red-400",
          )}
        >
          {action.aiConfidence}% ثقة
        </Badge>
      </div>

      {/* Original Review/Question */}
      {action.referenceData.reviewText && (
        <p className="text-sm text-zinc-400 bg-zinc-900/50 rounded-lg p-3 border-r-2 border-zinc-600">
          "{action.referenceData.reviewText}"
        </p>
      )}

      {/* AI Generated Reply */}
      <div className="space-y-2">
        <p className="text-xs text-zinc-500 flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          ردي المقترح:
        </p>
        <p className="text-sm text-zinc-200 bg-gradient-to-r from-orange-500/10 to-purple-500/10 rounded-lg p-3 border border-orange-500/20">
          {action.aiGeneratedContent}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <Button
          size="sm"
          onClick={onApprove}
          disabled={isProcessing}
          className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
        >
          {isProcessing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          وافق
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onEdit}
          disabled={isProcessing}
          className="gap-1.5"
        >
          <Edit3 className="h-3.5 w-3.5" />
          عدّل
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onReject}
          disabled={isProcessing}
          className="text-zinc-400 hover:text-red-400 gap-1.5"
        >
          <X className="h-3.5 w-3.5" />
          ارفض
        </Button>
      </div>
    </motion.div>
  );
}

// Stats Card Component (inline in chat)
function StatsCard({ stats }: { stats: CommandCenterStats }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-3 gap-3"
    >
      <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700 text-center">
        <div className="flex items-center justify-center gap-1 text-yellow-400">
          <Star className="h-4 w-4 fill-yellow-400" />
          <span className="text-lg font-bold">{stats.rating.toFixed(1)}</span>
        </div>
        <p className="text-xs text-zinc-500 mt-1">التقييم</p>
      </div>
      <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700 text-center">
        <div className="flex items-center justify-center gap-1 text-orange-400">
          <Clock className="h-4 w-4" />
          <span className="text-lg font-bold">{stats.pendingCount}</span>
        </div>
        <p className="text-xs text-zinc-500 mt-1">بانتظارك</p>
      </div>
      <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700 text-center">
        <div className="flex items-center justify-center gap-1 text-green-400">
          <TrendingUp className="h-4 w-4" />
          <span className="text-lg font-bold">{stats.responseRate}%</span>
        </div>
        <p className="text-xs text-zinc-500 mt-1">معدل الرد</p>
      </div>
    </motion.div>
  );
}

// Quick Action Buttons
function QuickActionButton({
  label,
  icon,
  primary,
  onClick,
}: {
  label: string;
  icon?: string;
  primary?: boolean;
  onClick: () => void;
}) {
  const getIcon = () => {
    switch (icon) {
      case "check":
        return <Check className="h-3.5 w-3.5" />;
      case "alert":
        return <AlertTriangle className="h-3.5 w-3.5" />;
      case "chart":
        return <TrendingUp className="h-3.5 w-3.5" />;
      case "sparkles":
        return <Sparkles className="h-3.5 w-3.5" />;
      case "message":
        return <MessageSquare className="h-3.5 w-3.5" />;
      case "zap":
        return <Zap className="h-3.5 w-3.5" />;
      default:
        return <ChevronRight className="h-3.5 w-3.5" />;
    }
  };

  return (
    <Button
      size="sm"
      variant={primary ? "default" : "outline"}
      onClick={onClick}
      className={cn(
        "gap-1.5 text-xs",
        primary &&
          "bg-gradient-to-r from-orange-500 to-purple-500 hover:from-orange-600 hover:to-purple-600",
      )}
    >
      {getIcon()}
      {label}
    </Button>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function CommandCenterChat({
  userId,
  locationId,
  businessName,
  businessLogo,
  userName,
}: CommandCenterChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [processingActions, setProcessingActions] = useState<Set<string>>(
    new Set(),
  );
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  // Load initial data (proactive greeting + pending actions)
  useEffect(() => {
    loadInitialData();
  }, [userId, locationId]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/ai/command-center${locationId ? `?locationId=${locationId}` : ""}`,
      );
      const data = await response.json();

      if (data.success) {
        const { proactiveGreeting, pendingApprovals, stats, autopilotStatus } =
          data.data;

        // Build initial messages
        const initialMessages: ChatMessage[] = [];

        // 1. Proactive Greeting
        initialMessages.push({
          id: "greeting-1",
          role: "assistant",
          content: proactiveGreeting.greeting,
          timestamp: new Date(),
          type: "greeting",
        });

        // 2. Insight Message
        if (proactiveGreeting.insight) {
          const insight = proactiveGreeting.insight;
          initialMessages.push({
            id: "insight-1",
            role: "assistant",
            content: `${insight.title}\n\n${insight.message}`,
            timestamp: new Date(),
            type: "insight",
            insight: insight,
            quickActions: insight.suggestedActions.map((a: any) => ({
              label: a.label,
              action: a.action,
              primary: a.primary,
            })),
          });
        }

        // 3. Stats Card
        if (stats) {
          initialMessages.push({
            id: "stats-1",
            role: "assistant",
            content: "",
            timestamp: new Date(),
            type: "stats",
            stats: {
              rating: stats.rating,
              pendingCount: pendingApprovals.totalCount,
              responseRate: stats.responseRate,
            },
          });
        }

        // 4. Pending Approvals Summary (if any)
        if (pendingApprovals.totalCount > 0) {
          initialMessages.push({
            id: "pending-summary",
            role: "assistant",
            content: `عندك ${pendingApprovals.totalCount} عمل بانتظار موافقتك:
• ${pendingApprovals.reviewReplies.length} رد على مراجعات
• ${pendingApprovals.questionAnswers.length} إجابة على أسئلة
${pendingApprovals.totalCount > 0 ? "\nشو تبي تسوي؟" : ""}`,
            timestamp: new Date(),
            type: "text",
            quickActions: [
              {
                label: "وافق على الكل ✓",
                action: "approve_all",
                primary: true,
                icon: "check",
              },
              {
                label: "وريني التفاصيل",
                action: "show_pending",
                icon: "message",
              },
              {
                label: "السلبية بس ⚠️",
                action: "show_negative",
                icon: "alert",
              },
            ],
          });
        }

        setMessages(initialMessages);
      }
    } catch (error) {
      console.error("Error loading command center:", error);
      // Fallback greeting
      setMessages([
        {
          id: "error-greeting",
          role: "assistant",
          content: `مرحباً ${userName}! 👋\n\nصار خطأ بتحميل البيانات. جرب تحدث الصفحة.`,
          timestamp: new Date(),
          type: "text",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle quick action clicks
  const handleQuickAction = async (action: string) => {
    switch (action) {
      case "approve_all":
        await handleApproveAll();
        break;
      case "show_pending":
        await handleShowPending();
        break;
      case "show_negative":
        await handleShowNegative();
        break;
      case "analyze_reviews":
        setInput("حلل المراجعات السلبية");
        break;
      case "chat":
        // Focus input
        break;
      case "dismiss":
        addAssistantMessage("تمام! إذا احتجت شي أنا هون. 👍");
        break;
      default:
        setInput(action);
    }
  };

  // Show pending approvals
  const handleShowPending = async () => {
    addUserMessage("وريني التفاصيل");

    try {
      const response = await fetch(
        `/api/ai/pending${locationId ? `?locationId=${locationId}` : ""}`,
      );
      const data = await response.json();

      if (data.success && data.data.actions.length > 0) {
        // Show first 3 as cards
        const actions = data.data.actions.slice(0, 3);

        for (const action of actions) {
          setMessages((prev) => [
            ...prev,
            {
              id: `action-${action.id}`,
              role: "assistant",
              content: "",
              timestamp: new Date(),
              type: "approval_card",
              pendingAction: action,
            },
          ]);
        }

        if (data.data.actions.length > 3) {
          addAssistantMessage(
            `وفي ${data.data.actions.length - 3} أعمال ثانية. تبي أوريك الباقي؟`,
            [{ label: "أيوا، وريني", action: "show_more", primary: true }],
          );
        }
      } else {
        addAssistantMessage("ما في شي بانتظار موافقتك حالياً! 🎉");
      }
    } catch (error) {
      console.error("Error fetching pending:", error);
      addAssistantMessage("صار خطأ. جرب مرة ثانية.");
    }
  };

  // Show negative reviews only
  const handleShowNegative = async () => {
    addUserMessage("وريني السلبية بس");

    try {
      const response = await fetch(
        `/api/ai/pending?attention=true${locationId ? `&locationId=${locationId}` : ""}`,
      );
      const data = await response.json();

      if (data.success && data.data.actions.length > 0) {
        addAssistantMessage(
          `عندك ${data.data.actions.length} مراجعات تحتاج انتباهك:`,
        );

        for (const action of data.data.actions) {
          setMessages((prev) => [
            ...prev,
            {
              id: `action-${action.id}`,
              role: "assistant",
              content: "",
              timestamp: new Date(),
              type: "approval_card",
              pendingAction: action,
            },
          ]);
        }
      } else {
        addAssistantMessage("ما في مراجعات سلبية بانتظارك! 🎉");
      }
    } catch (error) {
      console.error("Error fetching negative:", error);
      addAssistantMessage("صار خطأ. جرب مرة ثانية.");
    }
  };

  // Approve all pending
  const handleApproveAll = async () => {
    addUserMessage("وافق على الكل");

    try {
      // Get all pending actions first
      const pendingResponse = await fetch(
        `/api/ai/pending${locationId ? `?locationId=${locationId}` : ""}`,
      );
      const pendingData = await pendingResponse.json();

      if (!pendingData.success || pendingData.data.actions.length === 0) {
        addAssistantMessage("ما في شي لأوافق عليه! ✨");
        return;
      }

      // Filter only high confidence ones
      const highConfidenceActions = pendingData.data.actions.filter(
        (a: any) => a.aiConfidence >= 80 && !a.requiresAttention,
      );

      if (highConfidenceActions.length === 0) {
        addAssistantMessage(
          "كل الأعمال المعلقة تحتاج انتباهك الشخصي. خلني أوريك وحدة وحدة.",
          [{ label: "وريني", action: "show_pending", primary: true }],
        );
        return;
      }

      // Batch approve
      const actionIds = highConfidenceActions.map((a: any) => a.id);
      const approveResponse = await fetch("/api/ai/pending/batch/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionIds }),
      });
      const approveData = await approveResponse.json();

      if (approveData.success) {
        addAssistantMessage(
          `تم! ✅ وافقت على ${approveData.processed} ردود ونشرتها.${
            pendingData.data.actions.length - highConfidenceActions.length > 0
              ? `\n\nباقي ${pendingData.data.actions.length - highConfidenceActions.length} تحتاج انتباهك.`
              : ""
          }`,
          pendingData.data.actions.length - highConfidenceActions.length > 0
            ? [
                {
                  label: "وريني الباقي",
                  action: "show_negative",
                  primary: true,
                },
              ]
            : undefined,
        );
      } else {
        addAssistantMessage("صار خطأ بالموافقة. جرب مرة ثانية.");
      }
    } catch (error) {
      console.error("Error approving all:", error);
      addAssistantMessage("صار خطأ. جرب مرة ثانية.");
    }
  };

  // Handle individual approval
  const handleApprove = async (actionId: string) => {
    setProcessingActions((prev) => new Set(prev).add(actionId));

    try {
      const response = await fetch(`/api/ai/pending/${actionId}/approve`, {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        // Remove the card and add success message
        setMessages((prev) =>
          prev.filter((m) => m.pendingAction?.id !== actionId),
        );
        addAssistantMessage("تم! ✅ نشرت الرد.");
      } else {
        addAssistantMessage(`خطأ: ${data.error}`);
      }
    } catch (error) {
      console.error("Error approving:", error);
      addAssistantMessage("صار خطأ. جرب مرة ثانية.");
    } finally {
      setProcessingActions((prev) => {
        const next = new Set(prev);
        next.delete(actionId);
        return next;
      });
    }
  };

  // Handle rejection
  const handleReject = async (actionId: string) => {
    setProcessingActions((prev) => new Set(prev).add(actionId));

    try {
      const response = await fetch(`/api/ai/pending/${actionId}/reject`, {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        setMessages((prev) =>
          prev.filter((m) => m.pendingAction?.id !== actionId),
        );
        addAssistantMessage("تم حذفه. 👍");
      }
    } catch (error) {
      console.error("Error rejecting:", error);
    } finally {
      setProcessingActions((prev) => {
        const next = new Set(prev);
        next.delete(actionId);
        return next;
      });
    }
  };

  // Handle edit (for now, just show the content for editing)
  const handleEdit = (actionId: string, content: string) => {
    setInput(content);
    addAssistantMessage("عدّل الرد وارسله لما تخلص. 👆");
  };

  // Add user message
  const addUserMessage = (content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: "user",
        content,
        timestamp: new Date(),
        type: "text",
      },
    ]);
  };

  // Add assistant message
  const addAssistantMessage = (
    content: string,
    quickActions?: ChatMessage["quickActions"],
  ) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content,
        timestamp: new Date(),
        type: "text",
        quickActions,
      },
    ]);
  };

  // Send message to AI
  const handleSend = async () => {
    if (!input.trim() || isSending) return;

    const userInput = input.trim();
    setInput("");
    addUserMessage(userInput);
    setIsSending(true);

    try {
      const response = await fetch("/api/ai/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userInput,
          conversationId,
          locationId,
        }),
      });
      const data = await response.json();

      if (data.success) {
        setConversationId(data.conversationId);
        addAssistantMessage(
          data.message,
          data.suggestedActions?.map((a: any) => ({
            label: a.label,
            action: a.type,
          })),
        );
      } else {
        addAssistantMessage("عذراً، صار خطأ. جرب مرة ثانية.");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      addAssistantMessage("عذراً، صار خطأ بالاتصال.");
    } finally {
      setIsSending(false);
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-zinc-800">
        <div className="relative">
          <Avatar className="h-12 w-12 border-2 border-orange-500/50">
            {businessLogo ? (
              <AvatarImage src={businessLogo} alt={businessName} />
            ) : (
              <AvatarFallback className="bg-gradient-to-br from-orange-500 to-purple-500">
                <Sparkles className="h-6 w-6 text-white" />
              </AvatarFallback>
            )}
          </Avatar>
          <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-zinc-900" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-zinc-100">{businessName}</h1>
          <p className="text-sm text-zinc-400 flex items-center gap-1.5">
            <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            AI Command Center
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          // Loading skeleton
          <div className="space-y-4">
            <div className="flex gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-20 w-80 rounded-xl" />
              </div>
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "flex-row-reverse" : "flex-row",
                )}
              >
                {/* Avatar */}
                <Avatar
                  className={cn(
                    "h-10 w-10 shrink-0",
                    message.role === "assistant"
                      ? "bg-gradient-to-br from-orange-500/20 to-purple-500/20 ring-2 ring-orange-500/30"
                      : "bg-zinc-800 ring-2 ring-zinc-700",
                  )}
                >
                  <AvatarFallback>
                    {message.role === "assistant" ? (
                      <Bot className="h-5 w-5 text-orange-400" />
                    ) : (
                      <User className="h-5 w-5 text-zinc-400" />
                    )}
                  </AvatarFallback>
                </Avatar>

                {/* Content */}
                <div
                  className={cn(
                    "flex-1 space-y-3 max-w-[85%]",
                    message.role === "user" && "flex flex-col items-end",
                  )}
                >
                  {/* Text Content */}
                  {message.content && (
                    <div
                      className={cn(
                        "rounded-2xl p-4",
                        message.role === "assistant"
                          ? "bg-zinc-800/80 text-zinc-100"
                          : "bg-gradient-to-r from-orange-500/20 to-purple-500/20 text-zinc-100 border border-orange-500/30",
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </p>
                    </div>
                  )}

                  {/* Stats Card */}
                  {message.type === "stats" && message.stats && (
                    <StatsCard
                      stats={{
                        ...message.stats,
                        ratingChange: 0,
                        totalReviews: 0,
                        attentionCount: 0,
                      }}
                    />
                  )}

                  {/* Approval Card */}
                  {message.type === "approval_card" &&
                    message.pendingAction && (
                      <ApprovalCard
                        action={message.pendingAction}
                        onApprove={() =>
                          handleApprove(message.pendingAction!.id)
                        }
                        onReject={() => handleReject(message.pendingAction!.id)}
                        onEdit={() =>
                          handleEdit(
                            message.pendingAction!.id,
                            message.pendingAction!.aiGeneratedContent,
                          )
                        }
                        isProcessing={processingActions.has(
                          message.pendingAction.id,
                        )}
                      />
                    )}

                  {/* Quick Actions */}
                  {message.quickActions && message.quickActions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {message.quickActions.map((action, idx) => (
                        <QuickActionButton
                          key={idx}
                          label={action.label}
                          icon={action.icon}
                          primary={action.primary}
                          onClick={() => handleQuickAction(action.action)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* Sending indicator */}
        {isSending && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <Avatar className="h-10 w-10 bg-gradient-to-br from-orange-500/20 to-purple-500/20 ring-2 ring-orange-500/30">
              <AvatarFallback>
                <Bot className="h-5 w-5 text-orange-400" />
              </AvatarFallback>
            </Avatar>
            <div className="bg-zinc-800/80 rounded-2xl p-4">
              <Loader2 className="h-5 w-5 animate-spin text-orange-400" />
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
        <div className="flex gap-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="اكتب رسالتك أو اختر أمر..."
            disabled={isSending}
            className="flex-1 bg-zinc-800 border-zinc-700 focus:border-orange-500 h-12"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            size="lg"
            className="bg-gradient-to-r from-orange-500 to-purple-500 hover:from-orange-600 hover:to-purple-600 px-6"
          >
            {isSending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Quick Suggestions */}
        <div className="flex flex-wrap gap-2 mt-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setInput("شو الوضع اليوم؟")}
            className="text-xs"
          >
            📊 شو الوضع؟
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setInput("حلل المراجعات السلبية")}
            className="text-xs"
          >
            🔍 حلل السلبية
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setInput("اقترح منشور جديد")}
            className="text-xs"
          >
            📝 منشور جديد
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setInput("كيف أحسن التقييم؟")}
            className="text-xs"
          >
            ⭐ حسّن التقييم
          </Button>
        </div>
      </div>
    </div>
  );
}
