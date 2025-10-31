"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { ArrowLeft, Settings, Building2, Play, LogOut, User, Mail, Shield, Send, Users, Key, RefreshCw, UserPlus, Link2 } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"

export default function SettingsPage() {
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [gmbConnected, setGmbConnected] = useState(false)
  const [youtubeConnected, setYoutubeConnected] = useState(false)
  
  // Email templates state
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteLoading, setInviteLoading] = useState(false)
  const [magicLinkEmail, setMagicLinkEmail] = useState("")
  const [magicLinkLoading, setMagicLinkLoading] = useState(false)
  const [resetPasswordEmail, setResetPasswordEmail] = useState("")
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false)
  const [changeEmailNew, setChangeEmailNew] = useState("")
  const [changeEmailLoading, setChangeEmailLoading] = useState(false)
  const [reauthEmail, setReauthEmail] = useState("")
  const [reauthLoading, setReauthLoading] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      setUser(u)

      if (u) {
        // Check GMB
        const { data: gmb } = await supabase
          .from('gmb_accounts')
          .select('id')
          .eq('user_id', u.id)
          .maybeSingle()
        setGmbConnected(!!gmb)

        // Check YouTube
        const { data: yt } = await supabase
          .from('oauth_tokens')
          .select('id')
          .eq('user_id', u.id)
          .eq('provider', 'youtube')
          .maybeSingle()
        setYoutubeConnected(!!yt)
      }

      setLoading(false)
    })()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  // Email template handlers
  const handleSendInvite = async () => {
    if (!inviteEmail || !inviteEmail.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }

    setInviteLoading(true)
    try {
      const response = await fetch('/api/auth/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to send invitation')

      toast.success('Invitation sent successfully!')
      setInviteEmail("")
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invitation')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleSendMagicLink = async () => {
    if (!magicLinkEmail || !magicLinkEmail.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }

    setMagicLinkLoading(true)
    try {
      const response = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: magicLinkEmail })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to send magic link')

      toast.success('Magic link sent successfully!')
      setMagicLinkEmail("")
    } catch (error: any) {
      toast.error(error.message || 'Failed to send magic link')
    } finally {
      setMagicLinkLoading(false)
    }
  }

  const handleSendResetPassword = async () => {
    if (!resetPasswordEmail || !resetPasswordEmail.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }

    setResetPasswordLoading(true)
    try {
      const response = await fetch('/api/auth/send-reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetPasswordEmail })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to send reset password email')

      toast.success('Password reset email sent successfully!')
      setResetPasswordEmail("")
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset password email')
    } finally {
      setResetPasswordLoading(false)
    }
  }

  const handleSendChangeEmail = async () => {
    if (!changeEmailNew || !changeEmailNew.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }

    setChangeEmailLoading(true)
    try {
      const response = await fetch('/api/auth/send-change-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail: changeEmailNew })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to send change email confirmation')

      toast.success('Change email confirmation sent successfully!')
      setChangeEmailNew("")
    } catch (error: any) {
      toast.error(error.message || 'Failed to send change email confirmation')
    } finally {
      setChangeEmailLoading(false)
    }
  }

  const handleSendReauth = async () => {
    const email = reauthEmail || user?.email
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }

    setReauthLoading(true)
    try {
      const response = await fetch('/api/auth/send-reauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to send reauthentication email')

      toast.success('Reauthentication email sent successfully!')
      setReauthEmail("")
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reauthentication email')
    } finally {
      setReauthLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/home" className="text-muted-foreground hover:text-primary inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>

        <Card className="border border-primary/20 glass-strong mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Settings
            </CardTitle>
            <CardDescription>Manage your account and connections</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Account Info */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                <User className="w-4 h-4" /> Account Information
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">Email</label>
                  <Input value={user?.email || ''} disabled className="mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">User ID</label>
                  <Input value={user?.id || ''} disabled className="mt-1 font-mono text-xs" />
                </div>
              </div>
            </div>

            {/* Connected Accounts */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Connected Accounts
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-primary" />
                    <div>
                      <div className="font-medium">Google My Business</div>
                      <div className="text-xs text-muted-foreground">
                        {gmbConnected ? 'Connected' : 'Not connected'}
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={gmbConnected ? '/gmb-dashboard' : '/gmb-dashboard'}>
                      {gmbConnected ? 'Manage' : 'Connect'}
                    </Link>
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-3">
                    <Play className="w-5 h-5 text-red-500" />
                    <div>
                      <div className="font-medium">YouTube</div>
                      <div className="text-xs text-muted-foreground">
                        {youtubeConnected ? 'Connected' : 'Not connected'}
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={youtubeConnected ? '/youtube-dashboard' : '/youtube-dashboard'}>
                      {youtubeConnected ? 'Manage' : 'Connect'}
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* Email Templates */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                <Mail className="w-4 h-4" /> Email Templates
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Invite User */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Invite User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite User</DialogTitle>
                      <DialogDescription>
                        Send an invitation email to a new user to join the platform.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="invite-email">Email Address</Label>
                        <Input
                          id="invite-email"
                          type="email"
                          placeholder="user@example.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <Button 
                        onClick={handleSendInvite} 
                        disabled={inviteLoading}
                        className="w-full"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {inviteLoading ? 'Sending...' : 'Send Invitation'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Magic Link */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <Link2 className="w-4 h-4 mr-2" />
                      Magic Link
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Send Magic Link</DialogTitle>
                      <DialogDescription>
                        Send a passwordless login link to an email address.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="magic-email">Email Address</Label>
                        <Input
                          id="magic-email"
                          type="email"
                          placeholder="user@example.com"
                          value={magicLinkEmail}
                          onChange={(e) => setMagicLinkEmail(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <Button 
                        onClick={handleSendMagicLink} 
                        disabled={magicLinkLoading}
                        className="w-full"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {magicLinkLoading ? 'Sending...' : 'Send Magic Link'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Reset Password */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <Key className="w-4 h-4 mr-2" />
                      Reset Password
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Send Reset Password</DialogTitle>
                      <DialogDescription>
                        Send a password reset link to an email address.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="reset-email">Email Address</Label>
                        <Input
                          id="reset-email"
                          type="email"
                          placeholder="user@example.com"
                          value={resetPasswordEmail}
                          onChange={(e) => setResetPasswordEmail(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <Button 
                        onClick={handleSendResetPassword} 
                        disabled={resetPasswordLoading}
                        className="w-full"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {resetPasswordLoading ? 'Sending...' : 'Send Reset Link'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Change Email */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <Mail className="w-4 h-4 mr-2" />
                      Change Email
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Send Change Email Confirmation</DialogTitle>
                      <DialogDescription>
                        Send a confirmation email to verify a new email address.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="change-email">New Email Address</Label>
                        <Input
                          id="change-email"
                          type="email"
                          placeholder="newemail@example.com"
                          value={changeEmailNew}
                          onChange={(e) => setChangeEmailNew(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <Button 
                        onClick={handleSendChangeEmail} 
                        disabled={changeEmailLoading}
                        className="w-full"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {changeEmailLoading ? 'Sending...' : 'Send Confirmation'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Reauthentication */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reauthentication
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Send Reauthentication</DialogTitle>
                      <DialogDescription>
                        Send a reauthentication link for sensitive account changes.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="reauth-email">Email Address</Label>
                        <Input
                          id="reauth-email"
                          type="email"
                          placeholder={user?.email || "user@example.com"}
                          value={reauthEmail}
                          onChange={(e) => setReauthEmail(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <Button 
                        onClick={handleSendReauth} 
                        disabled={reauthLoading}
                        className="w-full"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {reauthLoading ? 'Sending...' : 'Send Reauth Link'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Danger Zone */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-4">Danger Zone</h3>
              <Button variant="outline" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

