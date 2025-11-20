"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const checks = [
    { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
    {
      label: "Contains uppercase letter",
      test: (p: string) => /[A-Z]/.test(p),
    },
    {
      label: "Contains lowercase letter",
      test: (p: string) => /[a-z]/.test(p),
    },
    { label: "Contains number", test: (p: string) => /[0-9]/.test(p) },
    {
      label: "Contains special character",
      test: (p: string) => /[^A-Za-z0-9]/.test(p),
    },
  ];

  const passedChecks = checks.filter((check) => check.test(password)).length;
  const strength =
    passedChecks === 0 ? 0 : (passedChecks / checks.length) * 100;

  const getStrengthColor = () => {
    if (strength === 0) return "bg-gray-600";
    if (strength < 40) return "bg-red-500";
    if (strength < 60) return "bg-orange-500";
    if (strength < 80) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStrengthLabel = () => {
    if (strength === 0) return "";
    if (strength < 40) return "Weak";
    if (strength < 60) return "Fair";
    if (strength < 80) return "Good";
    return "Strong";
  };

  if (!password) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="mb-4"
    >
      {/* Strength Bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400">Password Strength</span>
          <span
            className={`text-xs font-semibold ${
              strength < 40
                ? "text-red-500"
                : strength < 60
                  ? "text-orange-500"
                  : strength < 80
                    ? "text-yellow-500"
                    : "text-green-500"
            }`}
          >
            {getStrengthLabel()}
          </span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${strength}%` }}
            transition={{ duration: 0.3 }}
            className={`h-full ${getStrengthColor()} transition-colors`}
          />
        </div>
      </div>

      {/* Requirements */}
      <div className="space-y-1">
        {checks.map((check, index) => {
          const passed = check.test(password);
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-2 text-xs"
            >
              {passed ? (
                <Check className="w-3 h-3 text-green-500" />
              ) : (
                <X className="w-3 h-3 text-gray-600" />
              )}
              <span className={passed ? "text-green-500" : "text-gray-500"}>
                {check.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
