"use client"

import type React from "react"

import { useEffect, useId, useState } from "react"
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
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { replyToReview, updateReply } from "@/server/actions/reviews-management"
import type { GMBReview } from "@/lib/types/database"
import { useAutoSave } from "@/hooks/use-auto-save"
import { formatDistanceToNow } from "date-fns"

interface ReplyDialogProps {
  readonly review: GMBReview | null
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly onSuccess?: () => void
}

export function ReplyDialog({
  review,
  isOpen,
  onClose,
  onSuccess,
}: Readonly<ReplyDialogProps>) {
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const router = useRouter()
  const textareaId = useId()
  const initialReplyValue = review?.reply_text || review?.response_text || review?.review_reply || ""
  const draftKey = review ? `review:${review.id}` : null

  const {
    value: reply,
    setValue: setReply,
    lastSavedAt,
    showRestorePrompt,
    pendingDraftTimestamp,
    restoreDraft,
    discardDraft,
    clearDraft,
    isDirty,
  } = useAutoSave({
    key: draftKey,
    type: "review_reply",
    initialValue: initialReplyValue,
  })

  useEffect(() => {
    if (!isOpen) {
      setGenerating(false)
      setLoading(false)
    }
  }, [isOpen])

  const handleGenerateAI = async () => {
    if (!review) return
    setGenerating(true)

    try {
      // Call AI API to generate response
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "review_response",
          context: {
            reviewText: review.review_text || "",
            rating: review.rating,
            reviewerName: review.reviewer_name,
            sentiment: review.ai_sentiment,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to generate AI response')
      }

      const { content } = await response.json()

      if (!content || typeof content !== "string") {
        throw new Error("Invalid response from AI service")
      }

      setReply(content)

      toast.success("AI response generated!", {
        description: "Review and edit before sending",
      })
    } catch (error) {
      console.error("Error generating AI response:", error)
      // Fallback to simple template if AI fails
      const fallbackResponse = `Thank you for your ${review.rating}-star review, ${review.reviewer_name ?? "customer"}! ${
        review.rating >= 4
          ? "We're thrilled to hear you had a great experience with us. Your feedback means a lot to our team!"
          : "We appreciate your feedback and apologize for any inconvenience. We'd love to make things right - please reach out to us directly so we can address your concerns."
      }`
      setReply(fallbackResponse)
    } finally {
      setGenerating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!review || !reply.trim()) {
      toast.error("Please enter a reply")
      return
    }

    if (reply.length > 4096) {
      toast.error("Reply is too long. Maximum 4096 characters.")
      return
    }

    setLoading(true)

    try {
      let result

      // Check if review already has a reply (update) or is new (create)
      if (review.has_reply) {
        result = await updateReply(review.id, reply.trim())
      } else {
        result = await replyToReview(review.id, reply.trim())
      }

      if (result.success) {
        toast.success(result.message || "Reply posted successfully!", {
          description: "Your reply is now visible on Google",
        })
        clearDraft()
        setReply("")
        onClose()
        onSuccess?.()
        router.refresh()
      } else {
        toast.error("Failed to post reply", {
          description: result.error,
          action: result.error?.includes("reconnect")
            ? {
                label: "Settings",
                onClick: () => router.push("/settings"),
              }
            : undefined,
        })
      }
    } catch (error) {
      console.error("Error submitting reply:", error)
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"
      toast.error("An unexpected error occurred", {
        description: errorMessage,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose()
        }
      }}
    >
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">
            {review?.has_reply ? "Edit Reply" : "Reply to Review"}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {review ? `Responding to ${review.reviewer_name}'s ${review.rating}-star review` : null}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {showRestorePrompt && (
              <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 flex flex-col gap-2">
                <div className="text-sm text-yellow-100">
                  Found a saved draft
                  {pendingDraftTimestamp && (
                    <> saved {formatDistanceToNow(pendingDraftTimestamp, { addSuffix: true })}</>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="bg-yellow-500/80 text-black hover:bg-yellow-400"
                    onClick={() => {
                      const previousValue = reply
                      restoreDraft()
                      toast.success("Draft restored", {
                        action: {
                          label: "Undo",
                          onClick: () => setReply(previousValue),
                        },
                      })
                    }}
                  >
                    Restore draft
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={discardDraft}
                    className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            )}
            {review?.review_text && (
              <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-yellow-500">{"⭐".repeat(review.rating)}</span>
                  <span className="text-zinc-400 text-sm">{review.reviewer_name}</span>
                </div>
                <p className="text-sm text-zinc-300">{review.review_text}</p>
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor={textareaId} className="text-sm font-medium text-zinc-300">
                  Your Reply
                </label>
                <span className={`text-xs ${reply.length > 4096 ? "text-red-400" : "text-zinc-500"}`}>
                  {reply.length} / 4096
                </span>
              </div>
              <Textarea
                id={textareaId}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Write your response..."
                className="w-full bg-zinc-800 border-zinc-700 text-zinc-100 resize-none min-h-[150px]"
                maxLength={4200}
                required
              />
              {reply.length > 4096 && (
                <p className="text-xs text-red-400">Reply exceeds the 4096 character limit</p>
              )}
              <div className="flex items-center justify-between text-xs mt-1">
                <span className={isDirty ? "text-orange-400 flex items-center gap-1" : "text-zinc-500"}>
                  {isDirty ? (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                      Unsaved changes
                    </>
                  ) : lastSavedAt ? (
                    <>Draft saved {formatDistanceToNow(lastSavedAt, { addSuffix: true })}</>
                  ) : (
                    "Drafts auto-save every second"
                  )}
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleGenerateAI}
              disabled={generating}
              className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800"
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
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="w-full sm:w-auto border-zinc-700 text-zinc-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !reply.trim() || reply.length > 4096}
              className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {review?.has_reply ? "Updating..." : "Posting..."}
                </>
              ) : (
                review?.has_reply ? "Update Reply" : "Post Reply"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
