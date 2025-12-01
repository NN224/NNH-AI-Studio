"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { Message } from "@/lib/types/chat-types";
import { createClient } from "@/lib/supabase/client";
import { aiLogger } from "@/lib/utils/logger";

// Define SpeechRecognition interface
interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: any) => void;
  onerror: () => void;
  onend: () => void;
}

// Quick commands for common actions
export const QUICK_COMMANDS = [
  {
    id: "reviews",
    label: "📊 Review Summary",
    query: "Give me a summary of my reviews",
  },
  {
    id: "pending",
    label: "⏳ Pending Reviews",
    query: "How many reviews need my response?",
  },
  {
    id: "rating",
    label: "⭐ Rating Analysis",
    query: "Analyze my ratings and suggest improvements",
  },
  {
    id: "tips",
    label: "💡 Quick Tips",
    query: "Give me 3 actionable tips to improve my business",
  },
  {
    id: "compare",
    label: "📈 Weekly Compare",
    query: "Compare this week to last week",
  },
] as const;

interface UseAIChatEnhancedOptions {
  userId?: string;
  conversationId?: string;
  onError?: (error: Error) => void;
}

export function useAIChatEnhanced(options: UseAIChatEnhancedOptions = {}) {
  const { userId, onError } = options;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(
    options.conversationId || null,
  );
  const [streamingContent, setStreamingContent] = useState("");

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const supabase = createClient();

  // Load conversation history on mount
  useEffect(() => {
    if (conversationId && userId && supabase) {
      loadConversation(conversationId);
    }
  }, [conversationId, userId]);

  // Load conversation from database
  const loadConversation = async (convId: string) => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (data) {
        setMessages(
          data.map((msg: any) => ({
            id: msg.id,
            role: msg.role as "user" | "assistant",
            content: msg.content,
            timestamp: new Date(msg.created_at),
            status: "delivered",
          })),
        );
      }
    } catch (error) {
      aiLogger.error(
        "Failed to load conversation",
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  };

  // Save message to database
  const saveMessage = async (message: Message) => {
    if (!userId || !supabase) return;

    try {
      // Create conversation if needed
      let convId = conversationId;
      if (!convId) {
        const { data: conv, error: convError } = await supabase
          .from("chat_conversations")
          .insert({
            user_id: userId,
            title: message.content.slice(0, 50) + "...",
          })
          .select("id")
          .single();

        if (convError) throw convError;
        convId = conv.id;
        setConversationId(convId);
      }

      // Save message
      await supabase.from("chat_messages").insert({
        conversation_id: convId,
        role: message.role,
        content: message.content,
        user_id: userId,
      });
    } catch (error) {
      aiLogger.error(
        "Failed to save message",
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  };

  // Send message with streaming support
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content,
        timestamp: new Date(),
        status: "sent",
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);
      setStreamingContent("");

      // Save user message
      saveMessage(userMessage);

      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch("/api/ai/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            conversationHistory: messages.slice(-10),
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          // Fallback to non-streaming endpoint
          const fallbackResponse = await fetch("/api/ai/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: content,
              conversationHistory: messages.slice(-10),
            }),
          });

          if (!fallbackResponse.ok) throw new Error("Failed to get response");

          const data = await fallbackResponse.json();
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: data.message || "I apologize, but I encountered an error.",
            timestamp: new Date(),
            status: "delivered",
          };

          setMessages((prev) => [...prev, assistantMessage]);
          saveMessage(assistantMessage);
          return;
        }

        // Handle streaming response
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader available");

        setIsStreaming(true);
        let fullContent = "";

        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullContent += parsed.content;
                  setStreamingContent(fullContent);
                }
              } catch {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        }

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: fullContent || "I apologize, but I encountered an error.",
          timestamp: new Date(),
          status: "delivered",
        };

        setMessages((prev) => [...prev, assistantMessage]);
        saveMessage(assistantMessage);
        setStreamingContent("");
      } catch (error) {
        if ((error as Error).name === "AbortError") return;

        aiLogger.error(
          "Chat error",
          error instanceof Error ? error : new Error(String(error)),
        );
        onError?.(error as Error);

        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
          status: "error",
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
        setIsStreaming(false);
      }
    },
    [messages, onError, userId, saveMessage],
  );

  // Execute quick command
  const executeCommand = useCallback(
    (commandId: string) => {
      const command = QUICK_COMMANDS.find((c) => c.id === commandId);
      if (command) {
        sendMessage(command.query);
      }
    },
    [sendMessage],
  );

  // Voice input
  const startVoiceInput = useCallback(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      aiLogger.warn("Speech recognition not supported");
      return;
    }

    if (!recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition();
      // Non-null assertion is safe here because we just assigned it above
      const recognition = recognitionRef.current!;

      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join("");
        setInput(transcript);

        if (event.results[0].isFinal) {
          setIsListening(false);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };
    }

    setIsListening(true);
    recognitionRef.current!.start();
  }, []);

  const stopVoiceInput = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  // Cancel ongoing request
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setIsStreaming(false);
      setStreamingContent("");
    }
  }, []);

  // Clear conversation
  const clearMessages = useCallback(() => {
    setMessages([]);
    setConversationId(null);
  }, []);

  // Regenerate last response
  const regenerateLastResponse = useCallback(() => {
    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === "user");
    if (lastUserMessage) {
      // Remove last assistant message
      setMessages((prev) => {
        const lastAssistantIndex = prev
          .map((m) => m.role)
          .lastIndexOf("assistant");
        if (lastAssistantIndex > -1) {
          return prev.slice(0, lastAssistantIndex);
        }
        return prev;
      });
      sendMessage(lastUserMessage.content);
    }
  }, [messages, sendMessage]);

  return {
    messages,
    input,
    setInput,
    isLoading,
    isStreaming,
    isListening,
    streamingContent,
    conversationId,
    quickCommands: QUICK_COMMANDS,
    sendMessage,
    executeCommand,
    startVoiceInput,
    stopVoiceInput,
    cancelRequest,
    clearMessages,
    regenerateLastResponse,
  };
}
