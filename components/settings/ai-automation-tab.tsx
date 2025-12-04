"use client";

import { t } from "@/lib/i18n/stub";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Brain, Zap, Clock, CheckCircle, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SettingsTierSection } from "./settings-tier-section";

interface AIAutomationTabProps {
  aiResponseTone: string;
  setAiResponseTone: (value: string) => void;
  autoReply: boolean;
  setAutoReply: (value: boolean) => void;
  responseLength: string;
  setResponseLength: (value: string) => void;
  creativityLevel: string;
  setCreativityLevel: (value: string) => void;
}

export function AIAutomationTab({
  aiResponseTone,
  setAiResponseTone,
  autoReply,
  setAutoReply,
  responseLength,
  setResponseLength,
  creativityLevel,
  setCreativityLevel,
}: AIAutomationTabProps) {
  return (
    <div className="space-y-6">
      {/* Essential Settings - Always Visible */}
      <SettingsTierSection
        tier="essential"
        title={t("responseGeneration.title")}
        description={t("responseGeneration.description")}
        icon={<Sparkles className="h-5 w-5" />}
        tooltip="Core settings you'll use most often"
      >
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-reply" className="flex items-center gap-2">
                {t("autoReply")}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">
                        {t("responseGeneration.autoReplyTooltip")}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Switch
                id="auto-reply"
                checked={autoReply}
                onCheckedChange={setAutoReply}
              />
            </div>
            {autoReply && (
              <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {t("responseGeneration.autoReplyEnabled")}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label htmlFor="ai-tone">{t("responseTone")}</Label>
            <Select value={aiResponseTone} onValueChange={setAiResponseTone}>
              <SelectTrigger className="bg-secondary border-primary/30">
                <SelectValue
                  placeholder={t("responseGeneration.tonePlaceholder")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span>{t("responseGeneration.tones.professional")}</span>
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {t("responseGeneration.recommended")}
                    </Badge>
                  </div>
                </SelectItem>
                <SelectItem value="friendly">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span>{t("responseGeneration.tones.friendly")}</span>
                  </div>
                </SelectItem>
                <SelectItem value="casual">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-yellow-500" />
                    <span>{t("responseGeneration.tones.casual")}</span>
                  </div>
                </SelectItem>
                <SelectItem value="formal">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-purple-500" />
                    <span>{t("responseGeneration.tones.formal")}</span>
                  </div>
                </SelectItem>
                <SelectItem value="empathetic">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-pink-500" />
                    <span>{t("responseGeneration.tones.empathetic")}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="p-3 bg-secondary/50 rounded-lg border border-primary/20">
              <p className="text-sm text-muted-foreground">
                {aiResponseTone === "professional" &&
                  t("responseGeneration.toneDescriptions.professional")}
                {aiResponseTone === "friendly" &&
                  t("responseGeneration.toneDescriptions.friendly")}
                {aiResponseTone === "casual" &&
                  t("responseGeneration.toneDescriptions.casual")}
                {aiResponseTone === "formal" &&
                  t("responseGeneration.toneDescriptions.formal")}
                {aiResponseTone === "empathetic" &&
                  t("responseGeneration.toneDescriptions.empathetic")}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="response-length">{t("responseLength")}</Label>
            <Select value={responseLength} onValueChange={setResponseLength}>
              <SelectTrigger className="bg-secondary border-primary/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brief">
                  {t("responseGeneration.lengths.brief")}
                </SelectItem>
                <SelectItem value="medium">
                  {t("responseGeneration.lengths.medium")}
                </SelectItem>
                <SelectItem value="detailed">
                  {t("responseGeneration.lengths.detailed")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SettingsTierSection>

      {/* Common Settings - Collapsed by Default */}
      <SettingsTierSection
        tier="common"
        title="Fine-Tuning Options"
        description="Additional controls for response customization"
        icon={<Brain className="h-5 w-5" />}
        defaultExpanded={false}
        tooltip="Adjust these settings for more control over AI responses"
      >
        <div className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="creativity">{t("creativityLevel")}</Label>
            <Select value={creativityLevel} onValueChange={setCreativityLevel}>
              <SelectTrigger className="bg-secondary border-primary/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">
                  {t("responseGeneration.creativityLevels.low")}
                </SelectItem>
                <SelectItem value="medium">
                  {t("responseGeneration.creativityLevels.medium")}
                </SelectItem>
                <SelectItem value="high">
                  {t("responseGeneration.creativityLevels.high")}
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t("responseGeneration.creativityHint")}
            </p>
          </div>

          {/* AI Features Status */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              {t("features.title")}
            </Label>
            <p className="text-sm text-muted-foreground mb-4">
              {t("features.description")}
            </p>
            <div className="flex items-start gap-3 p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {t("features.smartReview")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("features.smartReviewDesc")}
                </p>
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                {t("features.active")}
              </Badge>
            </div>

            <div className="flex items-start gap-3 p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {t("features.sentimentAnalysis")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("features.sentimentAnalysisDesc")}
                </p>
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                {t("features.active")}
              </Badge>
            </div>

            <div className="flex items-start gap-3 p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {t("features.contentOptimization")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("features.contentOptimizationDesc")}
                </p>
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                {t("features.active")}
              </Badge>
            </div>

            <div className="flex items-start gap-3 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
              <Clock className="h-4 w-4 text-yellow-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {t("features.postScheduling")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("features.postSchedulingDesc")}
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {t("features.comingSoon")}
              </Badge>
            </div>

            <div className="flex items-start gap-3 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
              <Clock className="h-4 w-4 text-yellow-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {t("features.predictiveInsights")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("features.predictiveInsightsDesc")}
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {t("features.comingSoon")}
              </Badge>
            </div>
          </div>
        </div>
      </SettingsTierSection>

      {/* Advanced Settings - Hidden by Default */}
      <SettingsTierSection
        tier="advanced"
        title={t("provider.title")}
        description={t("provider.description")}
        icon={<Zap className="h-5 w-5" />}
        defaultExpanded={false}
        tooltip="Advanced configuration for AI providers and models"
      >
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>{t("provider.activeProviders")}</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-secondary/50 rounded border border-primary/20">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                    1
                  </Badge>
                  <span className="text-sm">Groq</span>
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                  {t("provider.primary")}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-secondary/50 rounded border border-primary/20">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                    2
                  </Badge>
                  <span className="text-sm">DeepSeek</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {t("provider.fallback")}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-secondary/50 rounded border border-primary/20">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                    3
                  </Badge>
                  <span className="text-sm">Together AI</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {t("provider.fallback")}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-secondary/50 rounded border border-primary/20">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                    4
                  </Badge>
                  <span className="text-sm">OpenAI</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {t("provider.fallback")}
                </Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("provider.hint")}
            </p>
          </div>
        </div>
      </SettingsTierSection>
    </div>
  );
}
