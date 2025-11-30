"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useHomeData } from "@/hooks/use-home-data";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageSquare,
  Mic,
  Send,
  Sparkles,
  Star,
  TrendingUp,
  User,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface AIHeroSectionProps {
  businessName?: string;
  className?: string;
}

interface QuickCommand {
  id: string;
  label: string;
  icon: React.ElementType;
  action: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const quickCommands: QuickCommand[] = [
  {
    id: "reply-reviews",
    label: "رد على المراجعات",
    icon: MessageSquare,
    action: "batch_reply",
  },
  {
    id: "create-post",
    label: "انشر بوست",
    icon: TrendingUp,
    action: "create_post",
  },
  {
    id: "weekly-report",
    label: "تقرير الأسبوع",
    icon: Star,
    action: "weekly_report",
  },
];

export function AIHeroSection({ businessName, className }: AIHeroSectionProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [pendingReplies, setPendingReplies] = useState<
    Array<{ reviewId: string; suggestedReply: string; confidence?: number }>
  >([]);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get live data
  const {
    urgentItems,
    managementStats,
    isLoading: dataLoading,
  } = useHomeData();

  // Scroll to bottom when new messages
  useEffect(() => {
    if (showHistory && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, showHistory]);

  // Auto-show history when messages exist
  useEffect(() => {
    if (messages.length > 0) {
      setShowHistory(true);
    }
  }, [messages.length]);

  // Calculate today's tasks
  const pendingReviews = managementStats?.reviews?.pending || 0;
  const unansweredQuestions = managementStats?.questions?.unanswered || 0;
  const urgentCount = urgentItems?.length || 0;

  // Get last assistant message for quick display
  const lastAssistantMessage = messages
    .filter((m) => m.role === "assistant")
    .pop();

  const addMessage = (role: "user" | "assistant", content: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
    return newMessage;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);

    // Add user message
    addMessage("user", userMessage);

    try {
      // Build conversation history for context
      const conversationHistory = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory,
        }),
      });

      const data = await res.json();

      if (data.error) {
        addMessage("assistant", `❌ ${data.error}`);
      } else {
        addMessage("assistant", data.message?.content || "تم!");
      }
    } catch {
      addMessage("assistant", "❌ حدث خطأ. حاول مرة أخرى.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickCommand = async (command: QuickCommand) => {
    setIsLoading(true);

    // Add user message for context
    addMessage("user", command.label);

    try {
      if (command.action === "batch_reply") {
        const res = await fetch("/api/ai/actions/batch-reply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "generate_replies", maxCount: 5 }),
        });

        const data = await res.json();

        if (data.error) {
          addMessage("assistant", `❌ ${data.error}`);
        } else if (data.replies && data.replies.length > 0) {
          // Store replies for saving
          setPendingReplies(
            data.replies.map(
              (r: {
                reviewId: string;
                suggestedReply: string;
                confidence?: number;
              }) => ({
                reviewId: r.reviewId,
                suggestedReply: r.suggestedReply,
                confidence: r.confidence,
              }),
            ),
          );

          const repliesText = data.replies
            .map(
              (r: {
                reviewerName: string;
                rating: number;
                suggestedReply: string;
              }) =>
                `**${r.reviewerName}** (${r.rating}⭐):\n${r.suggestedReply}`,
            )
            .join("\n\n---\n\n");
          addMessage(
            "assistant",
            `✅ تم إنشاء ${data.replies.length} رد:\n\n${repliesText}`,
          );
        } else {
          addMessage("assistant", "✅ لا توجد مراجعات تحتاج رد!");
        }
      } else if (command.action === "create_post") {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: "اقترح بوست ترويجي جذاب لنشره على Google Business",
            conversationHistory: messages
              .slice(-5)
              .map((m) => ({ role: m.role, content: m.content })),
          }),
        });
        const data = await res.json();
        addMessage("assistant", data.message?.content || data.error || "تم!");
      } else if (command.action === "weekly_report") {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: "أعطني تقرير مختصر عن أداء الأسبوع الماضي",
            conversationHistory: messages
              .slice(-5)
              .map((m) => ({ role: m.role, content: m.content })),
          }),
        });
        const data = await res.json();
        addMessage("assistant", data.message?.content || data.error || "تم!");
      }
    } catch {
      addMessage("assistant", "❌ حدث خطأ. حاول مرة أخرى.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveReplies = async (action: "save_draft" | "publish_all") => {
    if (pendingReplies.length === 0) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/ai/actions/save-replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replies: pendingReplies, action }),
      });

      const data = await res.json();

      if (data.success) {
        addMessage("assistant", data.message);
        setPendingReplies([]); // Clear pending replies
      } else {
        addMessage("assistant", `❌ ${data.error || "فشل في الحفظ"}`);
      }
    } catch {
      addMessage("assistant", "❌ حدث خطأ أثناء الحفظ");
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn("relative", className)}
    >
      <Card className="overflow-hidden border-orange-500/20 bg-zinc-900/80 backdrop-blur">
        <CardContent className="relative p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-orange-500/20 border border-orange-500/30">
                <Bot className="h-6 w-6 text-orange-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  AI Command Center
                  <Sparkles className="h-4 w-4 text-orange-400" />
                </h2>
                <p className="text-sm text-zinc-400">
                  {businessName
                    ? `مساعدك الذكي لـ ${businessName}`
                    : "مساعدك الذكي"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Conversation count */}
              {messages.length > 0 && (
                <Badge
                  variant="outline"
                  className="border-zinc-600 text-zinc-400"
                >
                  {messages.length} رسائل
                </Badge>
              )}
              {/* Live Status */}
              <Badge
                variant="outline"
                className="border-green-500/50 text-green-400 bg-green-500/10"
              >
                <span className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse" />
                متصل
              </Badge>
            </div>
          </div>

          {/* Today's Tasks Summary */}
          {!dataLoading &&
            (pendingReviews > 0 ||
              unansweredQuestions > 0 ||
              urgentCount > 0) && (
              <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-orange-400" />
                  <span className="text-sm font-medium text-zinc-200">
                    مهام اليوم
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {pendingReviews > 0 && (
                    <Link href="/reviews">
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-orange-500/20 border-orange-500/30 text-orange-300"
                      >
                        🔴 {pendingReviews} مراجعات
                      </Badge>
                    </Link>
                  )}
                  {unansweredQuestions > 0 && (
                    <Link href="/questions">
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-yellow-500/20 border-yellow-500/30 text-yellow-300"
                      >
                        🟡 {unansweredQuestions} أسئلة
                      </Badge>
                    </Link>
                  )}
                  {urgentCount > 0 && (
                    <Badge
                      variant="outline"
                      className="border-red-500/30 text-red-300"
                    >
                      ⚠️ {urgentCount} عاجل
                    </Badge>
                  )}
                </div>
              </div>
            )}

          {/* Conversation History */}
          <AnimatePresence>
            {messages.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                {/* Toggle button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHistory(!showHistory)}
                  className="w-full mb-2 text-zinc-400 hover:text-white"
                >
                  {showHistory ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-2" />
                      إخفاء المحادثة
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      عرض المحادثة ({messages.length})
                    </>
                  )}
                </Button>

                {showHistory && (
                  <ScrollArea className="h-64 rounded-lg border border-zinc-700 bg-zinc-800/50 p-3">
                    <div className="space-y-3">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex gap-2",
                            msg.role === "user"
                              ? "justify-end"
                              : "justify-start",
                          )}
                        >
                          {msg.role === "assistant" && (
                            <div className="p-1.5 rounded-lg bg-orange-500/20 h-fit">
                              <Bot className="h-4 w-4 text-orange-400" />
                            </div>
                          )}
                          <div
                            className={cn(
                              "max-w-[80%] p-3 rounded-lg text-sm",
                              msg.role === "user"
                                ? "bg-orange-500/20 text-orange-100"
                                : "bg-zinc-700/50 text-zinc-200",
                            )}
                          >
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          {msg.role === "user" && (
                            <div className="p-1.5 rounded-lg bg-zinc-600/50 h-fit">
                              <User className="h-4 w-4 text-zinc-300" />
                            </div>
                          )}
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                )}

                {/* Last message preview when collapsed */}
                {!showHistory && lastAssistantMessage && (
                  <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
                    <div className="flex items-start gap-2">
                      <Bot className="h-4 w-4 text-orange-400 mt-0.5" />
                      <p className="text-sm text-zinc-300 line-clamp-2">
                        {lastAssistantMessage.content}
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chat Input */}
          <div className="relative">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="اسألني أي شيء... (مثال: كيف كان أداء الأسبوع؟)"
              className="pr-24 h-12 text-base bg-zinc-800/50 border-zinc-700 focus:border-orange-500/50 placeholder:text-zinc-500"
              disabled={isLoading}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-zinc-400 hover:text-white"
                disabled={isLoading}
              >
                <Mic className="h-4 w-4" />
              </Button>
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="h-9 w-9 bg-orange-500 hover:bg-orange-600"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Action Buttons - Show when replies are pending */}
          {pendingReplies.length > 0 && (
            <div className="flex gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <span className="text-sm text-green-300 flex-1">
                {pendingReplies.length} ردود جاهزة للحفظ
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSaveReplies("save_draft")}
                disabled={isSaving}
                className="border-green-500/50 text-green-400 hover:bg-green-500/20"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "💾 حفظ كمسودة"
                )}
              </Button>
              <Button
                size="sm"
                onClick={() => handleSaveReplies("publish_all")}
                disabled={isSaving}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "🚀 نشر الكل"
                )}
              </Button>
            </div>
          )}

          {/* Quick Commands */}
          <div className="flex flex-wrap gap-2">
            {quickCommands.map((cmd) => (
              <Button
                key={cmd.id}
                variant="outline"
                size="sm"
                onClick={() => handleQuickCommand(cmd)}
                disabled={isLoading || isSaving}
                className="gap-2 border-zinc-700 hover:border-orange-500/50 bg-zinc-800/50 hover:bg-orange-500/10"
              >
                <cmd.icon className="h-4 w-4" />
                {cmd.label}
                <ArrowRight className="h-3 w-3 opacity-50" />
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
