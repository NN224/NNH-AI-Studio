"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { authService } from "@/lib/services/auth-service";
import { toast } from "sonner";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getLocaleFromPathname } from "@/lib/utils/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { PasswordStrength } from "@/components/auth/password-strength";
import { useTranslations } from "next-intl";

export default function SignupPage() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const t = useTranslations("auth.signup");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName || !email || !password || !confirmPassword) {
      setError(t("errors.fillAllFields"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("errors.passwordMismatch"));
      return;
    }

    if (!acceptedTerms) {
      setError(t("errors.acceptTerms"));
      return;
    }

    // Check password strength
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber) {
      setError(t("errors.weakPassword"));
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await authService.signUp(email, password, fullName);

      setUserEmail(email);
      setShowSuccess(true);
      toast.success(t("accountCreated"));
    } catch (err) {
      console.error("Signup error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to sign up";

      if (errorMessage.includes("already registered")) {
        setError(t("errors.emailExists"));
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (resendCooldown > 0) return;

    try {
      setResendCooldown(60);
      await authService.resendVerificationEmail(userEmail);
      toast.success("Verification email sent!");

      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Resend error:", err);
      toast.error("Failed to resend email");
      setResendCooldown(0);
    }
  };

  if (showSuccess) {
    return (
      <AuthLayout title={t("verifyEmail")} showBenefits={false}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-10 h-10 text-green-500" />
          </div>

          <h2 className="text-2xl font-bold mb-4">{t("verifyEmail")}</h2>
          <p className="text-gray-400 mb-2">{t("verifyEmailMessage")}</p>
          <p className="text-orange-500 font-semibold mb-6">{userEmail}</p>
          <p className="text-gray-400 text-sm mb-8">{t("checkInbox")}</p>

          <div className="flex flex-col gap-4">
            <button
              onClick={handleResendEmail}
              disabled={resendCooldown > 0}
              className="text-sm text-orange-500 hover:text-orange-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendCooldown > 0
                ? `${t("resendIn")} ${resendCooldown} ${t("seconds")}`
                : `${t("didntReceive")} ${t("resend")}`}
            </button>

            <Link
              href={`/${locale}/login`}
              className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
            >
              Back to login
            </Link>
          </div>
        </motion.div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t("title")} subtitle={t("subtitle")}>
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Full Name */}
        <div>
          <label
            htmlFor="fullName"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            {t("fullName")}
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="John Doe"
            autoComplete="name"
          />
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            {t("email")}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            {t("password")}
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed pr-12"
              placeholder="••••••••"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors disabled:opacity-50"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          {password && <PasswordStrength password={password} />}
        </div>

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            {t("confirmPassword")}
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed pr-12"
              placeholder="••••••••"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={isLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors disabled:opacity-50"
            >
              {showConfirmPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          {confirmPassword && password === confirmPassword && (
            <p className="text-sm text-green-500 mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              Passwords match
            </p>
          )}
        </div>

        {/* Terms & Privacy */}
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            disabled={isLoading}
            className="mt-1 w-4 h-4 rounded border-gray-700 bg-gray-900 text-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
            {t("agreeToTerms")}{" "}
            <Link
              href="/terms"
              className="text-orange-500 hover:text-orange-400"
            >
              {t("terms")}
            </Link>{" "}
            {t("and")}{" "}
            <Link
              href="/privacy"
              className="text-orange-500 hover:text-orange-400"
            >
              {t("privacy")}
            </Link>
          </span>
        </label>

        {/* Submit Button */}
        <motion.button
          type="submit"
          disabled={isLoading}
          whileHover={{ scale: isLoading ? 1 : 1.02 }}
          whileTap={{ scale: isLoading ? 1 : 0.98 }}
          className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t("creatingAccount")}
            </>
          ) : (
            t("createAccount")
          )}
        </motion.button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-800" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-black text-gray-500">
              {t("orContinueWith")}
            </span>
          </div>
        </div>

        {/* OAuth Buttons */}
        <OAuthButtons mode="signup" />

        {/* Login Link */}
        <p className="text-center text-sm text-gray-400">
          {t("haveAccount")}{" "}
          <Link
            href={`/${locale}/login`}
            className="text-orange-500 hover:text-orange-400 font-semibold transition-colors"
          >
            {t("signIn")}
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
