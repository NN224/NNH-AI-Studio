"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, Loader2, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

interface LocationQASectionProps {
  locationId: string;
  locationName: string;
}

export function LocationQASection({ locationId, locationName }: LocationQASectionProps) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [answering, setAnswering] = useState(false);

  React.useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/gmb/questions?locationId=${locationId}`);
        const data = await response.json();
        
        if (response.ok && data.questions) {
          setQuestions(data.questions);
        }
      } catch (error) {
        console.error('Error fetching questions:', error);
        toast.error('Failed to load questions');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [locationId]);

  const handleAnswer = async (questionId: string) => {
    if (!answerText.trim()) {
      toast.error('Please enter an answer');
      return;
    }

    try {
      setAnswering(true);
      const response = await fetch(`/api/gmb/questions/${questionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: answerText }),
      });

      if (!response.ok) {
        throw new Error('Failed to send answer');
      }

      toast.success('Answer posted successfully!');
      setSelectedQuestion(null);
      setAnswerText('');
      
      // Refresh questions
      const refreshResponse = await fetch(`/api/gmb/questions?locationId=${locationId}`);
      const refreshData = await refreshResponse.json();
      if (refreshResponse.ok && refreshData.questions) {
        setQuestions(refreshData.questions);
      }
    } catch (error) {
      console.error('Answer error:', error);
      toast.error('Failed to post answer');
    } finally {
      setAnswering(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const unansweredQuestions = questions.filter((q: any) => !q.topAnswer);
  const answeredQuestions = questions.filter((q: any) => q.topAnswer);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading questions...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
            <MessageCircle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{questions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unanswered</CardTitle>
            <HelpCircle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unansweredQuestions.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Unanswered Questions */}
      {unansweredQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Unanswered Questions ({unansweredQuestions.length})</CardTitle>
              <Badge variant="destructive">Action Required</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {unansweredQuestions.map((question: any) => (
                <div
                  key={question.questionId}
                  className="p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium">
                          {question.author?.displayName || 'Anonymous'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(question.createTime || question.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{question.text}</p>
                    </div>
                  </div>

                  {/* Answer Section */}
                  {selectedQuestion === question.questionId ? (
                    <div className="mt-3 space-y-2">
                      <Textarea
                        placeholder="Write your answer..."
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAnswer(question.questionId)}
                          disabled={answering}
                        >
                          {answering ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Posting...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Post Answer
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedQuestion(null);
                            setAnswerText('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => setSelectedQuestion(question.questionId)}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Answer Question
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Answered Questions */}
      {answeredQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Answered Questions ({answeredQuestions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {answeredQuestions.map((question: any) => (
                <div
                  key={question.questionId}
                  className="p-4 rounded-lg border"
                >
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium">
                        {question.author?.displayName || 'Anonymous'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(question.createTime || question.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{question.text}</p>
                  </div>

                  {/* Answer */}
                  {question.topAnswer && (
                    <div className="mt-3 p-3 rounded-lg bg-muted">
                      <p className="text-xs font-medium mb-1">Your Answer:</p>
                      <p className="text-sm text-muted-foreground">{question.topAnswer.text}</p>
                      {question.topAnswer.updateTime && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Answered {formatDate(question.topAnswer.updateTime)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {questions.length === 0 && (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No questions yet</h3>
              <p className="text-sm text-muted-foreground">
                Customers haven't asked any questions about this location yet
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
