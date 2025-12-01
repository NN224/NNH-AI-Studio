"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { authService } from "@/lib/services/auth-service";
import { toast } from "sonner";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getRedirectUrl } from "@/lib/utils/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { useTranslations, useLocale } from "next-intl";
import { authLogger } from "@/lib/utils/logger";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale() as "en" | "ar";
  const redirectTo = getRedirectUrl(searchParams, locale);
  const t = useTranslations("auth.login");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError(t("errors.fillAllFields"));
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await authService.signIn(email, password, rememberMe);

      toast.success(t("welcomeBack"));
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      authLogger.error(
        "Login error",
        err instanceof Error ? err : new Error(String(err)),
        { email },
      );
      const errorMessage =
        err instanceof Error ? err.message : "Failed to sign in";

      if (errorMessage.includes("Invalid login credentials")) {
        setError(t("errors.invalidCredentials"));
      } else if (errorMessage.includes("Email not confirmed")) {
        setError(t("errors.emailNotConfirmed"));
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title={t("title")} subtitle={t("subtitle")}>
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={onSubmit} className="space-y-5">
        {/* Email Input */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-300 mb-2.5"
          >
            {t("email")}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white text-base placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>

        {/* Password Input */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-300 mb-2.5"
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
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white text-base placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed pr-12"
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors disabled:opacity-50"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isLoading}
              className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
              {t("rememberMe")}
            </span>
          </label>

          <Link
            href={`/${locale}/forgot-password`}
            className="text-sm text-orange-500 hover:text-orange-400 transition-colors"
          >
            {t("forgotPassword")}
          </Link>
        </div>

        {/* Submit Button */}
        <motion.button
          type="submit"
          disabled={isLoading}
          whileHover={{ scale: isLoading ? 1 : 1.02 }}
          whileTap={{ scale: isLoading ? 1 : 0.98 }}
          className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm sm:text-base font-semibold rounded-lg hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
              <span className="text-sm sm:text-base">{t("signingIn")}</span>
            </>
          ) : (
            t("signIn")
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
        <OAuthButtons mode="signin" />

        {/* Sign Up Link */}
        <p className="text-center text-sm text-gray-400">
          {t("noAccount")}{" "}
          <Link
            href={`/${locale}/auth/signup`}
            className="text-orange-500 hover:text-orange-400 font-semibold transition-colors"
          >
            {t("signUp")}
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
