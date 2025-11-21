"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Bot, Zap, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

export type AIProvider = "openai" | "anthropic" | "groq" | "deepseek";

interface AIProviderConfig {
  id: AIProvider;
  name: string;
  icon: React.ReactNode;
  description: string;
  speed: "fast" | "medium" | "slow";
  quality: "high" | "medium" | "good";
  cost: "high" | "medium" | "low";
}

const providers: AIProviderConfig[] = [
  {
    id: "openai",
    name: "OpenAI GPT-4",
    icon: <Bot className="h-4 w-4" />,
    description: "Most capable, best for complex tasks",
    speed: "medium",
    quality: "high",
    cost: "high",
  },
  {
    id: "anthropic",
    name: "Claude 3",
    icon: <Brain className="h-4 w-4" />,
    description: "Great for long conversations",
    speed: "medium",
    quality: "high",
    cost: "high",
  },
  {
    id: "groq",
    name: "Groq Mixtral",
    icon: <Zap className="h-4 w-4" />,
    description: "Lightning fast responses",
    speed: "fast",
    quality: "good",
    cost: "low",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    icon: <Sparkles className="h-4 w-4" />,
    description: "Cost-effective alternative",
    speed: "medium",
    quality: "good",
    cost: "low",
  },
];

interface AIProviderSelectorProps {
  value: AIProvider;
  onChange: (provider: AIProvider) => void;
  className?: string;
  showDetails?: boolean;
}

export function AIProviderSelector({
  value,
  onChange,
  className,
  showDetails = false,
}: AIProviderSelectorProps) {
  const [availableProviders, setAvailableProviders] = useState<AIProvider[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ai/chat/enhanced")
      .then((res) => res.json())
      .then((data) => {
        setAvailableProviders(data.availableProviders || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const selectedProvider =
    providers.find((p) => p.id === value) || providers[0];

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Sparkles className="h-4 w-4 animate-spin" />
        <span>Loading AI providers...</span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Select value={value} onValueChange={(v) => onChange(v as AIProvider)}>
        <SelectTrigger className="w-full bg-zinc-800 border-zinc-700">
          <SelectValue>
            <div className="flex items-center gap-2">
              {selectedProvider.icon}
              <span>{selectedProvider.name}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-zinc-900 border-zinc-800">
          {providers.map((provider) => {
            const isAvailable = availableProviders.includes(provider.id);
            return (
              <SelectItem
                key={provider.id}
                value={provider.id}
                disabled={!isAvailable}
                className={cn(
                  "cursor-pointer",
                  !isAvailable && "opacity-50 cursor-not-allowed",
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    {provider.icon}
                    <span>{provider.name}</span>
                  </div>
                  {!isAvailable && (
                    <Badge variant="outline" className="text-xs ml-2">
                      Not configured
                    </Badge>
                  )}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {showDetails && (
        <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700 space-y-2">
          <p className="text-xs text-zinc-400">
            {selectedProvider.description}
          </p>
          <div className="flex gap-4 text-xs">
            <span>
              Speed:{" "}
              <span
                className={
                  selectedProvider.speed === "fast"
                    ? "text-green-400"
                    : "text-yellow-400"
                }
              >
                {selectedProvider.speed}
              </span>
            </span>
            <span>
              Quality:{" "}
              <span
                className={
                  selectedProvider.quality === "high"
                    ? "text-green-400"
                    : "text-blue-400"
                }
              >
                {selectedProvider.quality}
              </span>
            </span>
            <span>
              Cost:{" "}
              <span
                className={
                  selectedProvider.cost === "low"
                    ? "text-green-400"
                    : "text-yellow-400"
                }
              >
                {selectedProvider.cost}
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function useAIProvider() {
  const [provider, setProvider] = useState<AIProvider>("openai");
  const [availableProviders, setAvailableProviders] = useState<AIProvider[]>(
    [],
  );

  useEffect(() => {
    fetch("/api/ai/chat/enhanced")
      .then((res) => res.json())
      .then((data) => {
        const available = data.availableProviders || [];
        setAvailableProviders(available);
        if (available.length > 0 && !available.includes(provider)) {
          setProvider(available[0]);
        }
      })
      .catch(console.error);
  }, []);

  return { provider, setProvider, availableProviders };
}
