import { useState, useCallback, useRef } from "react";
import { Message } from "@/lib/types/chat-types";

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
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            conversationHistory: messages.slice(-5), // Last 5 messages for context
          }),
        });

        if (!response.ok) throw new Error("Failed to get response");

        const data = await response.json();

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.message || "I apologize, but I encountered an error.",
          timestamp: new Date(),
          status: "delivered",
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        console.error("Chat error:", error);
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
      }
    },
    [messages],
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
