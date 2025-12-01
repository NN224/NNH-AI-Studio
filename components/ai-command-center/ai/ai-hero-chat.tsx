"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sparkles,
  Send,
  Loader2,
  User,
  Bot,
  MessageSquare,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import { aiLogger } from "@/lib/utils/logger";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  actions?: {
    label: string;
    onClick: () => void;
  }[];
}

interface BusinessInfo {
  name: string;
  logo?: string;
  category?: string;
  locationId?: string;
}

interface AIHeroChatProps {
  className?: string;
  businessInfo?: BusinessInfo;
  onSendMessage?: (message: string) => Promise<string>;
}

export function AIHeroChat({
  className,
  businessInfo,
  onSendMessage,
}: AIHeroChatProps) {
  const t = useTranslations("aiCommandCenter.chat");
  const params = useParams();
  const locale = params?.locale || "en";

  // Check if GMB is connected
  const hasGMBConnection =
    businessInfo?.locationId && businessInfo?.name !== "Your Business";

  // Default business info if not provided
  const defaultBusinessInfo: BusinessInfo = {
    name: businessInfo?.name || "Your Business",
    logo: businessInfo?.logo,
    category: businessInfo?.category || "Business",
  };

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      content: t("welcome", {
        defaultValue:
          "Hi! I'm your AI assistant. I can help you with reviews, posts, questions, and more. What would you like to do today?",
      }),
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Only scroll when new messages are added (not on initial load)
  useEffect(() => {
    // Skip scroll on initial load (when there's only 1 welcome message)
    if (messages.length > 1) {
      scrollToBottom();
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      let responseContent: string;

      if (onSendMessage) {
        // Use custom message handler if provided
        responseContent = await onSendMessage(input);
      } else {
        // Fallback to simulated response
        await new Promise((resolve) => setTimeout(resolve, 1500));
        responseContent = getAIResponse(input);
      }

      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responseContent,
        timestamp: new Date(),
        actions: getQuickActions(input),
      };

      setMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      aiLogger.error(
        "Chat error",
        error instanceof Error ? error : new Error(String(error)),
      );
      const errorResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const getAIResponse = (userInput: string): string => {
    const lowerInput = userInput.toLowerCase();

    if (lowerInput.includes("review")) {
      return t("responses.reviews", {
        defaultValue:
          "I can help you with reviews! You have 5 pending reviews that need responses. Would you like me to draft replies for them?",
      });
    } else if (lowerInput.includes("post")) {
      return t("responses.posts", {
        defaultValue:
          "Great! I can help you create engaging posts. What would you like to post about? I can suggest trending topics or generate content for you.",
      });
    } else if (lowerInput.includes("question")) {
      return t("responses.questions", {
        defaultValue:
          "I see you have 3 unanswered questions. I can draft professional responses for all of them. Shall we start?",
      });
    } else {
      return t("responses.default", {
        defaultValue:
          "I'm here to help! I can assist with:\n• Responding to reviews\n• Creating posts\n• Answering questions\n• Analyzing performance\n\nWhat would you like to work on?",
      });
    }
  };

  const getQuickActions = (userInput: string) => {
    const lowerInput = userInput.toLowerCase();

    if (lowerInput.includes("review")) {
      return [
        {
          label: t("actions.draftReplies", { defaultValue: "Draft Replies" }),
          onClick: () => (window.location.href = "/reviews"),
        },
        {
          label: t("actions.viewReviews", { defaultValue: "View Reviews" }),
          onClick: () => (window.location.href = "/reviews"),
        },
      ];
    } else if (lowerInput.includes("post")) {
      return [
        {
          label: t("actions.generatePost", { defaultValue: "Generate Post" }),
          onClick: () => (window.location.href = "/posts"),
        },
      ];
    }

    return undefined;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card
      className={cn(
        "border-orange-500/30 bg-linear-to-br from-zinc-900 via-purple-900/10 to-zinc-900 backdrop-blur-xl overflow-hidden",
        className,
      )}
    >
      {/* GMB Connection Banner */}
      {!hasGMBConnection && (
        <div className="bg-linear-to-r from-orange-500/20 to-amber-500/20 border-b border-orange-500/30 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-orange-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-orange-100 mb-1">
                Connect GMB to unlock full features
              </h3>
              <p className="text-xs text-orange-200/80 mb-3">
                Connect your Google My Business account to access real reviews,
                posts, Q&A, and AI-powered insights.
              </p>
              <Link href={`/${locale}/settings`}>
                <Button
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600 text-white gap-2 h-8 text-xs"
                >
                  Connect Google My Business
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Business Header */}
      <div className="bg-linear-to-r from-orange-500/20 via-purple-500/10 to-blue-500/20 border-b border-orange-500/30 p-6">
        <div className="flex items-center gap-4">
          {/* Business Logo */}
          <div className="shrink-0">
            {defaultBusinessInfo.logo ? (
              <img
                src={defaultBusinessInfo.logo}
                alt={defaultBusinessInfo.name}
                className="w-16 h-16 rounded-xl object-cover border-2 border-orange-500/30 shadow-lg"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-linear-to-br from-orange-500 to-purple-500 flex items-center justify-center border-2 border-orange-500/30 shadow-lg">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
            )}
          </div>

          {/* Business Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-zinc-100 truncate">
              {defaultBusinessInfo.name}
            </h2>
            <p className="text-sm text-zinc-400 flex items-center gap-2 mt-1">
              <span>{defaultBusinessInfo.category}</span>
              <span className="text-zinc-600">•</span>
              <span className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-green-400 font-medium">
                  {t("status.active", { defaultValue: "AI Active" })}
                </span>
              </span>
            </p>
          </div>

          {/* AI Badge */}
          <div className="shrink-0 hidden sm:block">
            <div className="px-4 py-2 rounded-xl bg-linear-to-r from-orange-500/20 to-purple-500/20 border border-orange-500/30 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-orange-400" />
                <span className="text-sm font-semibold text-zinc-100">
                  AI Assistant
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Chat Title */}
          <div className="flex items-center gap-2 text-zinc-300">
            <MessageSquare className="h-5 w-5 text-purple-400" />
            <h3 className="font-semibold">
              {t("title", { defaultValue: "AI Chat Assistant" })}
            </h3>
          </div>

          {/* Messages Container */}
          <div className="h-[400px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                  message.role === "user" ? "flex-row-reverse" : "flex-row",
                )}
              >
                {/* Avatar */}
                <Avatar
                  className={cn(
                    "h-10 w-10 shrink-0",
                    message.role === "assistant"
                      ? "bg-purple-500/20 ring-2 ring-purple-500/30"
                      : "bg-orange-500/20 ring-2 ring-orange-500/30",
                  )}
                >
                  <AvatarFallback>
                    {message.role === "assistant" ? (
                      <Bot className="h-5 w-5 text-purple-400" />
                    ) : (
                      <User className="h-5 w-5 text-orange-400" />
                    )}
                  </AvatarFallback>
                </Avatar>

                {/* Message Content */}
                <div
                  className={cn(
                    "flex-1 space-y-2",
                    message.role === "user" ? "items-end" : "items-start",
                  )}
                >
                  <div
                    className={cn(
                      "inline-block p-4 rounded-2xl max-w-[85%] shadow-lg",
                      message.role === "assistant"
                        ? "bg-linear-to-br from-zinc-800 to-zinc-800/80 text-zinc-100 rounded-tl-sm"
                        : "bg-linear-to-br from-orange-500/20 to-purple-500/20 text-zinc-100 rounded-tr-sm border border-orange-500/30",
                    )}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>

                  {/* Quick Actions */}
                  {message.actions && message.actions.length > 0 && (
                    <div className="flex flex-wrap gap-2 pl-2">
                      {message.actions.map((action, index) => (
                        <Button
                          key={index}
                          size="sm"
                          variant="outline"
                          onClick={action.onClick}
                          className="text-xs bg-zinc-800/50 hover:bg-zinc-700 border-zinc-700"
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  )}

                  {/* Timestamp */}
                  <p className="text-xs text-zinc-500 px-2">
                    {message.timestamp.toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Avatar className="h-10 w-10 bg-purple-500/20 ring-2 ring-purple-500/30">
                  <AvatarFallback>
                    <Bot className="h-5 w-5 text-purple-400" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-linear-to-br from-zinc-800 to-zinc-800/80 p-4 rounded-2xl rounded-tl-sm shadow-lg">
                  <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t("placeholder", {
                  defaultValue: "Ask me anything...",
                })}
                disabled={isLoading}
                className="flex-1 bg-zinc-800 border-zinc-700 focus:border-orange-500 h-12 text-base"
                autoComplete="off"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                size="lg"
                className="bg-linear-to-r from-orange-500 to-purple-500 hover:from-orange-600 hover:to-purple-600 px-6"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>

            {/* Quick Suggestions */}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setInput(
                    t("suggestions.reviews", {
                      defaultValue: "Help me with pending reviews",
                    }),
                  )
                }
                className="text-xs hover:bg-zinc-800"
              >
                💬 {t("suggestions.reviewsShort", { defaultValue: "Reviews" })}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setInput(
                    t("suggestions.posts", {
                      defaultValue: "Create a new post",
                    }),
                  )
                }
                className="text-xs hover:bg-zinc-800"
              >
                📝 {t("suggestions.postsShort", { defaultValue: "Posts" })}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setInput(
                    t("suggestions.questions", {
                      defaultValue: "Answer pending questions",
                    }),
                  )
                }
                className="text-xs hover:bg-zinc-800"
              >
                ❓{" "}
                {t("suggestions.questionsShort", { defaultValue: "Questions" })}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(249, 115, 22, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(249, 115, 22, 0.7);
        }
      `}</style>
    </Card>
  );
}
