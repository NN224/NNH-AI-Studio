"use client";

/**
 * 🧙‍♂️ QUICK SETUP WIZARD
 *
 * 3-step wizard for first-time users to configure essential AI settings.
 * Reduces setup time from 10 minutes to 2 minutes.
 *
 * Steps:
 * 1. Choose your tone (with business type detection)
 * 2. Configure response preferences
 * 3. Review and confirm
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  Brain,
  Zap,
  MessageSquare,
  Settings,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { SmartDefaults } from "@/lib/services/settings-defaults-service";

export interface QuickSetupWizardProps {
  userId: string;
  smartDefaults: SmartDefaults;
  reasoning: string;
  confidence: number;
  businessDNAScore?: number;
  onComplete: (settings: Partial<SmartDefaults>) => void;
  onSkip: () => void;
}

type Step = 1 | 2 | 3;

export function QuickSetupWizard({
  userId,
  smartDefaults,
  reasoning,
  confidence,
  businessDNAScore,
  onComplete,
  onSkip,
}: QuickSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [settings, setSettings] =
    useState<Partial<SmartDefaults>>(smartDefaults);

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep((currentStep + 1) as Step);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  const handleComplete = () => {
    onComplete(settings);
  };

  const toneOptions = [
    {
      value: "professional",
      label: "Professional",
      icon: "💼",
      description: "Clear, polite, and business-appropriate",
      color: "blue",
    },
    {
      value: "friendly",
      label: "Friendly",
      icon: "😊",
      description: "Warm, personable, and approachable",
      color: "green",
    },
    {
      value: "casual",
      label: "Casual",
      icon: "👋",
      description: "Relaxed and conversational",
      color: "yellow",
    },
    {
      value: "empathetic",
      label: "Empathetic",
      icon: "❤️",
      description: "Caring, understanding, and supportive",
      color: "pink",
    },
  ];

  const lengthOptions = [
    {
      value: "short",
      label: "Short",
      description: "Quick, 1-2 sentences",
      example: "Thanks for your review! We appreciate it.",
    },
    {
      value: "medium",
      label: "Medium",
      description: "Balanced, 2-3 sentences",
      example:
        "Thank you for your wonderful review! We're thrilled you enjoyed your experience. We look forward to serving you again soon.",
    },
    {
      value: "long",
      label: "Long",
      description: "Detailed, 3-4+ sentences",
      example:
        "Thank you so much for taking the time to leave us such a wonderful review! We're absolutely thrilled to hear that you enjoyed your experience with us. Our team works hard to provide the best service possible, and feedback like yours makes it all worthwhile. We can't wait to welcome you back soon!",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((step) => (
          <div
            key={step}
            className={`h-2 flex-1 rounded-full transition-all ${
              step <= currentStep
                ? "bg-gradient-to-r from-orange-500 to-purple-500"
                : "bg-zinc-800"
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Choose Tone */}
        {currentStep === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-6 w-6 text-orange-500" />
                  <Badge variant="outline" className="text-xs">
                    Step 1 of 3
                  </Badge>
                </div>
                <CardTitle>Choose Your Response Tone</CardTitle>
                <CardDescription>
                  {reasoning}
                  {confidence > 70 && (
                    <span className="text-green-600 font-medium ml-2">
                      ({confidence}% confidence)
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {toneOptions.map((option) => (
                  <div
                    key={option.value}
                    onClick={() =>
                      setSettings({
                        ...settings,
                        responseTone: option.value as any,
                      })
                    }
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      settings.responseTone === option.value
                        ? `border-${option.color}-500 bg-${option.color}-500/10`
                        : "border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{option.icon}</span>
                        <div>
                          <div className="font-semibold flex items-center gap-2">
                            {option.label}
                            {settings.responseTone === option.value && (
                              <Check className="h-4 w-4 text-green-500" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {option.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 2: Response Preferences */}
        {currentStep === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Settings className="h-6 w-6 text-purple-500" />
                  <Badge variant="outline" className="text-xs">
                    Step 2 of 3
                  </Badge>
                </div>
                <CardTitle>Configure Response Preferences</CardTitle>
                <CardDescription>
                  Choose how your AI should respond to reviews
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Response Length */}
                <div className="space-y-3">
                  <Label>Response Length</Label>
                  {lengthOptions.map((option) => (
                    <div
                      key={option.value}
                      onClick={() =>
                        setSettings({
                          ...settings,
                          responseLength: option.value as any,
                        })
                      }
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        settings.responseLength === option.value
                          ? "border-purple-500 bg-purple-500/10"
                          : "border-zinc-800 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold flex items-center gap-2">
                          {option.label}
                          {settings.responseLength === option.value && (
                            <Check className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {option.description}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground italic">
                        "{option.example}"
                      </p>
                    </div>
                  ))}
                </div>

                {/* Use Emojis */}
                <div className="flex items-center justify-between p-4 border-2 border-zinc-800 rounded-lg">
                  <div>
                    <Label>Include Emojis</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add emojis to make responses more friendly ✨
                    </p>
                  </div>
                  <Switch
                    checked={settings.includeEmojis}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, includeEmojis: checked })
                    }
                  />
                </div>

                {/* Use Business DNA */}
                {businessDNAScore && businessDNAScore >= 60 && (
                  <div className="flex items-center justify-between p-4 border-2 border-orange-500/30 bg-orange-500/5 rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4 text-orange-500" />
                        <Label>Use Business DNA</Label>
                        <Badge
                          variant="outline"
                          className="text-xs text-green-600 border-green-600"
                        >
                          {businessDNAScore}% Complete
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Personalize responses based on your business voice
                      </p>
                    </div>
                    <Switch
                      checked={settings.useBusinessDNA}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, useBusinessDNA: checked })
                      }
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 3: Review and Confirm */}
        {currentStep === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-6 w-6 text-green-500" />
                  <Badge variant="outline" className="text-xs">
                    Step 3 of 3
                  </Badge>
                </div>
                <CardTitle>Review Your Settings</CardTitle>
                <CardDescription>
                  You can always change these later in the settings page
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-zinc-900/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">
                      Response Tone
                    </p>
                    <p className="font-semibold capitalize">
                      {settings.responseTone}
                    </p>
                  </div>
                  <div className="p-4 bg-zinc-900/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">
                      Response Length
                    </p>
                    <p className="font-semibold capitalize">
                      {settings.responseLength}
                    </p>
                  </div>
                  <div className="p-4 bg-zinc-900/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">
                      Include Emojis
                    </p>
                    <p className="font-semibold">
                      {settings.includeEmojis ? "Yes" : "No"}
                    </p>
                  </div>
                  <div className="p-4 bg-zinc-900/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">
                      Use Business DNA
                    </p>
                    <p className="font-semibold">
                      {settings.useBusinessDNA ? "Yes" : "No"}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-semibold text-green-600">
                        Ready to Go!
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your AI is configured with smart defaults optimized for
                        your business. You can start approving review replies
                        right away.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          onClick={onSkip}
          className="text-muted-foreground"
        >
          Skip Setup
        </Button>

        <div className="flex items-center gap-2">
          {currentStep > 1 && (
            <Button variant="outline" onClick={handlePrevious}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
          )}

          {currentStep < 3 ? (
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              className="bg-gradient-to-r from-orange-500 to-purple-500 hover:from-orange-600 hover:to-purple-600"
            >
              <Check className="h-4 w-4 mr-2" />
              Complete Setup
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
