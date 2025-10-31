"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Sparkles } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { GMBReview } from "@/lib/types/database"

interface ReplyDialogProps {
  review: GMBReview | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onReply?: (reply: string) => Promise<void>
}

export function ReplyDialog({ review, open, onOpenChange, onReply }: ReplyDialogProps) {
  const [reply, setReply] = useState("")
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleGenerateAI = async () => {
    if (!review) return
    setGenerating(true)

    try {
      // Simulate AI generation (in production, this would call an AI API)
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const aiResponse = `Thank you for your ${review.rating}-star review, ${review.reviewer_name}! ${
        review.rating >= 4
          ? "We're thrilled to hear you had a great experience with us. Your feedback means a lot to our team!"
          : "We appreciate your feedback and apologize for any inconvenience. We'd love to make things right - please reach out to us directly so we can address your concerns."
      }`

      setReply(aiResponse)

      // Save AI suggestion to database
      await supabase.from("gmb_reviews").update({ ai_suggested_reply: aiResponse }).eq("id", review.id)
    } catch (error) {
      console.error("Error generating AI response:", error)
    } finally {
      setGenerating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!review) return
    setLoading(true)

    try {
      if (onReply) {
        // Use the provided onReply callback
        await onReply(reply)
        setReply("")
      } else {
        // Fallback to internal handling
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) throw new Error("Not authenticated")

        const { error } = await supabase
          .from("gmb_reviews")
          .update({
            review_reply: reply,
            replied_at: new Date().toISOString(),
            status: "responded",
          })
          .eq("id", review.id)

        if (error) throw error

        // Log activity
        await supabase.from("activity_logs").insert({
          user_id: user.id,
          activity_type: "review",
          activity_message: `Replied to review from ${review.reviewer_name}`,
          actionable: false,
        })

        onOpenChange(false)
        setReply("")
        router.refresh()
      }
    } catch (error) {
      console.error("Error submitting reply:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-primary/30 text-foreground sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-foreground">Reply to Review</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {review && `Responding to ${review.reviewer_name}'s ${review.rating}-star review`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {review?.comment && (
              <div className="p-3 rounded-lg bg-secondary border border-primary/20">
                <p className="text-sm text-foreground">{review.comment}</p>
              </div>
            )}
            <div className="space-y-2">
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Write your response..."
                className="bg-secondary border-primary/30 text-foreground resize-none min-h-[150px]"
                required
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleGenerateAI}
              disabled={generating}
              className="w-full border-primary/30 text-foreground hover:bg-primary/20 bg-transparent"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating AI Response...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate AI Response
                </>
              )}
            </Button>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-primary/30 text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !reply}
              className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Reply"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
