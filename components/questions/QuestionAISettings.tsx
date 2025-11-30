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
import { useAutoAnswerSettings } from "@/hooks/use-auto-answer-settings";
import { Bot, Save, Settings, TestTube, TrendingUp, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface QuestionAISettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId?: string;
}

export function QuestionAISettings({
  open,
  onOpenChange,
  locationId,
}: QuestionAISettingsProps) {
  const t = useTranslations("Questions.AISettings");
  const { settings, updateSettings, isLoading } =
    useAutoAnswerSettings(locationId);
  const [hasChanges, setHasChanges] = useState(false);

  const handleSettingChange = (
    key: string,
    value: string | number | boolean,
  ) => {
    updateSettings({ [key]: value });
    setHasChanges(true);
  };

  const handleSave = async () => {
    // Settings are saved automatically via the hook
    setHasChanges(false);
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
                checked={settings.enabled || false}
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
                  {settings.confidence_threshold || 80}%
                </Badge>
              </div>
              <Slider
                value={[settings.confidence_threshold || 80]}
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

            {/* أنواع الأسئلة */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                {t("questionTypes")}
              </Label>

              <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label className="font-medium">{t("types.hours")}</Label>
                    <p className="text-xs text-gray-500">
                      {t("types.hoursDesc")}
                    </p>
                  </div>
                  <Switch
                    checked={settings.answer_hours_questions ?? true}
                    onCheckedChange={(value) =>
                      handleSettingChange("answer_hours_questions", value)
                    }
                    disabled={isLoading || !settings.enabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label className="font-medium">{t("types.location")}</Label>
                    <p className="text-xs text-gray-500">
                      {t("types.locationDesc")}
                    </p>
                  </div>
                  <Switch
                    checked={settings.answer_location_questions ?? true}
                    onCheckedChange={(value) =>
                      handleSettingChange("answer_location_questions", value)
                    }
                    disabled={isLoading || !settings.enabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label className="font-medium">{t("types.services")}</Label>
                    <p className="text-xs text-gray-500">
                      {t("types.servicesDesc")}
                    </p>
                  </div>
                  <Switch
                    checked={settings.answer_services_questions ?? true}
                    onCheckedChange={(value) =>
                      handleSettingChange("answer_services_questions", value)
                    }
                    disabled={isLoading || !settings.enabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label className="font-medium">{t("types.pricing")}</Label>
                    <p className="text-xs text-gray-500">
                      {t("types.pricingDesc")}
                    </p>
                  </div>
                  <Switch
                    checked={settings.answer_pricing_questions ?? false}
                    onCheckedChange={(value) =>
                      handleSettingChange("answer_pricing_questions", value)
                    }
                    disabled={isLoading || !settings.enabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label className="font-medium">{t("types.general")}</Label>
                    <p className="text-xs text-gray-500">
                      {t("types.generalDesc")}
                    </p>
                  </div>
                  <Switch
                    checked={settings.answer_general_questions ?? true}
                    onCheckedChange={(value) =>
                      handleSettingChange("answer_general_questions", value)
                    }
                    disabled={isLoading || !settings.enabled}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* أسلوب الرد */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">{t("tone")}</Label>
              <RadioGroup
                value={settings.tone || "professional"}
                onValueChange={(value) => handleSettingChange("tone", value)}
                disabled={isLoading || !settings.enabled}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2 space-x-reverse p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="professional" id="professional" />
                  <Label
                    htmlFor="professional"
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
                  <RadioGroupItem value="friendly" id="friendly" />
                  <Label htmlFor="friendly" className="flex-1 cursor-pointer">
                    <span className="font-medium">{t("tones.friendly")}</span>
                    <p className="text-xs text-gray-500">
                      {t("tones.friendlyDesc")}
                    </p>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="casual" id="casual" />
                  <Label htmlFor="casual" className="flex-1 cursor-pointer">
                    <span className="font-medium">{t("tones.casual")}</span>
                    <p className="text-xs text-gray-500">
                      {t("tones.casualDesc")}
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
