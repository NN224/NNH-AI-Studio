'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bot, Zap, MessageSquare, CheckCircle, Clock } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils/date-utils';

interface Question {
  id: string;
  question_text: string;
  answer_text?: string;
  location_name: string;
  ai_answered?: boolean;
  confidence_score?: number;
  answered_by?: string;
  answered_at?: string;
  created_at: string;
  ai_provider?: string;
  response_time_ms?: number;
  published?: boolean;
  status?: 'pending' | 'answered' | 'published';
}

interface EnhancedQuestionsListProps {
  questions: Question[];
  onManualAnswer?: (questionId: string) => void;
  onPublish?: (questionId: string) => void;
  onEdit?: (questionId: string) => void;
}

export function EnhancedQuestionsList({
  questions,
  onManualAnswer,
  onPublish,
  onEdit,
}: EnhancedQuestionsListProps) {
  return (
    <div className="space-y-4">
      {questions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              لا توجد أسئلة
            </h3>
            <p className="text-sm text-gray-500">
              عندما يطرح العملاء أسئلة، ستظهر هنا
            </p>
          </CardContent>
        </Card>
      ) : (
        questions.map((question) => (
          <Card key={question.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  {/* Header with badges */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {question.location_name}
                    </Badge>
                    
                    {question.ai_answered && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Bot className="w-3 h-3" />
                        رد تلقائي
                      </Badge>
                    )}
                    
                    {question.confidence_score && (
                      <Badge
                        variant={
                          question.confidence_score >= 80
                            ? 'default'
                            : question.confidence_score >= 60
                            ? 'secondary'
                            : 'destructive'
                        }
                        className="text-xs"
                      >
                        ثقة {question.confidence_score}%
                      </Badge>
                    )}

                    {question.status === 'pending' && (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <Clock className="w-3 h-3" />
                        قيد المراجعة
                      </Badge>
                    )}

                    {question.published && (
                      <Badge variant="default" className="gap-1 text-xs bg-green-500">
                        <CheckCircle className="w-3 h-3" />
                        منشور
                      </Badge>
                    )}
                  </div>

                  {/* Question text */}
                  <h3 className="font-medium text-gray-900 mb-2">
                    {question.question_text}
                  </h3>
                  
                  {/* Answer section */}
                  {question.answer_text && (
                    <div className="bg-blue-50 rounded-lg p-3 mt-2 border border-blue-100">
                      <p className="text-sm text-gray-700 mb-2">
                        {question.answer_text}
                      </p>
                      
                      {/* Answer metadata */}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Bot className="w-3 h-3" />
                          {question.answered_by || 'AI Assistant'}
                        </span>
                        
                        {question.answered_at && (
                          <span>
                            {formatRelativeTime(question.answered_at)}
                          </span>
                        )}
                        
                        {question.response_time_ms && question.ai_provider && (
                          <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            {question.response_time_ms}ms
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Question metadata */}
                  <div className="mt-2 text-xs text-gray-500">
                    <span>
                      طُرح {formatRelativeTime(question.created_at)}
                    </span>
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="flex gap-2 mr-4">
                  {!question.answer_text && onManualAnswer && (
                    <Button
                      size="sm"
                      onClick={() => onManualAnswer(question.id)}
                      className="whitespace-nowrap"
                    >
                      أجب يدوياً
                    </Button>
                  )}
                  
                  {question.answer_text && !question.published && onPublish && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onPublish(question.id)}
                      className="whitespace-nowrap"
                    >
                      نشر
                    </Button>
                  )}

                  {question.answer_text && !question.published && onEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEdit(question.id)}
                      className="whitespace-nowrap"
                    >
                      تعديل
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
