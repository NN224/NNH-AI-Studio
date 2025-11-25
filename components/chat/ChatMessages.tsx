"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Message } from "@/lib/types/chat-types";
import { Bot, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-4">
        {messages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "flex gap-3",
              message.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            {message.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}

            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted",
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <span className="text-[10px] opacity-50 mt-1 block">
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            {message.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
          </motion.div>
        ))}

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3 justify-start"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-muted rounded-2xl px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          </motion.div>
        )}
      </div>
    </ScrollArea>
  );
}
