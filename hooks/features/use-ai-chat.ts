import {
  useAIChat as useAIChatBase,
  type AIChatResponse,
} from "@/hooks/use-ai-command-center";
import { Message } from "@/lib/types/chat-types";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

// SpeechRecognition type for browser API
type SpeechRecognitionType = typeof window.SpeechRecognition extends undefined
  ? typeof window.webkitSpeechRecognition
  : typeof window.SpeechRecognition;

export function useAIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<InstanceType<SpeechRecognitionType> | null>(
    null,
  );
  const { sendMessage: sendAIMessage } = useAIChatBase();

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

      try {
        // Use the improved AI chat hook with structured error handling
        const response: AIChatResponse = await sendAIMessage(content);

        if (response.type === "error") {
          // Display error toast notification
          toast.error("AI Chat Error", {
            description: response.message,
            action: response.canRetry
              ? {
                  label: "Retry",
                  onClick: () => sendMessage(content),
                }
              : undefined,
          });

          // Add error message to chat
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: `❌ ${response.message}`,
            timestamp: new Date(),
            status: "error",
          };
          setMessages((prev) => [...prev, errorMessage]);
        } else {
          // Success - add assistant message
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: response.message,
            timestamp: new Date(),
            status: "delivered",
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }
      } catch (error) {
        // Fallback error handling for unexpected errors
        console.error("Unexpected chat error:", error);
        toast.error("Unexpected Error", {
          description: "An unexpected error occurred. Please try again.",
        });

        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "❌ An unexpected error occurred. Please try again.",
          timestamp: new Date(),
          status: "error",
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [sendAIMessage],
  );

  const startVoiceInput = useCallback(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported");
      return;
    }

    if (!recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    setIsListening(true);
    recognitionRef.current.start();
  }, []);

  const stopVoiceInput = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    input,
    setInput,
    isLoading,
    isListening,
    sendMessage,
    startVoiceInput,
    stopVoiceInput,
    clearMessages,
  };
}
