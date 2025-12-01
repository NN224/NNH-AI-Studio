"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, FileDown, Check } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { logger } from "@/lib/utils/logger";

interface ExportShareBarProps {
  getShareParams: () => Record<string, string | number | undefined>;
  printRootSelector?: string; // CSS selector for print root, default: '[data-print-root]'
}

export function ExportShareBar({
  getShareParams,
  printRootSelector = "[data-print-root]",
}: ExportShareBarProps) {
  const [copied, setCopied] = useState(false);
  const printing = useRef(false);

  const handleExportPDF = async () => {
    try {
      // Native print flow: users can Save as PDF
      printing.current = true;
      window.print();
      setTimeout(() => {
        printing.current = false;
      }, 1000);
    } catch (e) {
      logger.error(
        "Print error",
        e instanceof Error ? e : new Error(String(e)),
      );
      toast.error("Export failed");
    }
  };

  const handleShare = async () => {
    try {
      const url = new URL(window.location.href);
      const params = getShareParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      });
      const shareUrl = url.toString();
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Share link copied");
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      logger.error(
        "Share link error",
        e instanceof Error ? e : new Error(String(e)),
      );
      toast.error("Failed to copy link");
    }
  };

  return (
    <Card className="p-4 flex items-center justify-between border border-muted/50">
      <div className="text-sm text-muted-foreground">
        Export the report or share with your team
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleShare}>
          {copied ? (
            <Check className="w-4 h-4 mr-2" />
          ) : (
            <Share2 className="w-4 h-4 mr-2" />
          )}
          {copied ? "Copied" : "Copy Link"}
        </Button>
        <Button size="sm" onClick={handleExportPDF}>
          <FileDown className="w-4 h-4 mr-2" />
          Export PDF
        </Button>
      </div>
    </Card>
  );
}
