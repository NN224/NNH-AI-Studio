import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { QuestionsContainer, AIAssistantPanel } from './QuestionsClient';

// TypeScript Interfaces
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

interface QuestionStats {
  total: number;
  pending: number;
  answered: number;
  drafts: number;
  responseRate: string;
  avgResponseTime: string;
}

// Data Fetching Function
async function getQuestionsData() {
  const supabase = await createClient();
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return [];
    }

    // Fetch all questions with location info
    const { data: questions, error } = await supabase
      .from('gmb_questions')
      .select(`
        *,
        gmb_locations (
          id,
          location_name
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Questions fetch error:', error);
      return [];
    }
    
    return (questions || []) as Question[];
  } catch (error) {
    console.error('Questions fetch error:', error);
    return [];
  }
}

// Stats Calculation
function calculateQuestionStats(questions: Question[]): QuestionStats {
  const total = questions.length;
  const answered = questions.filter(q => q.answer_text && q.answer_text.trim() !== '' && q.answer_status === 'answered').length;
  const pending = questions.filter(q => !q.answer_text || q.answer_text?.trim() === '' || q.answer_status === 'pending').length;
  const drafts = questions.filter(q => q.answer_status === 'draft').length;
  
  const responseRate = total > 0 ? ((answered / total) * 100).toFixed(1) : '0.0';
  
  // Calculate avg response time
  const answeredQuestions = questions.filter(q => q.answered_at && q.created_at);
  let avgResponseTime = 'N/A';
  
  if (answeredQuestions.length > 0) {
    const totalHours = answeredQuestions.reduce((acc, q) => {
      const created = new Date(q.created_at);
      const answered = new Date(q.answered_at!);
      const hours = (answered.getTime() - created.getTime()) / (1000 * 60 * 60);
      return acc + hours;
    }, 0);
    
    const avgHours = Math.round(totalHours / answeredQuestions.length);
    avgResponseTime = avgHours < 24 ? `${avgHours}h` : `${Math.round(avgHours / 24)}d`;
  }
  
  return {
    total,
    pending,
    answered,
    drafts,
    responseRate,
    avgResponseTime
  };
}

// Stats Card Component
function StatsCard({
  title,
  value,
  icon,
  color,
  badge
}: {
  title: string;
  value: string | number;
  icon: string;
  color: 'blue' | 'orange' | 'green' | 'purple' | 'zinc';
  badge?: string;
}) {
  const colorClasses = {
    blue: 'border-blue-500/20 hover:border-blue-500/50',
    orange: 'border-orange-500/20 hover:border-orange-500/50',
    green: 'border-green-500/20 hover:border-green-500/50',
    purple: 'border-purple-500/20 hover:border-purple-500/50',
    zinc: 'border-zinc-500/20 hover:border-zinc-500/50'
  };
  
  return (
    <Card className={`
      bg-zinc-900/50 border rounded-xl p-6 
      ${colorClasses[color]}
      transition-all hover:transform hover:-translate-y-1
    `}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-zinc-400 text-sm">{icon} {title}</span>
        {badge && (
          <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">
            {badge}
          </span>
        )}
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
    </Card>
  );
}

// Main Component
export default async function QuestionsPage() {
  const questions = await getQuestionsData();
  const stats = calculateQuestionStats(questions);
  
  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-[1800px] mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            ❓ Questions & Answers
          </h1>
          <p className="text-zinc-400">
            Manage customer questions and provide helpful answers
          </p>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatsCard
            title="Total Questions"
            value={stats.total}
            icon="❓"
            color="blue"
          />
          <StatsCard
            title="Pending"
            value={stats.pending}
            icon="⏳"
            color="orange"
            badge={stats.pending > 0 ? 'Urgent' : undefined}
          />
          <StatsCard
            title="Answered"
            value={stats.answered}
            icon="✅"
            color="green"
          />
          <StatsCard
            title="Response Rate"
            value={`${stats.responseRate}%`}
            icon="📈"
            color="purple"
          />
          <StatsCard
            title="Avg Response Time"
            value={stats.avgResponseTime}
            icon="⏱️"
            color="zinc"
          />
        </div>
        
        {/* Main Content: Questions List + AI Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          
          {/* Questions List (2 columns) */}
          <div className="lg:col-span-2 space-y-6">
            <QuestionsContainer
              questions={questions}
              totalCount={stats.total}
              pendingCount={stats.pending}
              answeredCount={stats.answered}
            />
          </div>
          
          {/* AI Assistant Panel (1 column) */}
          <div className="lg:col-span-1">
            <AIAssistantPanel />
          </div>
          
        </div>
        
      </div>
    </div>
  );
}
