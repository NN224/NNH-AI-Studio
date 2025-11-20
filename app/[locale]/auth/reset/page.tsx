"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import Link from "next/link";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { getBaseUrlClient } from "@/lib/utils/get-base-url-client";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";

export default function ResetPasswordPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    if (!supabase) {
      setError("Failed to initialize authentication client");
      return;
    }

    const baseUrl = getBaseUrlClient();
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${baseUrl}/auth/update-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send reset link");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <PublicHeader />
      <main className="flex-1 relative flex w-full items-center justify-center overflow-hidden bg-gradient-to-br from-black via-gray-900 to-black p-4">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
          />
          <motion.div
            className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-accent/10 to-transparent rounded-full blur-3xl"
            animate={{
              scale: [1.2, 1, 1.2],
              rotate: [90, 0, 90],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-md"
        >
          {/* Logo Header */}
          <div className="mb-8 text-center">
            <Link href={`/${locale}`} className="inline-block">
              <div className="flex items-center justify-center gap-3 mb-4">
                <img
                  src="/nnh-logo.png"
                  alt="NNH AI Studio"
                  className="w-14 h-14 object-contain"
                />
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  NNH AI Studio
                </h1>
              </div>
            </Link>
            <p className="text-muted-foreground text-sm">Reset your password</p>
          </div>

          <Card className="bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-bold text-center">
                Reset Password
              </CardTitle>
              <CardDescription className="text-center">
                {sent
                  ? "Check your email"
                  : "Enter your email to receive a reset link"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sent ? (
                <div className="space-y-4 text-center">
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-sm text-green-500">
                      We sent a password reset link to <strong>{email}</strong>
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Please check your inbox and spam folder
                    </p>
                  </div>
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/${locale}/auth/login`}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Sign In
                    </Link>
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-lg bg-destructive/10 border border-destructive/20"
                    >
                      <p className="text-sm text-destructive">{error}</p>
                    </motion.div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                    disabled={isLoading || !email}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending link...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Send Reset Link
                      </>
                    )}
                  </Button>

                  <div className="text-center text-sm text-muted-foreground">
                    Remember your password?{" "}
                    <Link
                      href={`/${locale}/auth/login`}
                      className="text-primary hover:underline font-medium"
                    >
                      Sign in
                    </Link>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
      <PublicFooter />
    </div>
  );
}
