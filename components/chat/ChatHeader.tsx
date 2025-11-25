"use client";

import { Button } from "@/components/ui/button";
import { X, Bot, Sparkles } from "lucide-react";

interface ChatHeaderProps {
  onClose: () => void;
}

export function ChatHeader({ onClose }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-500/10 to-blue-500/10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            AI Assistant
            <Sparkles className="w-4 h-4 text-purple-500" />
          </h3>
          <p className="text-xs text-muted-foreground">Always here to help</p>
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={onClose}>
        <X className="w-5 h-5" />
      </Button>
    </div>
  );
}
