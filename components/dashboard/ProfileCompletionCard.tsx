"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface ProfileStep {
  id: string;
  label: string;
  completed: boolean;
}

interface ProfileCompletionCardProps {
  completionPercentage: number;
  steps: ProfileStep[];
}

export function ProfileCompletionCard({
  completionPercentage,
  steps,
}: ProfileCompletionCardProps) {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium text-white">
            Complete Your Profile
          </CardTitle>
          <span className="text-2xl font-bold text-orange-500">
            {completionPercentage}%
          </span>
        </div>
        <Progress
          value={completionPercentage}
          className="h-2 bg-zinc-800"
          indicatorClassName="bg-orange-500"
        />
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-2">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center gap-3 text-sm">
              {step.completed ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Circle className="h-4 w-4 text-zinc-600" />
              )}
              <span
                className={
                  step.completed
                    ? "text-zinc-400 line-through"
                    : "text-zinc-300"
                }
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
        <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
          Complete Profile
        </Button>
      </CardContent>
    </Card>
  );
}
