"use client";

/**
 * 🎛️ COMMAND CENTER CHAT
 *
 * Chat-First AI Command Center
 * - AI initiates with insights
 * - Approval cards in conversation
 * - Quick actions
 * - Real AI backend
 *
 * Refactored to use separated components
 */

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Loader2, Send, Sparkles, User } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// Import separated components
import type { BusinessDNA } from "@/lib/services/business-dna-service";
import { getPreviewModeData } from "@/lib/services/preview-mode-service";
import { fetchWithCSRF } from "@/lib/utils/fetch-with-csrf";
import { ApprovalCard, type PendingAction } from "./approval-card";
import { BusinessDNACard } from "./business-dna-card";
import { PatternAlertCard, type DetectedPattern } from "./pattern-alert-card";
import { PreviewModeBanner } from "./preview-mode-banner";
import { QuickActionButton } from "./quick-action-button";
import { StatsCard } from "./stats-card";

// ============================================
// TYPES
// ============================================

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
    | "insight"
    | "business_dna"
    | "pattern_alert";
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
  // For Business DNA
  businessDNA?: BusinessDNA;
  // For Pattern Detection
  patterns?: DetectedPattern[];
  // Quick actions
  quickActions?: Array<{
    label: string;
    action: string;
    icon?: string;
    primary?: boolean;
  }>;
}

interface CommandCenterChatProps {
  userId: string;
  locationId?: string;
  businessName: string;
  businessLogo?: string;
  userName: string;
  isPreviewMode?: boolean;
  previewData?: ReturnType<typeof getPreviewModeData>;
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
  isPreviewMode = false,
  previewData,
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
      // Use preview data if in preview mode, otherwise fetch real data
      let responseData;

      if (isPreviewMode) {
        // Load preview mode data (use provided data or generate new)
        const data = previewData || getPreviewModeData();
        responseData = {
          success: true,
          data: {
            proactiveGreeting: data.proactiveGreeting,
            pendingApprovals: {
              totalCount: data.pendingApprovals.length,
              reviewReplies: data.pendingApprovals.filter(
                (a) => a.actionType === "review_reply",
              ),
              questionAnswers: [],
            },
            stats: data.stats,
            autopilotStatus: data.autopilotStatus,
          },
        };
      } else {
        const response = await fetch(
          `/api/ai/command-center${locationId ? `?locationId=${locationId}` : ""}`,
        );
        responseData = await response.json();
      }

