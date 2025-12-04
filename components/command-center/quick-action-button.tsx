"use client";

/**
 * ⚡ QUICK ACTION BUTTON COMPONENT
 *
 * Shows actionable buttons in chat messages
 * with icons and primary/secondary variants
 */

import { Button } from "@/components/ui/button";
import {
  Check,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  MessageSquare,
  Zap,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

interface QuickActionButtonProps {
  label: string;
  icon?: string;
  primary?: boolean;
  onClick: () => void;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function QuickActionButton({
  label,
  icon,
  primary,
  onClick,
}: QuickActionButtonProps) {
  const getIcon = () => {
    switch (icon) {
      case "check":
        return <Check className="h-3.5 w-3.5" />;
      case "alert":
        return <AlertTriangle className="h-3.5 w-3.5" />;
      case "chart":
        return <TrendingUp className="h-3.5 w-3.5" />;
      case "sparkles":
        return <Sparkles className="h-3.5 w-3.5" />;
      case "message":
        return <MessageSquare className="h-3.5 w-3.5" />;
      case "zap":
        return <Zap className="h-3.5 w-3.5" />;
      default:
        return <ChevronRight className="h-3.5 w-3.5" />;
    }
  };

  return (
    <Button
      size="sm"
      variant={primary ? "default" : "outline"}
      onClick={onClick}
      className={cn(
        "gap-1.5 text-xs",
        primary &&
          "bg-gradient-to-r from-orange-500 to-purple-500 hover:from-orange-600 hover:to-purple-600",
      )}
    >
      {getIcon()}
      {label}
    </Button>
  );
}
