"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { motion } from "framer-motion"
import { createBrowserClient } from "@supabase/ssr"
import { Loader2 } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isMagicLoading, setIsMagicLoading] = useState(false)
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState("")
  const [isPhoneSending, setIsPhoneSending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [remember, setRemember] = useState(true)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = remember
      ? createClient()
      : createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false } }
        )
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      router.push("/home")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogle = async () => {
    const supabase = createClient()
    setIsGoogleLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` }
      })
      if (error) throw error
      // Supabase will redirect; nothing else here
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Google sign-in failed')
      setIsGoogleLoading(false)
    }
  }

  const handleMagicLink = async () => {
    const supabase = createClient()
    setIsMagicLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/home` }
      })
      if (error) throw error
      setError("Magic link sent to your email.")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Magic link failed')
    } finally {
      setIsMagicLoading(false)
    }
  }

  const handleSendPhoneCode = async () => {
    const supabase = createClient()
    setIsPhoneSending(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone })
      if (error) throw error
      setCodeSent(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send code')
    } finally {
      setIsPhoneSending(false)
    }
  }

  const handleVerifyPhoneCode = async () => {
    const supabase = createClient()
    setIsVerifying(true)
    setError(null)
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: 'sms'
      })
      if (error) throw error
      router.push('/home')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Verification failed')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-black p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="bg-card border-primary/30 shadow-2xl shadow-primary/10">
          <CardHeader className="space-y-1">
            <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              Sign in to your GMB Management account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {/* Google OAuth */}
              <Button
                type="button"
                className="w-full bg-white text-black hover:bg-white/90 border border-primary/20"
                onClick={handleGoogle}
                disabled={isGoogleLoading}
              >
                {isGoogleLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting Google...
                  </>
                ) : (
                  <>
                    {/* Google "G" icon */}
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.31 0-6-2.73-6-6.1s2.69-6.1 6-6.1c1.89 0 3.16.8 3.89 1.49l2.64-2.55C16.91 3.4 14.69 2.5 12 2.5 6.99 2.5 2.9 6.59 2.9 11.6S6.99 20.7 12 20.7c6.36 0 8.1-4.45 8.1-6.65 0-.45-.05-.74-.11-1.06H12z"/>
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>

              {/* Magic Link */}
              <div className="space-y-2">
                <Label htmlFor="email-magic" className="text-foreground">Email (for Magic Link)</Label>
                <Input
                  id="email-magic"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-secondary border-primary/30 text-foreground placeholder:text-muted-foreground focus:border-primary"
                  disabled={isMagicLoading}
                />
                <Button type="button" className="w-full" onClick={handleMagicLink} disabled={isMagicLoading || !email}>
                  {isMagicLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending magic link...
                    </>
                  ) : (
                    "Send Magic Link"
                  )}
                </Button>
              </div>

              {/* Phone OTP */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-foreground">Phone (with country code)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+9715XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-secondary border-primary/30 text-foreground focus:border-primary"
                  disabled={isPhoneSending || isVerifying}
                />
                {!codeSent ? (
                  <Button type="button" className="w-full" onClick={handleSendPhoneCode} disabled={isPhoneSending || !phone}>
                    {isPhoneSending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending code...
                      </>
                    ) : (
                      "Send Code"
                    )}
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="otp" className="text-foreground">Enter Code</Label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="bg-secondary border-primary/30 text-foreground focus:border-primary"
                      disabled={isVerifying}
                    />
                    <Button type="button" className="w-full" onClick={handleVerifyPhoneCode} disabled={isVerifying || otp.length < 4}>
                      {isVerifying ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        "Verify & Sign In"
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="h-px bg-primary/20 flex-1" />
                <span className="text-xs text-muted-foreground">or sign in with email</span>
                <div className="h-px bg-primary/20 flex-1" />
              </div>

              {/* Email & Password */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-secondary border-primary/30 text-foreground placeholder:text-muted-foreground focus:border-primary"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-secondary border-primary/30 text-foreground focus:border-primary"
                    disabled={isLoading}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                    Remember me
                  </label>
                  <Link href="/auth/reset" className="text-sm text-primary hover:text-accent underline">Forgot password?</Link>
                </div>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="p-3 rounded-lg bg-destructive/10 border border-destructive/30"
                  >
                    <p className="text-sm text-destructive">{error}</p>
                  </motion.div>
                )}
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
                <div className="text-center text-sm text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/auth/signup"
                    className="text-primary hover:text-accent underline underline-offset-4 transition-colors"
                  >
                    Sign up
                  </Link>
                </div>
              </form>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