      if (responseData.success) {
        const { proactiveGreeting, pendingApprovals, stats, autopilotStatus } =
          responseData.data;

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
            content: `You have ${pendingApprovals.totalCount} pending actions:
• ${pendingApprovals.reviewReplies.length} review replies
• ${pendingApprovals.questionAnswers.length} question answers
${pendingApprovals.totalCount > 0 ? "\nWhat would you like to do?" : ""}`,
            timestamp: new Date(),
            type: "text",
            quickActions: [
              {
                label: "Approve All ✓",
                action: "approve_all",
                primary: true,
                icon: "check",
              },
              {
                label: "Show Details",
                action: "show_pending",
                icon: "message",
              },
              {
                label: "Negative Only ⚠️",
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
          content: `Hello ${userName}! 👋\n\nThere was an error loading data. Try refreshing the page.`,
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
        setInput("Analyze negative reviews");
        break;
      case "chat":
        // Focus input
        break;
      case "dismiss":
        addAssistantMessage("Got it! I'm here if you need anything. 👍");
        break;
      default:
        setInput(action);
    }
  };

  // Show pending approvals
  const handleShowPending = async () => {
    addUserMessage("Show me the details");

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
            `There are ${data.data.actions.length - 3} more items. Want to see them?`,
            [{ label: "Yes, show me", action: "show_more", primary: true }],
          );
        }
      } else {
        addAssistantMessage("No pending actions right now! 🎉");
      }
    } catch (error) {
      console.error("Error fetching pending:", error);
      addAssistantMessage("An error occurred. Please try again.");
    }
  };

  // Show negative reviews only
  const handleShowNegative = async () => {
    addUserMessage("Show negative only");

    try {
      const response = await fetch(
        `/api/ai/pending?attention=true${locationId ? `&locationId=${locationId}` : ""}`,
      );
      const data = await response.json();

      if (data.success && data.data.actions.length > 0) {
        addAssistantMessage(
          `You have ${data.data.actions.length} reviews that need attention:`,
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
        addAssistantMessage("No negative reviews pending! 🎉");
      }
    } catch (error) {
      console.error("Error fetching negative:", error);
      addAssistantMessage("An error occurred. Please try again.");
    }
  };

  // Approve all pending
  const handleApproveAll = async () => {
    addUserMessage("Approve all");

    try {
      // Get all pending actions first
      const pendingResponse = await fetch(
        `/api/ai/pending${locationId ? `?locationId=${locationId}` : ""}`,
      );
      const pendingData = await pendingResponse.json();

      if (!pendingData.success || pendingData.data.actions.length === 0) {
        addAssistantMessage("Nothing to approve! ✨");
        return;
      }

      // Filter only high confidence ones
      const highConfidenceActions = pendingData.data.actions.filter(
        (a: any) => a.aiConfidence >= 80 && !a.requiresAttention,
      );

      if (highConfidenceActions.length === 0) {
        addAssistantMessage(
          "All pending actions require your personal attention. Let me show you one by one.",
          [{ label: "Show me", action: "show_pending", primary: true }],
        );
        return;
      }

      // Batch approve
      const actionIds = highConfidenceActions.map((a: any) => a.id);
      const approveResponse = await fetchWithCSRF(
        "/api/ai/pending/batch/approve",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actionIds }),
        },
      );
      const approveData = await approveResponse.json();

      if (approveData.success) {
        const { processed, failed } = approveData;
        const successMsg =
          failed === 0
            ? `✅ Approved and published ${processed} ${processed === 1 ? "reply" : "replies"} to Google Business Profile! 🎉`
            : `⚠️ Published ${processed} ${processed === 1 ? "reply" : "replies"}, but ${failed} failed to publish.`;

        const remainingCount =
          pendingData.data.actions.length - highConfidenceActions.length;

        addAssistantMessage(
          successMsg +
            (remainingCount > 0
              ? `\n\n${remainingCount} ${remainingCount === 1 ? "action" : "actions"} remaining require your attention.`
              : ""),
          remainingCount > 0
            ? [
                {
                  label: "Show remaining",
                  action: "show_negative",
                  primary: true,
                },
              ]
            : undefined,
        );
      } else {
        addAssistantMessage(
          "❌ Error approving actions. Please try again or approve individually.",
        );
      }
    } catch (error) {
      console.error("Error approving all:", error);
      addAssistantMessage("An error occurred. Please try again.");
    }
  };

  // Handle individual approval
  const handleApprove = async (actionId: string) => {
    // Prevent approval in preview mode
    if (isPreviewMode) {
      addAssistantMessage(
        "⚠️ Preview Mode: This is demo data. Connect your Google Business Profile to approve real reviews!",
      );
      return;
    }

    setProcessingActions((prev) => new Set(prev).add(actionId));

    try {
      const response = await fetchWithCSRF(
        `/api/ai/pending/${actionId}/approve`,
        {
          method: "POST",
        },
      );
      const data = await response.json();

      if (data.success) {
        // Remove the card and add success message
        setMessages((prev) =>
          prev.filter((m) => m.pendingAction?.id !== actionId),
        );
        addAssistantMessage(
          "Done! ✅ Reply published to Google Business Profile.",
        );
      } else {
        // Show error with more context
        const errorMsg = data.error || "Unknown error occurred";
        addAssistantMessage(
          `❌ Publishing failed: ${errorMsg}\n\nThe action has been marked as failed. You can retry later or edit the response.`,
        );
      }
    } catch (error) {
      console.error("Error approving:", error);
      addAssistantMessage("An error occurred. Please try again.");
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
      const response = await fetchWithCSRF(
        `/api/ai/pending/${actionId}/reject`,
        {
          method: "POST",
        },
      );
      const data = await response.json();

      if (data.success) {
        setMessages((prev) =>
          prev.filter((m) => m.pendingAction?.id !== actionId),
        );
        addAssistantMessage("Deleted. 👍");
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
    addAssistantMessage("Edit the reply and send when ready. 👆");
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
      // Build request body - only include defined values
      const requestBody: {
        message: string;
        conversationId?: string;
        locationId?: string;
      } = {
        message: userInput,
      };

      // Only add conversationId if it's a valid string
      if (conversationId && typeof conversationId === "string") {
        requestBody.conversationId = conversationId;
      }

      // Only add locationId if it's a valid string
      if (locationId && typeof locationId === "string") {
        requestBody.locationId = locationId;
      }

      const response = await fetchWithCSRF("/api/ai/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
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
        // Show detailed error message from API
        const errorMessage =
          response.status === 400
            ? "❌ Invalid request. Please check your input and try again."
            : response.status === 401
              ? "🔒 Please log in to continue."
              : data.error || "Sorry, an error occurred. Please try again.";

        console.error("[Chat] API Error:", {
          status: response.status,
          error: data.error,
          details: data.details,
        });

        addAssistantMessage(errorMessage);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      addAssistantMessage(
        "❌ Connection error. Please check your internet and try again.",
      );
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
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-5xl mx-auto bg-zinc-950/50 rounded-xl border border-zinc-800/50 shadow-2xl overflow-hidden">
      {/* Preview Mode Banner */}
      {isPreviewMode && <PreviewModeBanner />}

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

                  {/* Business DNA Card */}
                  {message.type === "business_dna" && message.businessDNA && (
                    <BusinessDNACard dna={message.businessDNA} />
                  )}

                  {/* Pattern Alert Card */}
                  {message.type === "pattern_alert" &&
                    message.patterns &&
                    message.patterns.length > 0 && (
                      <PatternAlertCard patterns={message.patterns} />
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
            placeholder="Type your message or choose a command..."
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
            onClick={() => setInput("What's the status today?")}
            className="text-xs"
          >
            📊 Status?
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setInput("Analyze negative reviews")}
            className="text-xs"
          >
            🔍 Analyze Negative
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setInput("Suggest a new post")}
            className="text-xs"
          >
            📝 New Post
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setInput("How to improve rating?")}
            className="text-xs"
          >
            ⭐ Improve Rating
          </Button>
        </div>
      </div>
    </div>
  );
}
