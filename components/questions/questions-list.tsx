"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, HelpCircle, CheckCircle2, Clock, Loader2, Send, Edit2, Trash2, Save, X } from "lucide-react"
import { toast } from "sonner"

interface Question {
  id: string
  location_id: string
  location: {
    id: string
    location_name: string
  }
  question_text: string
  author_name?: string
  author_type?: string
  answer_text?: string
  answered_by?: string
  answered_at?: string
  answer_status: 'pending' | 'answered' | 'draft'
  ai_suggested_answer?: string
  ai_confidence_score?: number
  upvote_count: number
  created_at: string
  updated_at: string
}

interface QuestionCounts {
  total: number
  pending: number
  answered: number
  draft: number
}

export function QuestionsList() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [counts, setCounts] = useState<QuestionCounts>({ total: 0, pending: 0, answered: 0, draft: 0 })
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'answered' | 'draft'>('all')
  const [answerText, setAnswerText] = useState<{ [key: string]: string }>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchQuestions()
  }, [activeTab])

  const fetchQuestions = async () => {
    try {
      setLoading(true)
      setError(null)

      const status = activeTab === 'all' ? undefined : activeTab
      const url = new URL('/api/gmb/questions', window.location.origin)
      if (status) url.searchParams.set('status', status)

      const response = await fetch(url.toString())
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `Failed to fetch questions (${response.status})`)
      }

      const data = await response.json()

      if (!data || !data.data) {
        throw new Error('Invalid response from server')
      }

      setQuestions(Array.isArray(data.data.questions) ? data.data.questions : [])
      setCounts({
        total: data.data.counts?.total || 0,
        pending: data.data.counts?.pending || 0,
        answered: data.data.counts?.answered || 0,
        draft: data.data.counts?.draft || 0,
      })
    } catch (err: any) {
      console.error("Error fetching questions:", err)
      const errorMessage = err.message || "Failed to fetch questions"
      setError(errorMessage)
      setQuestions([]) // Set empty array on error
      setCounts({ total: 0, pending: 0, answered: 0, draft: 0 })
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleAnswer = async (questionId: string, isDraft: boolean = false) => {
    const answer = answerText[questionId]
    if (!answer?.trim()) {
      toast.error("Please enter an answer")
      return
    }

    setSubmitting(questionId)
    try {
      const response = await fetch(`/api/gmb/questions/${questionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answerText: answer.trim(), isDraft })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `Failed to submit answer (${response.status})`)
      }

      const data = await response.json()

      if (!data || !data.data) {
        throw new Error('Invalid response from server')
      }

      toast.success(isDraft ? "Draft saved successfully" : "Question answered successfully")
      setAnswerText({ ...answerText, [questionId]: '' })
      setEditingId(null)
      await fetchQuestions()
    } catch (err: any) {
      console.error("Error submitting answer:", err)
      const errorMessage = err.message || "Failed to submit answer"
      toast.error(errorMessage)
    } finally {
      setSubmitting(null)
    }
  }

  const handleDeleteAnswer = async (questionId: string) => {
    if (!confirm("Are you sure you want to remove this answer?")) return

    setSubmitting(questionId)
    try {
      const response = await fetch(`/api/gmb/questions/${questionId}/answer`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `Failed to remove answer (${response.status})`)
      }

      const data = await response.json()

      if (!data || !data.data) {
        throw new Error('Invalid response from server')
      }

      toast.success("Answer removed successfully")
      await fetchQuestions()
    } catch (err: any) {
      console.error("Error removing answer:", err)
      const errorMessage = err.message || "Failed to remove answer"
      toast.error(errorMessage)
    } finally {
      setSubmitting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="bg-card border-primary/30">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={fetchQuestions} className="mt-4" variant="outline">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Questions & Answers</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage customer questions and provide helpful answers
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-primary/10">
            Total: {counts.total}
          </Badge>
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">
            Pending: {counts.pending}
          </Badge>
          <Badge variant="outline" className="bg-green-500/10 text-green-600">
            Answered: {counts.answered}
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Questions</TabsTrigger>
          <TabsTrigger value="pending">
            Pending
            {counts.pending > 0 && (
              <Badge className="ml-2 h-5 px-1" variant="secondary">
                {counts.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="answered">Answered</TabsTrigger>
          <TabsTrigger value="draft">Drafts</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {questions.length === 0 ? (
            <Card className="bg-card border-primary/30">
              <CardContent className="p-12 text-center">
                <HelpCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {activeTab === 'pending' ? 'No Pending Questions' : 
                   activeTab === 'answered' ? 'No Answered Questions' :
                   activeTab === 'draft' ? 'No Draft Answers' :
                   'No Questions Yet'}
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {activeTab === 'pending' ? 
                    'All questions have been answered or saved as drafts.' :
                   activeTab === 'answered' ? 
                    'No questions have been answered yet.' :
                   activeTab === 'draft' ? 
                    'No draft answers saved.' :
                    'Customer questions will appear here when they ask about your business locations.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {questions.map((question) => (
                <Card key={question.id} className="bg-card border-primary/30">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {question.location?.location_name || 'Unknown Location'}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          <span className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            {question.created_at 
                              ? new Date(question.created_at).toLocaleDateString()
                              : 'No date'}
                            {question.author_name && (
                              <>
                                <span className="text-muted-foreground">•</span>
                                <span>Asked by {question.author_name}</span>
                              </>
                            )}
                          </span>
                        </CardDescription>
                      </div>
                      {question.answer_status === 'answered' ? (
                        <Badge variant="default" className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Answered
                        </Badge>
                      ) : question.answer_status === 'draft' ? (
                        <Badge variant="outline" className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30">
                          <Edit2 className="w-3 h-3 mr-1" />
                          Draft
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="font-medium text-foreground mb-2">Question:</p>
                      <p className="text-muted-foreground">{question.question_text}</p>
                      {question.upvote_count > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          👍 {question.upvote_count} people found this helpful
                        </p>
                      )}
                    </div>

                    {question.ai_suggested_answer && !question.answer_text && (
                      <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                        <p className="text-xs font-medium text-primary mb-1">
                          AI Suggested Answer {question.ai_confidence_score && 
                            `(${Math.round(question.ai_confidence_score * 100)}% confidence)`}
                        </p>
                        <p className="text-sm text-muted-foreground">{question.ai_suggested_answer}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-2"
                          onClick={() => {
                            setAnswerText({ ...answerText, [question.id]: question.ai_suggested_answer || '' })
                            setEditingId(question.id)
                          }}
                        >
                          Use this answer
                        </Button>
                      </div>
                    )}

                    {question.answer_text && editingId !== question.id ? (
                      <div>
                        <p className="font-medium text-foreground mb-2">Answer:</p>
                        <p className="text-muted-foreground">{question.answer_text}</p>
                        {question.answered_at && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Answered on {new Date(question.answered_at).toLocaleDateString()}
                            {question.answered_by && ` by ${question.answered_by}`}
                          </p>
                        )}
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setAnswerText({ ...answerText, [question.id]: question.answer_text || '' })
                              setEditingId(question.id)
                            }}
                          >
                            <Edit2 className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteAnswer(question.id)}
                            disabled={submitting === question.id}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    ) : (editingId === question.id || !question.answer_text) && (
                      <div className="space-y-3">
                        <Textarea
                          placeholder="Type your answer here..."
                          value={answerText[question.id] || ''}
                          onChange={(e) => setAnswerText({ ...answerText, [question.id]: e.target.value })}
                          className="min-h-[100px]"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleAnswer(question.id, false)}
                            disabled={submitting === question.id || !answerText[question.id]?.trim()}
                          >
                            {submitting === question.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <Send className="h-4 w-4 mr-1" />
                            )}
                            Submit Answer
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAnswer(question.id, true)}
                            disabled={submitting === question.id || !answerText[question.id]?.trim()}
                          >
                            <Save className="h-4 w-4 mr-1" />
                            Save as Draft
                          </Button>
                          {editingId === question.id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingId(null)
                                setAnswerText({ ...answerText, [question.id]: '' })
                              }}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}