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
import { Loader2, Mail, Lock, User } from "lucide-react"
import { getBaseUrlClient } from "@/lib/utils/get-base-url-client"

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    const baseUrl = getBaseUrlClient()
    setIsLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${baseUrl}/home`,
          data: {
            full_name: fullName,
          },
        },
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
    const baseUrl = getBaseUrlClient()
    setIsGoogleLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${baseUrl}/auth/callback` }
      })
      if (error) throw error
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Google sign-up failed')
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-gradient-to-br from-black via-gray-900 to-black p-6">
      {/* Animated Background Gradients */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-accent/20 to-transparent rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
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
        <motion.div 
          className="mb-8 text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <motion.img 
              src="/nnh-logo.png" 
              alt="NNH Logo" 
              className="w-16 h-16 object-contain"
              animate={{
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              NNH - AI Studio
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Empowering Your Business with AI
          </p>
        </motion.div>

        <Card className="relative bg-card/80 backdrop-blur-xl border-primary/30 shadow-2xl shadow-primary/20">
          {/* Decorative gradient border */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-lg blur-sm -z-10" />
          <CardHeader className="space-y-1">
            <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Create Account
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              Start managing your Google My Business locations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {/* Google OAuth */}
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="button"
                  className="w-full bg-white text-black hover:bg-white/90 border border-primary/20 shadow-lg"
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
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.31 0-6-2.73-6-6.1s2.69-6.1 6-6.1c1.89 0 3.16.8 3.89 1.49l2.64-2.55C16.91 3.4 14.69 2.5 12 2.5 6.99 2.5 2.9 6.59 2.9 11.6S6.99 20.7 12 20.7c6.36 0 8.1-4.45 8.1-6.65 0-.45-.05-.74-.11-1.06H12z"/>
                      </svg>
                      Continue with Google
                    </>
                  )}
                </Button>
              </motion.div>

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="h-px bg-primary/20 flex-1" />
                <span className="text-xs text-muted-foreground">or create with email</span>
                <div className="h-px bg-primary/20 flex-1" />
              </div>

              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-foreground flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Full Name
                  </Label>
                  <div className="relative">
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="John Doe"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="bg-secondary/50 border-primary/30 text-foreground placeholder:text-muted-foreground focus:border-primary pl-10"
                      disabled={isLoading}
                    />
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    Email
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-secondary/50 border-primary/30 text-foreground placeholder:text-muted-foreground focus:border-primary pl-10"
                      disabled={isLoading}
                    />
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-secondary/50 border-primary/30 text-foreground focus:border-primary pl-10"
                    disabled={isLoading}
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-secondary/50 border-primary/30 text-foreground focus:border-primary pl-10"
                    disabled={isLoading}
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
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
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold shadow-lg shadow-primary/50"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </motion.div>
                <div className="text-center text-sm text-muted-foreground">
                  By signing up you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy</Link>.
                </div>
                <div className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link
                    href="/auth/login"
                    className="text-primary hover:text-accent underline underline-offset-4 transition-colors"
                  >
                    Sign in
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
