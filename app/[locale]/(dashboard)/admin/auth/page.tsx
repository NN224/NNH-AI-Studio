'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle, CheckCircle, Lock, Mail, Shield, Smartphone } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function AdminAuthPage() {
  const [step, setStep] = useState<'email' | 'password' | '2fa'>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [twoFACode, setTwoFACode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sessionValid, setSessionValid] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkExistingSession()
  }, [])

  const checkExistingSession = async () => {
    if (!supabase) return

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      // Check if user is admin
      const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || []
      if (adminEmails.includes(user.email || '')) {
        // Check if 2FA session is valid
        const twoFASession = sessionStorage.getItem('admin_2fa_verified')
        const sessionTime = sessionStorage.getItem('admin_2fa_time')

        if (twoFASession === 'true' && sessionTime) {
          const timeDiff = Date.now() - parseInt(sessionTime)
          // 30 minutes session
          if (timeDiff < 30 * 60 * 1000) {
            setSessionValid(true)
            router.push('/admin')
            return
          }
        }

        // User is admin but needs 2FA
        setStep('2fa')
        setEmail(user.email || '')
      } else {
        setError('Access denied. Admin privileges required.')
      }
    }
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Check if email is in admin list
    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || []
    if (!adminEmails.includes(email)) {
      setError('This email is not authorized for admin access.')
      setLoading(false)
      return
    }

    setStep('password')
    setLoading(false)
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!supabase) {
      setError('Connection error')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        // Send 2FA code to email
        await send2FACode(data.user.email!)
        setStep('2fa')
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  const send2FACode = async (email: string) => {
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString()

    // Store in session (in production, use database with expiry)
    sessionStorage.setItem('admin_2fa_code', code)
    sessionStorage.setItem('admin_2fa_code_time', Date.now().toString())

    // Send email (integrate with your email service)
    try {
      await fetch('/api/admin/send-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })
    } catch {
      // For demo, show code in console (remove in production!)
      console.log('2FA Code:', code)
    }
  }

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Verify 2FA code
    const storedCode = sessionStorage.getItem('admin_2fa_code')
    const codeTime = sessionStorage.getItem('admin_2fa_code_time')

    if (!storedCode || !codeTime) {
      setError('2FA code expired. Please login again.')
      setStep('email')
      setLoading(false)
      return
    }

    // Check if code is expired (5 minutes)
    const timeDiff = Date.now() - parseInt(codeTime)
    if (timeDiff > 5 * 60 * 1000) {
      setError('2FA code expired. Please login again.')
      setStep('email')
      setLoading(false)
      return
    }

    if (twoFACode !== storedCode) {
      setError('Invalid 2FA code.')
      setLoading(false)
      return
    }

    // Success! Set admin session
    sessionStorage.setItem('admin_2fa_verified', 'true')
    sessionStorage.setItem('admin_2fa_time', Date.now().toString())
    sessionStorage.removeItem('admin_2fa_code')
    sessionStorage.removeItem('admin_2fa_code_time')

    // Log admin access
    await logAdminAccess()

    router.push('/admin')
  }

  const logAdminAccess = async () => {
    if (!supabase) return

    try {
      await supabase.from('audit_logs').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'ADMIN_LOGIN',
        severity: 'info',
        resource_type: 'admin_panel',
        details: {
          ip: window.location.hostname,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        },
        success: true,
      })
    } catch {
      // Silent fail for logging
    }
  }

  if (sessionValid) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span>Session valid. Redirecting...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              <Shield className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Admin Access</CardTitle>
          <CardDescription>
            High-security area. Multi-factor authentication required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Progress indicator */}
          <div className="flex items-center justify-between mb-6">
            <div
              className={`flex items-center gap-2 ${step === 'email' ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <Mail className="h-4 w-4" />
              <span className="text-sm">Email</span>
            </div>
            <div
              className={`flex items-center gap-2 ${step === 'password' ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <Lock className="h-4 w-4" />
              <span className="text-sm">Password</span>
            </div>
            <div
              className={`flex items-center gap-2 ${step === '2fa' ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <Smartphone className="h-4 w-4" />
              <span className="text-sm">2FA</span>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Email Step */}
          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Admin Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@nnh.ae"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Verifying...' : 'Continue'}
              </Button>
            </form>
          )}

          {/* Password Step */}
          {step === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Authenticating...' : 'Continue'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setStep('email')}
              >
                Back
              </Button>
            </form>
          )}

          {/* 2FA Step */}
          {step === '2fa' && (
            <form onSubmit={handle2FASubmit} className="space-y-4">
              <div>
                <Label htmlFor="2fa">Verification Code</Label>
                <Input
                  id="2fa"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={twoFACode}
                  onChange={(e) => setTwoFACode(e.target.value)}
                  maxLength={6}
                  pattern="[0-9]{6}"
                  required
                  autoFocus
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Check your email for the verification code
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Verifying...' : 'Access Admin Panel'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  send2FACode(email)
                  setError('New code sent to your email')
                }}
              >
                Resend Code
              </Button>
            </form>
          )}

          {/* Security Notice */}
          <div className="mt-6 p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground text-center">
              🔒 This session will expire after 30 minutes of inactivity
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
