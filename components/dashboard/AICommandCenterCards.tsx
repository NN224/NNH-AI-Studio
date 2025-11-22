"use client";

import { Bot, Zap, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function AICommandCenterCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Simple Workflow */}
      <Card className="bg-zinc-900/50 border-zinc-800 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardContent className="p-6 relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <Zap className="h-6 w-6 text-green-500" />
            </div>
            <div className="px-2 py-1 bg-green-500/20 rounded text-xs text-green-400 font-medium">
              Active
            </div>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Simple Workflow
          </h3>
          <p className="text-sm text-zinc-400 mb-4">
            Automate your daily tasks with our streamlined AI assistant.
          </p>
          <Button
            variant="outline"
            className="w-full border-zinc-700 hover:bg-zinc-800 text-zinc-300 hover:text-white group-hover:border-green-500/50 transition-colors"
          >
            Launch <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Advanced Workflow */}
      <Card className="bg-zinc-900/50 border-zinc-800 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardContent className="p-6 relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Bot className="h-6 w-6 text-blue-500" />
            </div>
            <div className="px-2 py-1 bg-blue-500/20 rounded text-xs text-blue-400 font-medium">
              Pro
            </div>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Advanced Workflow
          </h3>
          <p className="text-sm text-zinc-400 mb-4">
            Deep analysis and complex automation for power users.
          </p>
          <Button
            variant="outline"
            className="w-full border-zinc-700 hover:bg-zinc-800 text-zinc-300 hover:text-white group-hover:border-blue-500/50 transition-colors"
          >
            Launch <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
