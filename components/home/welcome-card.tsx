"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export interface WelcomeStep {
  id: string;
  icon: string;
  text: string;
  action: string;
  completed?: boolean;
}

interface WelcomeCardProps {
  title?: string;
  description?: string;
  steps: WelcomeStep[];
}

export function WelcomeCard({ title, description, steps }: WelcomeCardProps) {
  const t = useTranslations("Home");

  const completedSteps = steps.filter((step) => step.completed).length;
  const totalSteps = steps.length;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader>
        <CardTitle className="text-2xl">
          {title ||
            t("welcome.title", {
              defaultValue: "Welcome to NNH AI Studio! 🎉",
            })}
        </CardTitle>
        <CardDescription className="text-base">
          {description ||
            t("welcome.description", {
              defaultValue: "Get started by completing these quick setup steps",
            })}
        </CardDescription>

        {/* Progress bar */}
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t("welcome.progress", { defaultValue: "Setup Progress" })}
            </span>
            <span className="font-medium">
              {completedSteps}/{totalSteps}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {steps.map((step, index) => (
          <Link key={step.id} href={step.action} className="block">
            <div
              className={`group flex items-center gap-4 rounded-lg border p-4 transition-all hover:border-primary hover:bg-primary/5 ${
                step.completed
                  ? "border-green-500/50 bg-green-500/5"
                  : "border-border"
              }`}
            >
              {/* Step icon/emoji */}
              <div
                className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-2xl ${
                  step.completed
                    ? "bg-green-500/10"
                    : "bg-primary/10 group-hover:bg-primary/20"
                }`}
              >
                {step.icon}
              </div>

              {/* Step text */}
              <div className="flex-1">
                <p
                  className={`font-medium ${step.completed ? "text-muted-foreground line-through" : "text-foreground"}`}
                >
                  {step.text}
                </p>
                <p className="text-sm text-muted-foreground">
                  {step.completed
                    ? t("welcome.completed", { defaultValue: "Completed" })
                    : t("welcome.clickToStart", {
                        defaultValue: "Click to get started",
                      })}
                </p>
              </div>

              {/* Status indicator */}
              <div className="flex-shrink-0">
                {step.completed ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : (
                  <div className="flex items-center gap-2">
                    <Circle className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}

        {/* CTA for first incomplete step */}
        {completedSteps < totalSteps && (
          <div className="pt-4">
            <Link
              href={steps.find((s) => !s.completed)?.action || steps[0].action}
            >
              <Button className="w-full" size="lg">
                {t("welcome.getStarted", { defaultValue: "Get Started" })}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}

        {/* Completion message */}
        {completedSteps === totalSteps && (
          <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4 text-center">
            <p className="font-medium text-green-700 dark:text-green-400">
              🎉{" "}
              {t("welcome.allDone", {
                defaultValue: "All set! You're ready to go.",
              })}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
