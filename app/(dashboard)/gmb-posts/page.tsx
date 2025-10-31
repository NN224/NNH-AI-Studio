"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { ArrowLeft, Calendar, Image as ImageIcon, Loader2, Send, Timer, Sparkles } from "lucide-react"

type LocationItem = { id: string; location_name: string }

export default function GMBPostsPage() {
  const supabase = createClient()
  const [locations, setLocations] = useState<LocationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [locationId, setLocationId] = useState<string>("")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [mediaUrl, setMediaUrl] = useState("")
  const [cta, setCta] = useState("")
  const [ctaUrl, setCtaUrl] = useState("")
  const [schedule, setSchedule] = useState<string>("")
  const [genLoading, setGenLoading] = useState(false)
  const [posts, setPosts] = useState<any[]>([])
  const [listLoading, setListLoading] = useState(true)

  const handleGenerate = async () => {
    try {
      setGenLoading(true)
      const res = await fetch('/api/ai/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'gmb', prompt: content || title, tone: 'friendly' })
      })
      const j = await res.json()
      if (j?.title) setTitle(j.title)
      if (j?.description) setContent(j.description)
      if (j?.hashtags && typeof j.hashtags === 'string') setCta(``) // keep CTA untouched
    } catch (e:any) {
      alert(e.message)
    } finally {
      setGenLoading(false)
    }
  }

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from("gmb_locations")
        .select("id, location_name")
        .eq("user_id", user.id)
        .order("location_name")
      setLocations((data ?? []) as any)
      setLoading(false)
      // fetch posts
      try {
        const res = await fetch('/api/gmb/posts/list')
        const j = await res.json()
        if (res.ok) setPosts(j.items || [])
      } finally {
        setListLoading(false)
      }
    })()
  }, [])

  const handleSave = async () => {
    if (!locationId || !content.trim()) return
    try {
      setSaving(true)
      const res = await fetch("/api/gmb/posts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId,
          title: title || undefined,
          content,
          mediaUrl: mediaUrl || undefined,
          callToAction: cta || undefined,
          callToActionUrl: ctaUrl || undefined,
          scheduledAt: schedule || undefined,
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || "Failed to save post")
      alert("Post saved successfully")
      return j.post?.id as string | undefined
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!locationId || !content.trim()) return
    // Ensure we have a saved post id first
    let postId = await handleSave()
    if (!postId) return
    try {
      const res = await fetch('/api/gmb/posts/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId })
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Failed to publish')
      alert('Published to Google successfully')
      // Clear form after publish
      setTitle("")
      setContent("")
      setMediaUrl("")
      setCta("")
      setCtaUrl("")
      setSchedule("")
      // refresh list
      const r = await fetch('/api/gmb/posts/list'); const jj = await r.json(); if (r.ok) setPosts(jj.items||[])
    } catch (e:any) {
      alert(e.message)
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

        <Card className="border border-primary/20 glass-strong">
          <CardHeader>
            <CardTitle>GMB Post Composer</CardTitle>
            <CardDescription>Create and schedule Business Profile posts</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {/* Location */}
            <div className="grid gap-2">
              <label className="text-sm text-muted-foreground">Location</label>
              <Select onValueChange={setLocationId} value={locationId}>
                <SelectTrigger>
                  <SelectValue placeholder={loading ? "Loading locations..." : "Select a location"} />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.location_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="grid gap-2">
              <label className="text-sm text-muted-foreground">Title (optional)</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
            </div>

            {/* Content */}
            <div className="grid gap-2">
              <label className="text-sm text-muted-foreground">Content</label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} placeholder="Write your post content..." />
              <div className="flex gap-2">
                <Button type="button" onClick={handleGenerate} variant="outline" className="gap-2" disabled={genLoading}>
                  {genLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generate with AI
                </Button>
              </div>
            </div>

            {/* Media */}
            <div className="grid gap-2">
              <label className="text-sm text-muted-foreground">Image/Media (optional)</label>
              <div className="flex gap-2">
                <Input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="URL or upload file" />
                <label className="cursor-pointer">
                  <Button variant="outline" type="button" className="gap-2" asChild>
                    <span><ImageIcon className="w-4 h-4" /> Upload</span>
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      try {
                        const formData = new FormData()
                        formData.append('file', file)
                        const res = await fetch('/api/upload/image', { method: 'POST', body: formData })
                        const j = await res.json()
                        if (res.ok && j.url) setMediaUrl(j.url)
                        else alert(j.error || 'Upload failed')
                      } catch (e: any) {
                        alert(e.message)
                      }
                    }}
                  />
                </label>
              </div>
              {mediaUrl && (
                <div className="mt-2">
                  <img src={mediaUrl} alt="Preview" className="max-w-xs rounded border border-primary/20" />
                </div>
              )}
            </div>

            {/* CTA */}
            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm text-muted-foreground">Call to Action (optional)</label>
                <Input value={cta} onChange={(e) => setCta(e.target.value)} placeholder="Book, Order, Learn more..." />
              </div>
              <div className="grid gap-2">
                <label className="text-sm text-muted-foreground">CTA URL</label>
                <Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://..." />
              </div>
            </div>

            {/* Schedule */}
            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm text-muted-foreground">Schedule (optional)</label>
                <div className="flex gap-2">
                  <Input type="datetime-local" value={schedule} onChange={(e) => setSchedule(e.target.value)} />
                  <Button variant="outline" type="button" className="gap-2" disabled>
                    <Calendar className="w-4 h-4" /> Pick
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} disabled={!locationId || !content.trim() || saving} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Save Post
              </Button>
              <Button variant="outline" type="button" className="gap-2" onClick={handlePublish}>
                <Timer className="w-4 h-4" /> Publish to Google
              </Button>
            </div>

            {/* Preview */}
            {(title || content) && (
              <div className="mt-6 border border-primary/20 rounded-xl p-4">
                <div className="text-sm text-muted-foreground mb-2">Preview</div>
                {title && <div className="font-semibold mb-1">{title}</div>}
                <div className="whitespace-pre-wrap text-sm">{content}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-primary/20 glass mt-8">
          <CardHeader>
            <CardTitle>Recent Posts</CardTitle>
            <CardDescription>Your latest drafts and published posts</CardDescription>
          </CardHeader>
          <CardContent>
            {listLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : posts.length === 0 ? (
              <div className="text-sm text-muted-foreground">No posts yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-4">Title</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Created</th>
                      <th className="py-2 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((p) => (
                      <tr key={p.id} className="border-t border-primary/10">
                        <td className="py-2 pr-4">{p.title || p.content?.slice(0,50) || 'Untitled'}</td>
                        <td className="py-2 pr-4 capitalize">{p.status}</td>
                        <td className="py-2 pr-4">{new Date(p.created_at).toLocaleString()}</td>
                        <td className="py-2 pr-4 flex gap-2">
                          <Button variant="outline" size="sm" onClick={async()=>{ setTitle(p.title||''); setContent(p.content||''); setLocationId(p.location_id); }}>Edit</Button>
                          <Button variant="outline" size="sm" onClick={async()=>{ const r = await fetch(`/api/gmb/posts/delete?id=${encodeURIComponent(p.id)}`, { method:'DELETE' }); if (r.ok) { setPosts((s)=>s.filter((x)=>x.id!==p.id)) } }}>Delete</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


