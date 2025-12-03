"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Mic,
  Bot,
  User,
  Sparkles,
  Maximize2,
  Minimize2,
  Loader2,
  MessageSquare,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  suggestedActions?: Array<{
    type: string;
    label: string;
  }>;
}

interface AIChatBoxProps {
  userId: string;
  locationId?: string;
  businessName: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function AIChatBox({
  userId,
  locationId,
  businessName,
  isExpanded,
  onToggleExpand,
}: AIChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      const hour = new Date().getHours();
      const greeting =
        hour < 12 ? "صباح الخير" : hour < 18 ? "مساء الخير" : "مساء النور";

      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: `${greeting}! 👋\n\nأنا مساعدك الذكي لـ ${businessName}. أعرف كل شيء عن أعمالك وأقدر أساعدك في:\n\n• الرد على المراجعات\n• تحليل أداء عملك\n• إنشاء منشورات\n• الإجابة على أسئلتك\n\nكيف أقدر أساعدك اليوم؟`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [businessName, messages.length]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId,
          locationId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setConversationId(data.conversationId);

        const assistantMessage: Message = {
          id: Date.now().toString() + "-ai",
          role: "assistant",
          content: data.message,
          timestamp: new Date(),
          suggestedActions: data.suggestedActions,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        // Error message
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString() + "-error",
            role: "assistant",
            content: "عذراً، حدث خطأ. حاول مرة أخرى.",
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + "-error",
          role: "assistant",
          content: "عذراً، لم أتمكن من الاتصال. تأكد من اتصالك بالإنترنت.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Quick suggestions
  const suggestions = [
    "كيف أداء شغلي؟",
    "اكتبلي رد للمراجعة الأخيرة",
    "شو أنشر اليوم؟",
    "حلل المراجعات السلبية",
  ];

  return (
    <motion.div
      layout
      className={`bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-3xl border border-gray-700/50 backdrop-blur-xl overflow-hidden flex flex-col ${
        isExpanded ? "h-[600px]" : "h-[500px]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white flex items-center gap-2">
              AI Assistant
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
            </h3>
            <p className="text-xs text-gray-400">
              يعرف كل شيء عن {businessName}
            </p>
          </div>
        </div>

        <button
          onClick={onToggleExpand}
          className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
        >
          {isExpanded ? (
            <Minimize2 className="w-4 h-4 text-gray-400" />
          ) : (
            <Maximize2 className="w-4 h-4 text-gray-400" />
          )}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  msg.role === "user" ? "bg-orange-500/20" : "bg-violet-500/20"
                }`}
              >
                {msg.role === "user" ? (
                  <User className="w-4 h-4 text-orange-400" />
                ) : (
                  <Sparkles className="w-4 h-4 text-violet-400" />
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[80%] ${
                  msg.role === "user"
                    ? "bg-orange-500/20 border-orange-500/30"
                    : "bg-gray-700/50 border-gray-600/30"
                } rounded-2xl px-4 py-3 border`}
              >
                <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                </p>

                {/* Suggested Actions */}
                {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {msg.suggestedActions.map((action, idx) => (
                      <button
                        key={idx}
                        className="text-xs px-3 py-1.5 bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 rounded-lg transition-colors"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
            </div>
            <div className="bg-gray-700/50 rounded-2xl px-4 py-3 border border-gray-600/30">
              <div className="flex gap-1">
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-500 mb-2">اقتراحات:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => setInput(suggestion)}
                className="text-xs px-3 py-1.5 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors border border-gray-600/30"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-700/30">
        <div className="flex items-end gap-2">
          <div className="flex-1 bg-gray-800/50 rounded-2xl border border-gray-700/50 focus-within:border-violet-500/50 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="اكتب رسالتك..."
              rows={1}
              className="w-full px-4 py-3 bg-transparent text-gray-200 placeholder-gray-500 resize-none focus:outline-none text-sm"
              style={{ minHeight: "44px", maxHeight: "120px" }}
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5 text-white" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
