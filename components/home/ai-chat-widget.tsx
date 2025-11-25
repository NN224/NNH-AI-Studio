"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAIChat } from "@/hooks/features/use-ai-chat";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatInput } from "@/components/chat/ChatInput";

export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    messages,
    input,
    setInput,
    isLoading,
    isListening,
    sendMessage,
    startVoiceInput,
    stopVoiceInput,
  } = useAIChat();

  const handleSend = () => {
    if (input.trim()) {
      sendMessage(input);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Button
          size="lg"
          onClick={() => setIsOpen(!isOpen)}
          className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-br from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      </motion.div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-[400px] h-[600px] max-w-[calc(100vw-3rem)] max-h-[calc(100vh-8rem)]"
          >
            <Card className="h-full flex flex-col shadow-2xl">
              <ChatHeader onClose={() => setIsOpen(false)} />
              <ChatMessages messages={messages} isLoading={isLoading} />
              <ChatInput
                input={input}
                setInput={setInput}
                onSend={handleSend}
                isLoading={isLoading}
                isListening={isListening}
                onStartVoice={startVoiceInput}
                onStopVoice={stopVoiceInput}
              />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
