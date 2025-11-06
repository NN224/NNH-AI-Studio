'use client';

import React, { useState, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface Question {
  id: string;
  location_id: string;
  question_text: string;
  author_name: string | null;
  author_type: string | null;
  answer_text: string | null;
  answered_by: string | null;
  answered_at: string | null;
  answer_status: string | null;
  ai_suggested_answer: string | null;
  ai_confidence_score: number | null;
  upvote_count: number | null;
  created_at: string;
  updated_at: string;
}

interface Question {
  id: string;
  location_id: string;
  question_text: string;
  author_name: string | null;
  author_type: string | null;
  answer_text: string | null;
  answered_by: string | null;
  answered_at: string | null;
  answer_status: string | null;
  ai_suggested_answer: string | null;
  ai_confidence_score: number | null;
  upvote_count: number | null;
  created_at: string;
  updated_at: string;
  gmb_locations?: {
    id: string;
    location_name: string;
  };
}

// Questions Container Component (manages filter state)
export function QuestionsContainer({
  questions,
  totalCount,
  pendingCount,
  answeredCount
}: {
  questions: Question[];
  totalCount: number;
  pendingCount: number;
  answeredCount: number;
}) {
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'answered'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  return (
    <>
      <QuestionsFilters
        totalCount={totalCount}
        pendingCount={pendingCount}
        answeredCount={answeredCount}
        activeTab={activeTab}
        searchQuery={searchQuery}
        setActiveTab={setActiveTab}
        setSearchQuery={setSearchQuery}
      />
      <QuestionsList 
        questions={questions}
        activeTab={activeTab}
        searchQuery={searchQuery}
      />
    </>
  );
}

export function QuestionsFilters({
  totalCount,
  pendingCount,
  answeredCount,
  activeTab,
  searchQuery,
  setActiveTab,
  setSearchQuery
}: {
  totalCount: number;
  pendingCount: number;
  answeredCount: number;
  activeTab: 'all' | 'pending' | 'answered';
  searchQuery: string;
  setActiveTab: (tab: 'all' | 'pending' | 'answered') => void;
  setSearchQuery: (query: string) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-3">
        <Button
          onClick={() => setActiveTab('all')}
          variant={activeTab === 'all' ? 'default' : 'outline'}
          size="sm"
          className={
            activeTab === 'all'
              ? 'bg-orange-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }
        >
          All Questions ({totalCount})
        </Button>
        <Button
          onClick={() => setActiveTab('pending')}
          variant={activeTab === 'pending' ? 'default' : 'outline'}
          size="sm"
          className={
            activeTab === 'pending'
              ? 'bg-orange-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }
        >
          Pending ({pendingCount})
        </Button>
        <Button
          onClick={() => setActiveTab('answered')}
          variant={activeTab === 'answered' ? 'default' : 'outline'}
          size="sm"
          className={
            activeTab === 'answered'
              ? 'bg-orange-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }
        >
          Answered ({answeredCount})
        </Button>
      </div>
      
      {/* Search & Filters */}
      <div className="flex gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none"
          />
        </div>
        <select className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-orange-500 focus:outline-none">
          <option>All Locations</option>
        </select>
        <select className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-orange-500 focus:outline-none">
          <option>Sort by Date</option>
          <option>Sort by Upvotes</option>
        </select>
      </div>
    </div>
  );
}

// Questions List Component (separate for better organization)
export function QuestionsList({ 
  questions,
  activeTab,
  searchQuery
}: { 
  questions: Question[];
  activeTab: 'all' | 'pending' | 'answered';
  searchQuery: string;
}) {
  // Filter questions based on active tab and search query
  let filteredQuestions = questions;
  
  // Filter by tab
  if (activeTab === 'pending') {
    filteredQuestions = questions.filter(q => !q.answer_text || q.answer_text.trim() === '' || q.answer_status === 'pending');
  } else if (activeTab === 'answered') {
    filteredQuestions = questions.filter(q => q.answer_text && q.answer_text.trim() !== '' && q.answer_status === 'answered');
  }
  
  // Filter by search query
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filteredQuestions = filteredQuestions.filter(q => 
      q.question_text.toLowerCase().includes(query) ||
      q.author_name?.toLowerCase().includes(query) ||
      q.gmb_locations?.location_name.toLowerCase().includes(query)
    );
  }
  
  if (filteredQuestions.length === 0) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-12 text-center">
        <div className="text-6xl mb-4">❓</div>
        <h3 className="text-xl font-bold text-white mb-2">
          {searchQuery ? 'No questions found' : 'No questions yet'}
        </h3>
        <p className="text-zinc-400">
          {searchQuery 
            ? 'Try adjusting your search or filters'
            : 'Customer questions will appear here when they ask about your business'}
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {filteredQuestions.map((question) => (
        <QuestionCard
          key={question.id}
          question={question}
          locationName={question.gmb_locations?.location_name || 'Unknown Location'}
        />
      ))}
    </div>
  );
}

export function QuestionCard({
  question,
  locationName
}: {
  question: Question;
  locationName: string;
}) {
  const [isAnswering, setIsAnswering] = useState(false);
  const [answerText, setAnswerText] = useState(question.answer_text || '');
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async () => {
    if (!answerText.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/gmb/questions/${question.id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answerText: answerText.trim(),
          answerStatus: 'answered'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Reload page to show updated answer
          window.location.reload();
        } else {
          alert(data.error || 'Failed to submit answer. Please try again.');
        }
      } else {
        const error = await response.json().catch(() => ({ error: 'Failed to submit answer' }));
        alert(error.error || 'Failed to submit answer. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      alert('Failed to submit answer. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const isPending = !question.answer_text || question.answer_text.trim() === '' || question.answer_status === 'pending';
  
  return (
    <Card className="bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-orange-500/30 transition">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-bold text-white">{locationName}</h3>
              {isPending ? (
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                  ⏳ Pending
                </Badge>
              ) : (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  ✅ Answered
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-500">
              <span>👤 {question.author_name || 'Anonymous'}</span>
              <span>•</span>
              <span>{new Date(question.created_at).toLocaleDateString()}</span>
              {question.upvote_count && question.upvote_count > 0 && (
                <>
                  <span>•</span>
                  <span>👍 {question.upvote_count} upvotes</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Question */}
        <div className="mb-4">
          <div className="text-sm text-zinc-400 mb-1">Question:</div>
          <div className="text-white">{question.question_text}</div>
        </div>
        
        {/* AI Suggestion (if available) */}
        {question.ai_suggested_answer && isPending && (
          <div className="bg-orange-950/30 border border-orange-500/30 rounded-lg p-4 mb-4">
            <div className="text-sm text-orange-400 mb-2 flex items-center gap-2">
              <span>🤖</span>
              <span className="font-medium">AI Suggested Answer</span>
              {question.ai_confidence_score && (
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
                  {Math.round(question.ai_confidence_score * 100)}% confidence
                </Badge>
              )}
            </div>
            <div className="text-sm text-zinc-300 mb-3">{question.ai_suggested_answer}</div>
            <Button
              onClick={() => setAnswerText(question.ai_suggested_answer || '')}
              size="sm"
              variant="outline"
              className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
            >
              Use This Answer
            </Button>
          </div>
        )}
        
        {/* Answer Section */}
        {!isPending && question.answer_text && !isAnswering ? (
          <div className="bg-zinc-800/50 rounded-lg p-4 mb-4">
            <div className="text-sm text-zinc-400 mb-1">Your Answer:</div>
            <div className="text-white text-sm mb-3">{question.answer_text}</div>
            {question.answered_at && (
              <div className="text-xs text-zinc-500 mb-3">
                Answered on {new Date(question.answered_at).toLocaleDateString()}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                onClick={() => setIsAnswering(true)}
                size="sm"
                variant="outline"
                className="bg-zinc-700 hover:bg-zinc-600"
              >
                ✏️ Edit
              </Button>
              <Button
                onClick={() => alert('Delete functionality coming soon')}
                size="sm"
                variant="outline"
                className="bg-red-900/20 hover:bg-red-900/40 text-red-400 border-red-500/30"
              >
                🗑️ Remove
              </Button>
            </div>
          </div>
        ) : isPending || isAnswering ? (
          <div className="space-y-3">
            <textarea
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="Type your answer here..."
              rows={4}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none resize-none"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleSubmit}
                disabled={loading || !answerText.trim()}
                className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
              >
                {loading ? '⏳ Submitting...' : '📤 Submit Answer'}
              </Button>
              <Button
                onClick={() => alert('Save as draft - coming soon')}
                variant="outline"
                className="bg-zinc-700 hover:bg-zinc-600"
              >
                💾 Save as Draft
              </Button>
              {isAnswering && (
                <Button
                  onClick={() => {
                    setIsAnswering(false);
                    setAnswerText(question.answer_text || '');
                  }}
                  variant="outline"
                  className="bg-zinc-800 hover:bg-zinc-700"
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function AIAssistantPanel() {
  return (
    <div className="sticky top-6">
      <Card className="bg-gradient-to-br from-orange-950/50 to-zinc-900 border border-orange-500/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center text-2xl">
              🤖
            </div>
            <div>
              <h3 className="font-bold text-white">AI Assistant</h3>
              <p className="text-xs text-zinc-400">Powered by Claude</p>
            </div>
          </div>
          
          <div className="bg-zinc-900/50 rounded-lg p-4 mb-4">
            <div className="text-sm text-zinc-400 mb-2">💡 Quick Tip:</div>
            <div className="text-sm text-zinc-300">
              Select a pending question to get AI-powered answer suggestions
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Auto-Answer</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
              </label>
            </div>
            
            <Button
              onClick={() => alert('AI Settings - coming in Phase 3')}
              variant="outline"
              className="w-full bg-zinc-800 hover:bg-zinc-700 border-zinc-700"
            >
              ⚙️ AI Settings
            </Button>
          </div>
          
          <div className="mt-6 pt-6 border-t border-zinc-800">
            <div className="text-xs text-zinc-500 text-center">
              AI features coming in Phase 3
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

