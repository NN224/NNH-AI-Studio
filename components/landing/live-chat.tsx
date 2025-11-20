"use client";

import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
}

export function LiveChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hi! 👋 I'm your AI assistant. How can I help you today?",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const quickReplies = [
    "How does pricing work?",
    "Can I try it for free?",
    "How does AI work?",
    "Book a demo",
  ];

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const botResponse = getBotResponse(inputValue);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
      setIsTyping(false);
    }, 1000);
  };

  const getBotResponse = (input: string): string => {
    const lowerInput = input.toLowerCase();

    if (lowerInput.includes("price") || lowerInput.includes("cost")) {
      return "We offer 3 plans: Free (perfect for trying), Pro ($49/mo), and Enterprise ($199/mo). All paid plans include a 14-day free trial! 💰";
    }
    if (lowerInput.includes("free") || lowerInput.includes("trial")) {
      return "Yes! We offer a completely free plan with 1 location and 50 AI responses/month. Plus, all paid plans come with a 14-day free trial - no credit card required! 🎉";
    }
    if (lowerInput.includes("ai") || lowerInput.includes("work")) {
      return "Our AI analyzes your reviews and questions, then generates personalized, human-like responses based on your business tone. You can review and approve responses before they're posted! 🤖";
    }
    if (lowerInput.includes("demo") || lowerInput.includes("book")) {
      return "I'd love to show you a demo! Please click 'Get Started' to sign up, or email us at demo@nnhstudio.com to schedule a personalized walkthrough. 📅";
    }
    if (lowerInput.includes("location")) {
      return "Free plan: 1 location, Pro: 5 locations, Enterprise: unlimited locations. You can easily upgrade as your business grows! 📍";
    }
    if (lowerInput.includes("support")) {
      return "We offer email support for Free users, priority support for Pro, and 24/7 dedicated support for Enterprise customers. We're here to help! 🎧";
    }

    return "That's a great question! For detailed information, please check our FAQ section or sign up for a free trial. You can also email us at support@nnhstudio.com. 😊";
  };

  const handleQuickReply = (reply: string) => {
    setInputValue(reply);
    handleSend();
  };

  return (
    <>
      {/* Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/50 z-50 hover:shadow-orange-500/70 transition-shadow"
          >
            <MessageCircle className="w-8 h-8 text-white" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 w-96 h-[600px] bg-gradient-to-br from-gray-900 to-black border border-orange-500/30 rounded-2xl shadow-2xl shadow-orange-500/20 z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">AI Assistant</h3>
                  <p className="text-xs text-orange-100">
                    Online • Instant replies
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${
                    message.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      message.sender === "user"
                        ? "bg-orange-500 text-white"
                        : "bg-gray-800 text-gray-100"
                    }`}
                  >
                    <p className="text-sm">{message.text}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </motion.div>
              ))}

              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-gray-800 rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      />
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Replies */}
            {messages.length <= 2 && (
              <div className="px-4 pb-2">
                <p className="text-xs text-gray-400 mb-2">Quick questions:</p>
                <div className="flex flex-wrap gap-2">
                  {quickReplies.map((reply, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuickReply(reply)}
                      className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-full transition-colors"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-gray-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Type your message..."
                  className="flex-1 bg-gray-800 text-white rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  className="bg-orange-500 hover:bg-orange-600 rounded-full w-10 h-10 p-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
