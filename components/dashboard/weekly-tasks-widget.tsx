'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from '@/lib/navigation';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  CheckCircle2,
  Circle,
  Clock,
  TrendingUp,
  Zap,
  AlertCircle,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  effort_level: 'quick' | 'moderate' | 'extensive';
  estimated_minutes: number;
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  reasoning: string;
  expected_impact: string;
}

export function WeeklyTasksWidget() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get current week start date
      const now = new Date();
      const dayOfWeek = now.getDay();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const weekStartDate = new Date(now);
      weekStartDate.setDate(now.getDate() + daysToMonday);
      weekStartDate.setHours(0, 0, 0, 0);

      // Try to fetch tasks, but don't fail if table doesn't exist
      const { data, error } = await supabase
        .from('weekly_task_recommendations')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start_date', weekStartDate.toISOString().split('T')[0])
        .order('priority', { ascending: false })
        .order('estimated_minutes', { ascending: true });

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = table doesn't exist, which is okay
        throw error;
      }
      
      setTasks(data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
      // Don't show error if table doesn't exist - just show empty state
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const generateTasks = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/tasks/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (data.tasks_exist) {
        toast.info('Tasks already generated for this week');
      } else if (data.success) {
        toast.success('Weekly tasks generated successfully!');
        await loadTasks();
      } else {
        toast.error('Failed to generate tasks');
      }
    } catch (error) {
      console.error('Failed to generate tasks:', error);
      toast.error('Failed to generate tasks. API endpoint may not be available.');
    } finally {
      setGenerating(false);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    // ✅ SECURITY: Validate inputs
    const validStatuses = ['pending', 'in_progress', 'completed', 'dismissed'];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(taskId)) {
      toast.error('Invalid task ID');
      return;
    }
    
    if (!validStatuses.includes(newStatus)) {
      toast.error('Invalid task status');
      return;
    }
    
    try {
      const response = await fetch('/api/tasks/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: taskId,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to update task');
      }

      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? { ...task, status: newStatus as any }
            : task
        )
      );

      if (newStatus === 'completed') {
        toast.success('Task completed!');
      }
    } catch (error) {
      console.error('Failed to update task:', error);
      toast.error('Failed to update task');
    }
  };

  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const quickWins = tasks.filter(
    (t) => t.effort_level === 'quick' && t.status === 'pending'
  ).slice(0, 3);

  const highPriorityTasks = tasks.filter(
    (t) => t.priority === 'high' && t.status !== 'completed' && t.status !== 'dismissed'
  );

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      content: 'bg-info/10 text-info border-info/20',
      reviews: 'bg-success/10 text-success border-success/20',
      optimization: 'bg-primary/10 text-primary border-primary/20',
      performance: 'bg-warning/10 text-warning border-warning/20',
      team: 'bg-accent/10 text-accent border-accent/20',
    };
    return colors[category] || 'bg-muted/10 text-muted-foreground border-muted/20';
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === 'high') return <AlertCircle className="h-4 w-4 text-destructive" />;
    if (priority === 'medium') return <TrendingUp className="h-4 w-4 text-warning" />;
    return <Circle className="h-4 w-4 text-muted-foreground" />;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const defaultTasks: Task[] = [
    {
      id: 'default-1',
      title: 'Complete GMB Profile',
      description: 'Ensure all fields (hours, services, description) are filled out.',
      category: 'optimization',
      priority: 'high',
      effort_level: 'quick',
      estimated_minutes: 10,
      status: 'pending',
      reasoning: 'Incomplete profiles rank lower.',
      expected_impact: 'Immediate visibility boost.',
    },
    {
      id: 'default-2',
      title: 'Upload 5 New Photos',
      description: 'Add high-quality photos of your business interior and exterior.',
      category: 'content',
      priority: 'medium',
      effort_level: 'moderate',
      estimated_minutes: 20,
      status: 'pending',
      reasoning: 'Profiles with photos get more clicks.',
      expected_impact: 'Increased engagement.',
    },
    {
      id: 'default-3',
      title: 'Create a GMB Post',
      description: 'Post about a new offer or event.',
      category: 'content',
      priority: 'medium',
      effort_level: 'quick',
      estimated_minutes: 15,
      status: 'pending',
      reasoning: 'Posts keep your profile fresh and visible.',
      expected_impact: 'Temporary ranking boost.',
    },
  ];

  const displayTasks = tasks.length > 0 ? tasks : defaultTasks;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-warning" />
            Weekly Tasks
          </CardTitle>
          <CardDescription>AI-powered recommendations to improve your business</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="text-center py-8">
              <div className="rounded-full bg-primary/10 p-4 w-fit mx-auto mb-4">
                <Zap className="h-8 w-8 text-primary" aria-hidden="true" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-foreground">No personalized tasks yet</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Generate personalized tasks based on your business performance to unlock AI-powered recommendations
              </p>
              <Button 
                onClick={generateTasks} 
                disabled={generating}
                className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label={generating ? "Generating weekly tasks" : "Generate personalized weekly tasks"}
              >
                {generating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" aria-hidden="true" />
                    Generate Weekly Tasks
                  </>
                )}
              </Button>
            </div>
            
            <div className="border-t pt-6">
              <h4 className="text-sm font-semibold mb-3">Recommended Quick Wins</h4>
              <div className="space-y-2">
                {defaultTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onStatusChange={() => toast.info('Please generate personalized tasks to track completion.')}
                    getCategoryColor={getCategoryColor}
                    getPriorityIcon={getPriorityIcon}
                    isDefault={true}
                  />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-warning" />
              Weekly Tasks
            </CardTitle>
            <CardDescription>Your personalized action plan for this week</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={generateTasks} disabled={generating}>
            <RefreshCw className={cn('h-4 w-4', generating && 'animate-spin')} />
          </Button>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {completedTasks} / {totalTasks} completed
            </span>
          </div>
          <Progress value={completionRate} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {highPriorityTasks.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              High Priority
            </h4>
            <div className="space-y-2">
              {highPriorityTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onStatusChange={updateTaskStatus}
                  getCategoryColor={getCategoryColor}
                  getPriorityIcon={getPriorityIcon}
                />
              ))}
            </div>
          </div>
        )}

        {quickWins.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-warning" />
              Quick Wins (Under 15 min)
            </h4>
            <div className="space-y-2">
              {quickWins.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onStatusChange={updateTaskStatus}
                  getCategoryColor={getCategoryColor}
                  getPriorityIcon={getPriorityIcon}
                />
              ))}
            </div>
          </div>
        )}

        {totalTasks > 0 && (
          <Button variant="outline" className="w-full" asChild>
            <Link href="/dashboard">
              View All Tasks
              <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function TaskItem({
  task,
  onStatusChange,
  getCategoryColor,
  getPriorityIcon,
  isDefault = false,
}: {
  task: Task;
  onStatusChange: (id: string, status: string) => void;
  getCategoryColor: (category: string) => string;
  getPriorityIcon: (priority: string) => React.ReactNode;
  isDefault?: boolean;
}) {
  const isCompleted = task.status === 'completed';

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border bg-card transition-colors',
        isCompleted && 'opacity-60'
      )}
    >
      <Checkbox
        checked={isCompleted}
        onCheckedChange={(checked) => {
          if (!isDefault) {
            onStatusChange(task.id, checked ? 'completed' : 'pending');
          } else {
            onStatusChange(task.id, 'default'); // Placeholder to trigger toast
          }
        }}
        className="mt-1"
        disabled={isDefault}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 mb-1">
          {getPriorityIcon(task.priority)}
          <h5 className={cn('font-medium text-sm', isCompleted && 'line-through')}>
            {task.title}
          </h5>
        </div>
        <p className="text-xs text-muted-foreground mb-2">{task.description}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={cn('text-xs', getCategoryColor(task.category))}>
            {task.category}
          </Badge>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {task.estimated_minutes} min
          </span>
        </div>
      </div>
    </div>
  );
}

