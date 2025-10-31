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
import { Loader2, Mail, Lock, Phone, CheckCircle2, AlertCircle } from "lucide-react"
import { getBaseUrlClient } from "@/lib/utils/get-base-url-client"
import { toast } from "sonner"

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

  // Format phone number to international format
  const formatPhoneNumber = (value: string): string => {
    // Remove all non-digit characters except +
    let cleaned = value.replace(/[^\d+]/g, '')
    
    // Ensure + is at the start
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned.replace(/\+/g, '')
    }
    
    // Limit to reasonable length (max 15 digits after +)
    if (cleaned.length > 16) {
      cleaned = cleaned.substring(0, 16)
    }
    
    return cleaned
  }

  // Validate phone number format
  const isValidPhoneNumber = (phoneNum: string): boolean => {
    // International format: + followed by 7-15 digits
    const phoneRegex = /^\+[1-9]\d{6,14}$/
    return phoneRegex.test(phoneNum)
  }

  // Handle phone input change with formatting
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setPhone(formatted)
    
    // Clear error if phone becomes valid
    if (error && isValidPhoneNumber(formatted)) {
      setError(null)
    }
  }

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
    const baseUrl = getBaseUrlClient()
    setIsGoogleLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${baseUrl}/auth/callback` }
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
    const baseUrl = getBaseUrlClient()
    setIsMagicLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${baseUrl}/home` }
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
    // Validation
    if (!phone.trim()) {
      setError('Phone number is required')
      toast.error('الرجاء إدخال رقم الهاتف')
      return
    }

    if (!isValidPhoneNumber(phone)) {
      setError('Invalid phone format. Use international format: +9715XXXXXXXX')
      toast.error('تنسيق رقم الهاتف غير صحيح. استخدم الصيغة الدولية: +9715XXXXXXXX')
      return
    }

    const supabase = createClient()
    setIsPhoneSending(true)
    setError(null)
    
    try {
      const { error, data } = await supabase.auth.signInWithOtp({ 
        phone,
        options: {
          // In production, you might want to add channel: 'sms' explicitly
          channel: 'sms'
        }
      })
      
      if (error) {
        // Handle specific errors with user-friendly messages
        let errorMessage = error.message
        if (error.message.includes('Invalid phone')) {
          errorMessage = 'رقم الهاتف غير صحيح'
        } else if (error.message.includes('rate limit')) {
          errorMessage = 'تم الإرسال بشكل متكرر. انتظر قليلاً'
        } else if (error.message.includes('provider')) {
          errorMessage = 'خدمة الرسائل غير مفعلة. تواصل مع الدعم'
        }
        
        setError(errorMessage)
        toast.error(errorMessage)
        throw error
      }
      
      setCodeSent(true)
      toast.success('تم إرسال كود التحقق بنجاح إلى ' + phone)
      
      // Auto-focus OTP input after code is sent
      setTimeout(() => {
        const otpInput = document.getElementById('otp')
        if (otpInput) {
          otpInput.focus()
        }
      }, 100)
    } catch (e: unknown) {
      // Error already handled above
      console.error('[Phone Auth] Send code error:', e)
    } finally {
      setIsPhoneSending(false)
    }
  }

  const handleVerifyPhoneCode = async () => {
    // Validation
    if (!otp.trim()) {
      setError('Verification code is required')
      toast.error('الرجاء إدخال كود التحقق')
      return
    }

    if (otp.length < 4) {
      setError('Verification code must be at least 4 digits')
      toast.error('كود التحقق يجب أن يكون 4 أرقام على الأقل')
      return
    }

    const supabase = createClient()
    setIsVerifying(true)
    setError(null)
    
    try {
      const { error, data } = await supabase.auth.verifyOtp({
        phone,
        token: otp.trim(),
        type: 'sms'
      })
      
      if (error) {
        // Handle specific errors with user-friendly messages
        let errorMessage = error.message
        if (error.message.includes('expired') || error.message.includes('Invalid')) {
          errorMessage = 'كود التحقق غير صحيح أو منتهي الصلاحية. اطلب كود جديد'
        } else if (error.message.includes('rate limit')) {
          errorMessage = 'محاولات كثيرة. انتظر قليلاً'
        } else {
          errorMessage = 'فشل التحقق. تأكد من صحة الكود'
        }
        
        setError(errorMessage)
        toast.error(errorMessage)
        throw error
      }
      
      // Success
      toast.success('تم التحقق بنجاح! مرحباً بك')
      
      // Redirect after short delay to show success message
      setTimeout(() => {
        router.push('/home')
        router.refresh()
      }, 500)
    } catch (e: unknown) {
      // Error already handled above
      console.error('[Phone Auth] Verify error:', e)
      
      // Clear OTP on error so user can re-enter
      setOtp('')
    } finally {
      setIsVerifying(false)
    }
  }

  // Handle resend code
  const handleResendCode = async () => {
    setCodeSent(false)
    setOtp('')
    await handleSendPhoneCode()
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
          
          <CardHeader className="space-y-1 pb-6">
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
                      {/* Google "G" icon */}
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.31 0-6-2.73-6-6.1s2.69-6.1 6-6.1c1.89 0 3.16.8 3.89 1.49l2.64-2.55C16.91 3.4 14.69 2.5 12 2.5 6.99 2.5 2.9 6.59 2.9 11.6S6.99 20.7 12 20.7c6.36 0 8.1-4.45 8.1-6.65 0-.45-.05-.74-.11-1.06H12z"/>
                      </svg>
                      Continue with Google
                    </>
                  )}
                </Button>
              </motion.div>

              {/* Magic Link */}
              <div className="space-y-2">
                <Label htmlFor="email-magic" className="text-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  Email (for Magic Link)
                </Label>
                <div className="relative">
                  <Input
                    id="email-magic"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-secondary/50 border-primary/30 text-foreground placeholder:text-muted-foreground focus:border-primary pl-10"
                    disabled={isMagicLoading}
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button type="button" className="w-full bg-gradient-to-r from-primary/80 to-accent/80 hover:from-primary hover:to-accent" onClick={handleMagicLink} disabled={isMagicLoading || !email}>
                    {isMagicLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending magic link...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Send Magic Link
                      </>
                    )}
                  </Button>
                </motion.div>
              </div>

              {/* Phone OTP */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-foreground flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" />
                  Phone (with country code)
                </Label>
                <div className="relative">
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+9715XXXXXXXX"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="bg-secondary/50 border-primary/30 text-foreground focus:border-primary pl-10"
                    disabled={isPhoneSending || isVerifying || codeSent}
                    maxLength={16}
                  />
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
                {!codeSent ? (
                  <>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button 
                        type="button" 
                        className="w-full bg-gradient-to-r from-primary/80 to-accent/80 hover:from-primary hover:to-accent" 
                        onClick={handleSendPhoneCode} 
                        disabled={isPhoneSending || !phone.trim() || !isValidPhoneNumber(phone)}
                      >
                        {isPhoneSending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            إرسال الكود...
                          </>
                        ) : (
                          <>
                            <Phone className="mr-2 h-4 w-4" />
                            إرسال كود التحقق
                          </>
                        )}
                      </Button>
                    </motion.div>
                    {phone && !isValidPhoneNumber(phone) && (
                      <p className="text-xs text-orange-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        استخدم الصيغة الدولية: +9715XXXXXXXX
                      </p>
                    )}
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <p className="text-sm text-green-500">تم إرسال الكود إلى {phone}</p>
                    </div>
                    <Label htmlFor="otp" className="text-foreground flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      كود التحقق
                    </Label>
                    <Input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => {
                        // Only allow digits
                        const value = e.target.value.replace(/\D/g, '')
                        setOtp(value.substring(0, 6)) // Max 6 digits
                      }}
                      className="bg-secondary/50 border-primary/30 text-foreground focus:border-primary text-center text-lg tracking-widest font-mono"
                      disabled={isVerifying}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                        <Button 
                          type="button" 
                          variant="outline"
                          className="w-full border-primary/30 text-primary hover:bg-primary/10" 
                          onClick={handleResendCode}
                          disabled={isPhoneSending || isVerifying}
                        >
                          <Phone className="mr-2 h-4 w-4" />
                          إعادة الإرسال
                        </Button>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                        <Button 
                          type="button" 
                          className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600" 
                          onClick={handleVerifyPhoneCode} 
                          disabled={isVerifying || otp.length < 4}
                        >
                          {isVerifying ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              التحقق...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              التحقق وتسجيل الدخول
                            </>
                          )}
                        </Button>
                      </motion.div>
                    </div>
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
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold shadow-lg shadow-primary/50"
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
                </motion.div>
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
