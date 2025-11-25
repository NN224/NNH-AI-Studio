"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Mic, MicOff } from "lucide-react";
import { KeyboardEvent } from "react";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  isListening: boolean;
  onStartVoice: () => void;
  onStopVoice: () => void;
}

export function ChatInput({
  input,
  setInput,
  onSend,
  isLoading,
  isListening,
  onStartVoice,
  onStopVoice,
}: ChatInputProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && input.trim()) {
        onSend();
      }
    }
  };

  return (
    <div className="p-4 border-t bg-background">
      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          className="min-h-[60px] max-h-[120px] resize-none"
          disabled={isLoading}
        />
        <div className="flex flex-col gap-2">
          <Button
            size="icon"
            onClick={isListening ? onStopVoice : onStartVoice}
            variant={isListening ? "destructive" : "outline"}
            disabled={isLoading}
          >
            {isListening ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </Button>
          <Button
            size="icon"
            onClick={onSend}
            disabled={isLoading || !input.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
