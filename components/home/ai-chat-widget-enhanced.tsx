"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Bot,
  User,
  Send,
  Mic,
  MicOff,
  Sparkles,
  RefreshCw,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  useAIChatEnhanced,
  QUICK_COMMANDS,
} from "@/hooks/features/use-ai-chat-enhanced";

interface AIChatWidgetEnhancedProps {
  userId?: string;
}

export function AIChatWidgetEnhanced({ userId }: AIChatWidgetEnhancedProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCommands, setShowCommands] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    input,
    setInput,
    isLoading,
    isStreaming,
    isListening,
    streamingContent,
    quickCommands,
    sendMessage,
    executeCommand,
    startVoiceInput,
    stopVoiceInput,
    cancelRequest,
    clearMessages,
    regenerateLastResponse,
  } = useAIChatEnhanced({ userId });

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  // Hide commands after first message
  useEffect(() => {
    if (messages.length > 0) {
      setShowCommands(false);
    }
  }, [messages.length]);

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      sendMessage(input);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.div
        data-tour="ai-chat"
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Button
          size="lg"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "h-14 w-14 rounded-full shadow-lg transition-all duration-300",
            isOpen
              ? "bg-gray-700 hover:bg-gray-600"
              : "bg-gradient-to-br from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600",
          )}
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <MessageCircle className="w-6 h-6" />
          )}
        </Button>

        {/* Notification dot for streaming */}
        {isStreaming && !isOpen && (
          <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
        )}
      </motion.div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-[420px] h-[650px] max-w-[calc(100vw-3rem)] max-h-[calc(100vh-8rem)]"
          >
            <Card className="h-full flex flex-col shadow-2xl border-purple-500/20 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-500/10 to-blue-500/10">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    {isStreaming && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      AI Assistant
                      <Sparkles className="w-4 h-4 text-purple-500" />
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {isStreaming
                        ? "Typing..."
                        : isLoading
                          ? "Thinking..."
                          : "Online"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {messages.length > 0 && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={regenerateLastResponse}
                        disabled={isLoading}
                        title="Regenerate"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={clearMessages}
                        disabled={isLoading}
                        title="Clear chat"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Messages Area */}
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-4">
                  {/* Welcome message */}
                  {messages.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center py-8"
                    >
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                        <Bot className="w-8 h-8 text-purple-500" />
                      </div>
                      <h4 className="font-semibold mb-2">
                        How can I help you today?
                      </h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Ask me anything about your business analytics
                      </p>
                    </motion.div>
                  )}

                  {/* Quick Commands */}
                  {showCommands && messages.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-wrap gap-2 justify-center"
                    >
                      {quickCommands.map((cmd) => (
                        <Button
                          key={cmd.id}
                          variant="outline"
                          size="sm"
                          onClick={() => executeCommand(cmd.id)}
                          className="text-xs"
                        >
                          {cmd.label}
                        </Button>
                      ))}
                    </motion.div>
                  )}

                  {/* Messages */}
                  {messages.map((message, index) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className={cn(
                        "flex gap-3",
                        message.role === "user"
                          ? "justify-end"
                          : "justify-start",
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
                        <p className="text-sm whitespace-pre-wrap">
                          {message.content}
                        </p>
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

                  {/* Streaming content */}
                  {isStreaming && streamingContent && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex gap-3 justify-start"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="max-w-[80%] rounded-2xl px-4 py-2 bg-muted">
                        <p className="text-sm whitespace-pre-wrap">
                          {streamingContent}
                        </p>
                        <span className="inline-block w-2 h-4 bg-purple-500 animate-pulse ml-1" />
                      </div>
                    </motion.div>
                  )}

                  {/* Loading indicator */}
                  {isLoading && !isStreaming && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex gap-3 justify-start"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-muted rounded-2xl px-4 py-3">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
                          <span
                            className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          />
                          <span
                            className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </ScrollArea>

              {/* Quick commands toggle */}
              {messages.length > 0 && (
                <div className="px-4 py-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCommands(!showCommands)}
                    className="w-full text-xs text-muted-foreground"
                  >
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 mr-1 transition-transform",
                        showCommands && "rotate-180",
                      )}
                    />
                    Quick Actions
                  </Button>
                  <AnimatePresence>
                    {showCommands && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="flex flex-wrap gap-2 mt-2 overflow-hidden"
                      >
                        {quickCommands.map((cmd) => (
                          <Badge
                            key={cmd.id}
                            variant="outline"
                            className="cursor-pointer hover:bg-muted"
                            onClick={() => executeCommand(cmd.id)}
                          >
                            {cmd.label}
                          </Badge>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Input Area */}
              <div className="p-4 border-t bg-background">
                <div className="flex gap-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask me anything..."
                    className="min-h-[50px] max-h-[100px] resize-none"
                    disabled={isLoading}
                  />
                  <div className="flex flex-col gap-2">
                    <Button
                      size="icon"
                      variant={isListening ? "destructive" : "outline"}
                      onClick={isListening ? stopVoiceInput : startVoiceInput}
                      disabled={isLoading}
                    >
                      {isListening ? (
                        <MicOff className="w-4 h-4" />
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                    </Button>
                    {isLoading ? (
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={cancelRequest}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        size="icon"
                        onClick={handleSend}
                        disabled={!input.trim()}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
