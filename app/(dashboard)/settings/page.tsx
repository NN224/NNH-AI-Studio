"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { ArrowLeft, Settings, Building2, Play, LogOut, User, Mail, Shield } from "lucide-react"
import Image from "next/image"

export default function SettingsPage() {
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [gmbConnected, setGmbConnected] = useState(false)
  const [youtubeConnected, setYoutubeConnected] = useState(false)

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

