"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import { ArrowLeft, Loader2, Send, Sparkles, Timer, Trash2, FileVideo } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type Draft = { id: string; title: string; description: string; hashtags: string; created_at: string }

export default function YouTubePostsPage() {
  const supabase = createClient()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [hashtags, setHashtags] = useState("")
  const [schedule, setSchedule] = useState("")
  const [genLoading, setGenLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loadingDrafts, setLoadingDrafts] = useState(true)

  const handleGenerate = async () => {
    try {
      setGenLoading(true)
      const res = await fetch('/api/ai/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'youtube', prompt: title || description, tone: 'energetic' })
      })
      const j = await res.json()
      if (j?.title) setTitle(j.title)
      if (j?.description) setDescription(j.description)
      if (j?.hashtags) setHashtags(j.hashtags)
    } catch (e:any) {
      alert(e.message)
    } finally {
      setGenLoading(false)
    }
  }

  const fetchDrafts = async () => {
    try {
      setLoadingDrafts(true)
      const res = await fetch('/api/youtube/composer/drafts')
      const j = await res.json()
      if (res.ok) setDrafts(j.items || [])
    } finally {
      setLoadingDrafts(false)
    }
  }

  useEffect(() => {
    fetchDrafts()
  }, [])

  const handleSaveDraft = async () => {
    try {
      setSaving(true)
      const res = await fetch('/api/youtube/composer/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, hashtags })
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Failed to save draft')
      alert('Draft saved')
      setTitle("")
      setDescription("")
      setHashtags("")
      fetchDrafts()
    } catch (e:any) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteDraft = async (id: string) => {
    if (!confirm('Delete this draft?')) return
    try {
      const res = await fetch(`/api/youtube/composer/drafts?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (res.ok) fetchDrafts()
      else alert('Failed to delete')
    } catch (e: any) {
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
            <CardTitle>YouTube Post Composer</CardTitle>
            <CardDescription>Generate titles and descriptions with AI, then save as draft or schedule</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm text-muted-foreground">Title</label>
              <Input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Video title" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm text-muted-foreground">Description</label>
              <Textarea value={description} onChange={(e)=>setDescription(e.target.value)} rows={8} placeholder="Video description" />
              <div className="flex gap-2">
                <Button type="button" onClick={handleGenerate} variant="outline" className="gap-2" disabled={genLoading}>
                  {genLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generate with AI
                </Button>
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-sm text-muted-foreground">Hashtags</label>
              <Input value={hashtags} onChange={(e)=>setHashtags(e.target.value)} placeholder="#NNH #AI #YouTube" />
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm text-muted-foreground">Schedule (optional)</label>
                <Input type="datetime-local" value={schedule} onChange={(e)=>setSchedule(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSaveDraft} disabled={!title.trim() || !description.trim() || saving} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Save Draft
              </Button>
              <Button variant="outline" type="button" className="gap-2" disabled title="YouTube video upload coming soon - drafts can be saved">
                <Timer className="w-4 h-4" /> Upload to YouTube
              </Button>
            </div>

            {/* Preview */}
            {(title || description) && (
              <div className="mt-6 border border-primary/20 rounded-xl p-4">
                <div className="text-sm text-muted-foreground mb-2">Preview</div>
                {title && <div className="font-semibold mb-1">{title}</div>}
                <div className="whitespace-pre-wrap text-sm">{description}</div>
                {hashtags && <div className="text-xs text-muted-foreground mt-2">{hashtags}</div>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-primary/20 glass mt-8">
          <CardHeader>
            <CardTitle>Saved Drafts</CardTitle>
            <CardDescription>Your saved YouTube video drafts</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingDrafts ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : drafts.length === 0 ? (
              <div className="text-sm text-muted-foreground">No drafts yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-4">Title</th>
                      <th className="py-2 pr-4">Created</th>
                      <th className="py-2 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drafts.map((d) => (
                      <tr key={d.id} className="border-t border-primary/10">
                        <td className="py-2 pr-4">{d.title || 'Untitled'}</td>
                        <td className="py-2 pr-4">{new Date(d.created_at).toLocaleString()}</td>
                        <td className="py-2 pr-4 flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => { setTitle(d.title); setDescription(d.description); setHashtags(d.hashtags || ''); }}>Load</Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteDraft(d.id)}><Trash2 className="w-4 h-4" /></Button>
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


