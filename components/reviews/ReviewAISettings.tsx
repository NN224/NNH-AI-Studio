"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Save, Settings, TestTube, TrendingUp, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface ReviewAISettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId?: string; // Reserved for future use
}

export function ReviewAISettings({
  open,
  onOpenChange,
  locationId: _locationId,
}: ReviewAISettingsProps) {
  const t = useTranslations("Reviews.AISettings");

  const [settings, setSettings] = useState({
    enabled: false,
    confidence_threshold: 80,
    tone: "professional",
    language: "auto",
    response_length: "medium",
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSettingChange = (
    key: string,
    value: string | number | boolean,
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsLoading(true);
    // TODO: Save settings via API
    await new Promise((resolve) => setTimeout(resolve, 500));
    setHasChanges(false);
    setIsLoading(false);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            {t("title")}
          </SheetTitle>
          <SheetDescription>{t("description")}</SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="settings" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 ml-2" />
              {t("tabs.settings")}
            </TabsTrigger>
            <TabsTrigger value="stats">
              <TrendingUp className="w-4 h-4 ml-2" />
              {t("tabs.stats")}
            </TabsTrigger>
            <TabsTrigger value="test">
              <TestTube className="w-4 h-4 ml-2" />
              {t("tabs.test")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-6 mt-4">
            {/* التفعيل الرئيسي */}
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">{t("enabled")}</h3>
                  {settings.enabled && (
                    <Badge variant="default" className="gap-1">
                      <Bot className="w-3 h-3" />
                      {t("enabledBadge")}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {t("autoReplyDescription")}
                </p>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(enabled) =>
                  handleSettingChange("enabled", enabled)
                }
                disabled={isLoading}
              />
            </div>

            <Separator />

            {/* حد الثقة */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">
                  {t("confidenceThreshold")}
                </Label>
                <Badge variant="outline" className="text-lg font-bold">
                  {settings.confidence_threshold}%
                </Badge>
              </div>
              <Slider
                value={[settings.confidence_threshold]}
                onValueChange={([value]) =>
                  handleSettingChange("confidence_threshold", value)
                }
                min={50}
                max={100}
                step={5}
                disabled={isLoading || !settings.enabled}
                className="py-4"
              />
              <p className="text-xs text-gray-500">
                {t("confidenceDescription")}
              </p>
            </div>

            <Separator />

            {/* أسلوب الرد */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">{t("tone")}</Label>
              <RadioGroup
                value={settings.tone}
                onValueChange={(value) => handleSettingChange("tone", value)}
                disabled={isLoading || !settings.enabled}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2 space-x-reverse p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem
                    value="professional"
                    id="review-professional"
                  />
                  <Label
                    htmlFor="review-professional"
                    className="flex-1 cursor-pointer"
                  >
                    <span className="font-medium">
                      {t("tones.professional")}
                    </span>
                    <p className="text-xs text-gray-500">
                      {t("tones.professionalDesc")}
                    </p>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="friendly" id="review-friendly" />
                  <Label
                    htmlFor="review-friendly"
                    className="flex-1 cursor-pointer"
                  >
                    <span className="font-medium">{t("tones.friendly")}</span>
                    <p className="text-xs text-gray-500">
                      {t("tones.friendlyDesc")}
                    </p>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="thankful" id="review-thankful" />
                  <Label
                    htmlFor="review-thankful"
                    className="flex-1 cursor-pointer"
                  >
                    <span className="font-medium">{t("tones.thankful")}</span>
                    <p className="text-xs text-gray-500">
                      {t("tones.thankfulDesc")}
                    </p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            {/* طول الرد */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                {t("responseLength")}
              </Label>
              <RadioGroup
                value={settings.response_length}
                onValueChange={(value) =>
                  handleSettingChange("response_length", value)
                }
                disabled={isLoading || !settings.enabled}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2 space-x-reverse p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="short" id="length-short" />
                  <Label
                    htmlFor="length-short"
                    className="flex-1 cursor-pointer"
                  >
                    <span className="font-medium">{t("lengths.short")}</span>
                    <p className="text-xs text-gray-500">
                      {t("lengths.shortDesc")}
                    </p>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="medium" id="length-medium" />
                  <Label
                    htmlFor="length-medium"
                    className="flex-1 cursor-pointer"
                  >
                    <span className="font-medium">{t("lengths.medium")}</span>
                    <p className="text-xs text-gray-500">
                      {t("lengths.mediumDesc")}
                    </p>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="detailed" id="length-detailed" />
                  <Label
                    htmlFor="length-detailed"
                    className="flex-1 cursor-pointer"
                  >
                    <span className="font-medium">{t("lengths.detailed")}</span>
                    <p className="text-xs text-gray-500">
                      {t("lengths.detailedDesc")}
                    </p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            {/* اللغة */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">{t("language")}</Label>
              <RadioGroup
                value={settings.language}
                onValueChange={(value) =>
                  handleSettingChange("language", value)
                }
                disabled={isLoading || !settings.enabled}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2 space-x-reverse p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="auto" id="lang-auto" />
                  <Label htmlFor="lang-auto" className="flex-1 cursor-pointer">
                    <span className="font-medium">{t("languages.auto")}</span>
                    <p className="text-xs text-gray-500">
                      {t("languages.autoDesc")}
                    </p>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="ar" id="lang-ar" />
                  <Label htmlFor="lang-ar" className="flex-1 cursor-pointer">
                    <span className="font-medium">{t("languages.ar")}</span>
                    <p className="text-xs text-gray-500">
                      {t("languages.arDesc")}
                    </p>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="en" id="lang-en" />
                  <Label htmlFor="lang-en" className="flex-1 cursor-pointer">
                    <span className="font-medium">{t("languages.en")}</span>
                    <p className="text-xs text-gray-500">
                      {t("languages.enDesc")}
                    </p>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </TabsContent>

          <TabsContent value="stats" className="mt-4">
            <div className="text-center py-8 text-gray-500">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>{t("statsComingSoon")}</p>
            </div>
          </TabsContent>

          <TabsContent value="test" className="mt-4">
            <div className="text-center py-8 text-gray-500">
              <TestTube className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>{t("testComingSoon")}</p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Action buttons */}
        <div className="flex gap-2 mt-6 pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isLoading}
            className="flex-1 gap-2"
          >
            <Save className="w-4 h-4" />
            {t("saveChanges")}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="gap-2"
          >
            <X className="w-4 h-4" />
            {t("cancel")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
