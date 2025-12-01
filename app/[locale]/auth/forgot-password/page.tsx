"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, Loader2, Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getLocaleFromPathname } from "@/lib/utils/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { authLogger } from "@/lib/utils/logger";

export default function ForgotPasswordPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname || "/");
  const t = useTranslations("auth.forgotPassword");
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError(t("errors.invalidEmail"));
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      if (!supabase) throw new Error("Supabase client not initialized");

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/${locale}/reset-password`,
        },
      );

      if (resetError) throw resetError;

      setShowSuccess(true);
      toast.success(t("emailSent"));
    } catch (err) {
      authLogger.error(
        "Forgot password error",
        err instanceof Error ? err : new Error(String(err)),
      );
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send reset email";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <AuthLayout title={t("emailSent")} showBenefits={false}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-10 h-10 text-green-500" />
          </div>

          <h2 className="text-2xl font-bold mb-4">{t("emailSent")}</h2>
          <p className="text-gray-400 mb-2">{t("checkEmail")}</p>
          <p className="text-orange-500 font-semibold mb-8">{email}</p>

          <Link
            href={`/${locale}/login`}
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("backToLogin")}
          </Link>
        </motion.div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t("title")}
      subtitle={t("subtitle")}
      showBenefits={false}
    >
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Email Input */}
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
            autoFocus
          />
        </div>

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
              {t("sending")}
            </>
          ) : (
            t("sendLink")
          )}
        </motion.button>

        {/* Back to Login */}
        <Link
          href={`/${locale}/login`}
          className="flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("backToLogin")}
        </Link>
      </form>
    </AuthLayout>
  );
}
