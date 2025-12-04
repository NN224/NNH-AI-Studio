"use client";

/**
 * ⚙️ SETTINGS TIER SECTION
 *
 * Collapsible section component for organizing settings by tier:
 * - Essential: Always visible
 * - Common: Collapsed by default
 * - Advanced: Hidden behind "Show Advanced" toggle
 */

import { useState } from "react";
import { ChevronDown, ChevronRight, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface SettingsTierSectionProps {
  tier: "essential" | "common" | "advanced";
  title: string;
  description?: string;
  icon?: React.ReactNode;
  defaultExpanded?: boolean;
  tooltip?: string;
  children: React.ReactNode;
}

export function SettingsTierSection({
  tier,
  title,
  description,
  icon,
  defaultExpanded = false,
  tooltip,
  children,
}: SettingsTierSectionProps) {
  const [isExpanded, setIsExpanded] = useState(
    tier === "essential" ? true : defaultExpanded,
  );

  // Essential tier is always expanded and can't be collapsed
  const canCollapse = tier !== "essential";

  const tierConfig = {
    essential: {
      badgeColor: "bg-green-500/10 text-green-600 border-green-500/20",
      cardBorder: "border-green-500/30",
    },
    common: {
      badgeColor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      cardBorder: "border-blue-500/20",
    },
    advanced: {
      badgeColor: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      cardBorder: "border-purple-500/20",
    },
  };

  const config = tierConfig[tier];

  return (
    <Card
      className={cn(
        "transition-all",
        config.cardBorder,
        !isExpanded && "opacity-70 hover:opacity-100",
      )}
    >
      <CardHeader
        className={cn("cursor-pointer", canCollapse && "hover:bg-accent/50")}
        onClick={() => canCollapse && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            {canCollapse && (
              <div className="text-muted-foreground">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            )}

            {icon && <div className="text-primary">{icon}</div>}

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{title}</CardTitle>
                <Badge
                  variant="outline"
                  className={cn("text-xs", config.badgeColor)}
                >
                  {tier === "essential" && "Essential"}
                  {tier === "common" && "Common"}
                  {tier === "advanced" && "Advanced"}
                </Badge>
              </div>
              {description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {description}
                </p>
              )}
            </div>

            {tooltip && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">{tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}
