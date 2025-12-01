"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  Sparkles,
  Zap,
  TrendingUp,
  Shield,
  WrenchIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  BusinessAttributesValidator,
  type ValidationResult,
  type BusinessAttributes,
} from "@/lib/services/business-attributes-validation";
import { cn } from "@/lib/utils";
import { gmbLogger } from "@/lib/utils/logger";

interface ValidationPanelProps {
  profile: any; // BusinessProfilePayload type
  onChange: (updates: any) => void;
  onDirty: () => void;
  locationName: string;
  disabled?: boolean;
}

export function ValidationPanel({
  profile,
  onChange,
  onDirty,
  locationName,
  disabled = false,
}: ValidationPanelProps) {
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [autoFixApplied, setAutoFixApplied] = useState(false);

  // Convert profile to validation format
  const businessAttributes: BusinessAttributes = useMemo(
    () => ({
      locationName: profile.locationName || locationName,
      shortDescription: profile.shortDescription || profile.description || "",
      description: profile.description || "",
      phone: profile.phone || "",
      website: profile.website || "",
      email: profile.email,
      categories: profile.categories || [],
      features: profile.features || {},
      businessHours: profile.businessHours,
      yearEstablished: profile.yearEstablished,
      priceRange: profile.priceRange,
      languages: profile.languages,
    }),
    [profile, locationName],
  );

  useEffect(() => {
    validateProfile();
  }, [businessAttributes]);

  const validateProfile = () => {
    setIsValidating(true);
    try {
      const result = BusinessAttributesValidator.validate(businessAttributes);
      setValidationResult(result);
    } catch (error) {
      gmbLogger.error(
        "Validation error",
        error instanceof Error ? error : new Error(String(error)),
        { locationName },
      );
    } finally {
      setIsValidating(false);
    }
  };

  const applyAutoFix = () => {
    if (!validationResult || disabled) return;

    try {
      const fixed = BusinessAttributesValidator.autoFix(
        businessAttributes,
        validationResult,
      );

      // Apply fixes to profile
      onChange({
        ...profile,
        phone: fixed.phone,
        website: fixed.website,
        locationName: fixed.locationName,
      });

      onDirty();
      setAutoFixApplied(true);
      toast.success("Auto-fixes applied successfully");

      // Re-validate after fixes
      setTimeout(validateProfile, 100);
    } catch (error) {
      gmbLogger.error(
        "Auto-fix error",
        error instanceof Error ? error : new Error(String(error)),
        { locationName },
      );
      toast.error("Failed to apply auto-fixes");
    }
  };

  const applySuggestion = (suggestion: any) => {
    if (disabled) {
      toast.error("Please unlock the profile to apply suggestions");
      return;
    }

    if (suggestion.implementation) {
      suggestion.implementation();
      toast.success("Suggestion applied");
    } else {
      toast.info("Manual implementation required");
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs Improvement";
  };

  if (!validationResult) return null;

  const autoFixableCount = validationResult.errors.filter(
    (e) => e.autoFixable,
  ).length;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Profile Validation
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-2xl font-bold",
                getScoreColor(validationResult.score),
              )}
            >
              {validationResult.score}%
            </span>
            <Badge variant="secondary">
              {getScoreLabel(validationResult.score)}
            </Badge>
          </div>
        </CardTitle>
        <CardDescription>
          Real-time validation and optimization suggestions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Score Progress */}
          <div className="space-y-2">
            <Progress value={validationResult.score} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Profile Completeness</span>
              <span>{validationResult.score}%</span>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-red-500/10 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-500 mx-auto mb-1" />
              <div className="text-lg font-semibold">
                {validationResult.errors.length}
              </div>
              <div className="text-xs text-muted-foreground">Errors</div>
            </div>
            <div className="text-center p-3 bg-yellow-500/10 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
              <div className="text-lg font-semibold">
                {validationResult.warnings.length}
              </div>
              <div className="text-xs text-muted-foreground">Warnings</div>
            </div>
            <div className="text-center p-3 bg-blue-500/10 rounded-lg">
              <Info className="h-5 w-5 text-blue-500 mx-auto mb-1" />
              <div className="text-lg font-semibold">
                {validationResult.suggestions.length}
              </div>
              <div className="text-xs text-muted-foreground">Suggestions</div>
            </div>
          </div>

          {/* Auto-fix Button */}
          {autoFixableCount > 0 && !autoFixApplied && (
            <Button
              onClick={applyAutoFix}
              disabled={disabled || isValidating}
              className="w-full gap-2"
              variant="secondary"
            >
              <WrenchIcon className="h-4 w-4" />
              Auto-fix {autoFixableCount} Issue
              {autoFixableCount !== 1 ? "s" : ""}
            </Button>
          )}

          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {/* Errors */}
              {validationResult.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    Errors ({validationResult.errors.length})
                  </h4>
                  {validationResult.errors.map((error, index) => (
                    <div
                      key={index}
                      className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg space-y-1"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{error.message}</p>
                          <p className="text-xs text-muted-foreground">
                            Field: {error.field}
                          </p>
                        </div>
                        {error.autoFixable && (
                          <Badge variant="secondary" className="text-xs">
                            <Zap className="h-3 w-3 mr-1" />
                            Auto-fixable
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Warnings */}
              {validationResult.warnings.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    Warnings ({validationResult.warnings.length})
                  </h4>
                  {validationResult.warnings.map((warning, index) => (
                    <div
                      key={index}
                      className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm">{warning.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Field: {warning.field} • Impact: {warning.impact}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-xs",
                            warning.impact === "high" &&
                              "bg-orange-500/20 text-orange-500",
                            warning.impact === "medium" &&
                              "bg-yellow-500/20 text-yellow-500",
                            warning.impact === "low" &&
                              "bg-blue-500/20 text-blue-500",
                          )}
                        >
                          {warning.impact}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Suggestions */}
              {validationResult.suggestions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-500" />
                    Optimization Suggestions (
                    {validationResult.suggestions.length})
                  </h4>
                  {validationResult.suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg"
                    >
                      <div className="space-y-2">
                        <p className="text-sm font-medium">
                          {suggestion.message}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <TrendingUp className="h-3 w-3" />
                          {suggestion.benefit}
                        </div>
                        {suggestion.implementation && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => applySuggestion(suggestion)}
                            disabled={disabled}
                            className="mt-2"
                          >
                            Apply Suggestion
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Success Message */}
              {validationResult.isValid &&
                validationResult.warnings.length === 0 &&
                validationResult.suggestions.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <p className="text-lg font-medium">
                      Profile is perfectly optimized!
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      All validations passed successfully
                    </p>
                  </div>
                )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
