'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, Settings, TrendingUp, TestTube, Save, X } from 'lucide-react';

interface ReviewAISettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId?: string;
}

export function ReviewAISettings({
  open,
  onOpenChange,
  locationId,
}: ReviewAISettingsProps) {
  const [settings, setSettings] = useState({
    enabled: false,
    confidence_threshold: 80,
    tone: 'professional',
    language: 'auto',
    response_length: 'medium',
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsLoading(true);
    // TODO: Save settings via API
    await new Promise(resolve => setTimeout(resolve, 500));
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
            إعدادات AI للمراجعات
          </SheetTitle>
          <SheetDescription>
            تخصيص كيفية رد النظام تلقائياً على مراجعات العملاء
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="settings" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 ml-2" />
              الإعدادات
            </TabsTrigger>
            <TabsTrigger value="stats">
              <TrendingUp className="w-4 h-4 ml-2" />
              الإحصائيات
            </TabsTrigger>
            <TabsTrigger value="test">
              <TestTube className="w-4 h-4 ml-2" />
              الاختبار
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-6 mt-4">
            {/* التفعيل الرئيسي */}
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">تفعيل الرد التلقائي</h3>
                  {settings.enabled && (
                    <Badge variant="default" className="gap-1">
                      <Bot className="w-3 h-3" />
                      مفعّل
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  الرد على المراجعات تلقائياً خلال دقيقتين
                </p>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(enabled) => handleSettingChange('enabled', enabled)}
                disabled={isLoading}
              />
            </div>

            <Separator />

            {/* حد الثقة */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">حد الثقة</Label>
                <Badge variant="outline" className="text-lg font-bold">
                  {settings.confidence_threshold}%
                </Badge>
              </div>
              <Slider
                value={[settings.confidence_threshold]}
                onValueChange={([value]) => handleSettingChange('confidence_threshold', value)}
                min={50}
                max={100}
                step={5}
                disabled={isLoading || !settings.enabled}
                className="py-4"
              />
              <p className="text-xs text-gray-500">
                المراجعات بدرجة ثقة أقل من هذا الحد ستحتاج لمراجعتك اليدوية
              </p>
            </div>

            <Separator />

            {/* أسلوب الرد */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">أسلوب الرد</Label>
              <RadioGroup
                value={settings.tone}
                onValueChange={(value) => handleSettingChange('tone', value)}
                disabled={isLoading || !settings.enabled}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2 space-x-reverse p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="professional" id="review-professional" />
                  <Label htmlFor="review-professional" className="flex-1 cursor-pointer">
                    <span className="font-medium">احترافي</span>
                    <p className="text-xs text-gray-500">رسمي ومهني</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="friendly" id="review-friendly" />
                  <Label htmlFor="review-friendly" className="flex-1 cursor-pointer">
                    <span className="font-medium">ودود</span>
                    <p className="text-xs text-gray-500">دافئ ومرحب</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="thankful" id="review-thankful" />
                  <Label htmlFor="review-thankful" className="flex-1 cursor-pointer">
                    <span className="font-medium">شاكر</span>
                    <p className="text-xs text-gray-500">ممتن ومقدّر</p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            {/* طول الرد */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">طول الرد</Label>
              <RadioGroup
                value={settings.response_length}
                onValueChange={(value) => handleSettingChange('response_length', value)}
                disabled={isLoading || !settings.enabled}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2 space-x-reverse p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="short" id="length-short" />
                  <Label htmlFor="length-short" className="flex-1 cursor-pointer">
                    <span className="font-medium">قصير</span>
                    <p className="text-xs text-gray-500">1-2 جمل</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="medium" id="length-medium" />
                  <Label htmlFor="length-medium" className="flex-1 cursor-pointer">
                    <span className="font-medium">متوسط</span>
                    <p className="text-xs text-gray-500">2-3 جمل</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="detailed" id="length-detailed" />
                  <Label htmlFor="length-detailed" className="flex-1 cursor-pointer">
                    <span className="font-medium">مفصّل</span>
                    <p className="text-xs text-gray-500">3-5 جمل</p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            {/* اللغة */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">لغة الرد</Label>
              <RadioGroup
                value={settings.language}
                onValueChange={(value) => handleSettingChange('language', value)}
                disabled={isLoading || !settings.enabled}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2 space-x-reverse p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="auto" id="lang-auto" />
                  <Label htmlFor="lang-auto" className="flex-1 cursor-pointer">
                    <span className="font-medium">تلقائي</span>
                    <p className="text-xs text-gray-500">نفس لغة المراجعة</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="ar" id="lang-ar" />
                  <Label htmlFor="lang-ar" className="flex-1 cursor-pointer">
                    <span className="font-medium">العربية</span>
                    <p className="text-xs text-gray-500">دائماً بالعربية</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="en" id="lang-en" />
                  <Label htmlFor="lang-en" className="flex-1 cursor-pointer">
                    <span className="font-medium">English</span>
                    <p className="text-xs text-gray-500">Always in English</p>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </TabsContent>

          <TabsContent value="stats" className="mt-4">
            <div className="text-center py-8 text-gray-500">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>الإحصائيات ستظهر هنا قريباً</p>
            </div>
          </TabsContent>

          <TabsContent value="test" className="mt-4">
            <div className="text-center py-8 text-gray-500">
              <TestTube className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>أداة الاختبار ستكون متاحة قريباً</p>
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
            حفظ التغييرات
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="gap-2"
          >
            <X className="w-4 h-4" />
            إلغاء
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
