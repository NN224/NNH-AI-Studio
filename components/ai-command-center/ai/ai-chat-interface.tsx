"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sparkles, Send, Loader2, User, Bot } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

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
}

interface AIChatInterfaceProps {
  className?: string;
  businessInfo?: BusinessInfo;
}

export function AIChatInterface({
  className,
  businessInfo,
}: AIChatInterfaceProps) {
  const t = useTranslations("aiCommandCenter.chat");

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

  useEffect(() => {
    scrollToBottom();
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

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: getAIResponse(input),
        timestamp: new Date(),
        actions: getQuickActions(input),
      };

      setMessages((prev) => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1500);
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
          onClick: () => (window.location.href = "/posts/create"),
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
    <div className={cn("space-y-3", className)}>
      {/* Business Header Card */}
      <Card className="border-orange-500/30 bg-linear-to-br from-orange-500/10 via-purple-500/5 to-blue-500/10 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {/* Business Logo */}
            <div className="shrink-0">
              {defaultBusinessInfo.logo ? (
                <img
                  src={defaultBusinessInfo.logo}
                  alt={defaultBusinessInfo.name}
                  className="w-12 h-12 rounded-lg object-cover border-2 border-orange-500/30 shadow-lg"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-linear-to-br from-orange-500 to-purple-500 flex items-center justify-center border-2 border-orange-500/30 shadow-lg">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
              )}
            </div>

            {/* Business Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-zinc-100 truncate">
                {defaultBusinessInfo.name}
              </h3>
              <p className="text-xs text-zinc-400">
                {defaultBusinessInfo.category}
              </p>
            </div>

            {/* AI Status */}
            <div className="shrink-0">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/20 border border-green-500/30">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-green-400 font-medium">
                  {t("status.active", { defaultValue: "AI Active" })}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chat Interface Card */}
      <Card className="border-orange-500/20 bg-zinc-900/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-purple-500" />
            {t("title", { defaultValue: "AI Chat Assistant" })}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Messages */}
          <div className="h-[400px] overflow-y-auto space-y-3 pr-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "flex-row-reverse" : "flex-row",
                )}
              >
                {/* Avatar */}
                <Avatar
                  className={cn(
                    "h-8 w-8 shrink-0",
                    message.role === "assistant"
                      ? "bg-purple-500/20"
                      : "bg-orange-500/20",
                  )}
                >
                  <AvatarFallback>
                    {message.role === "assistant" ? (
                      <Bot className="h-4 w-4 text-purple-400" />
                    ) : (
                      <User className="h-4 w-4 text-orange-400" />
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
                      "inline-block p-3 rounded-lg max-w-[85%]",
                      message.role === "assistant"
                        ? "bg-zinc-800 text-zinc-100"
                        : "bg-orange-500/20 text-zinc-100",
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>

                  {/* Quick Actions */}
                  {message.actions && message.actions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {message.actions.map((action, index) => (
                        <Button
                          key={index}
                          size="sm"
                          variant="outline"
                          onClick={action.onClick}
                          className="text-xs"
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  )}

                  {/* Timestamp */}
                  <p className="text-xs text-zinc-500 px-1">
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
              <div className="flex gap-3">
                <Avatar className="h-8 w-8 bg-purple-500/20">
                  <AvatarFallback>
                    <Bot className="h-4 w-4 text-purple-400" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-zinc-800 p-3 rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t("placeholder", {
                defaultValue: "Ask me anything...",
              })}
              disabled={isLoading}
              className="flex-1 bg-zinc-800 border-zinc-700"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
            >
              <Send className="h-4 w-4" />
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
              className="text-xs"
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
              className="text-xs"
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
              className="text-xs"
            >
              ❓{" "}
              {t("suggestions.questionsShort", { defaultValue: "Questions" })}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
