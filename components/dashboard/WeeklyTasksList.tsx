'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { generateWeeklyTasks, getWeeklyTasks, toggleTask as toggleTaskAction } from '@/server/actions/weekly-tasks';
import { useRouter } from 'next/navigation';

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  priority: 'low' | 'medium' | 'high';
  category?: string | null;
  estimated_minutes?: number | null;
  reasoning?: string | null;
  expected_impact?: string | null;
  }

interface WeeklyTasksListProps {
  locationId?: string;
  initialTasks?: Task[];
}

export function WeeklyTasksList({ locationId, initialTasks = [] }: WeeklyTasksListProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadTasks();
  }, [locationId]);

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      const result = await getWeeklyTasks(locationId);
      if (result.success) {
        setTasks(result.data);
      } else {
        console.error('Failed to load tasks:', result.error);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const completion = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'completed').length;
    return {
      done,
      total,
      percent: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  }, [tasks]);

  const handleGenerateTasks = async () => {
    if (tasks.length > 0) {
      toast.info('Tasks already exist for this week', {
        description: 'New tasks will be generated next week',
      });
      return;
    }

    setIsGenerating(true);

    try {
      const result = await generateWeeklyTasks(locationId);

      if (result.success) {
        toast.success('Weekly tasks generated!', {
          description: `${result.data.length} tasks created based on your business data`,
        });
        setTasks(result.data);
        router.refresh();
      } else {
        if (result.error?.includes('already exist')) {
          toast.info('Tasks already generated', {
            description: 'Your weekly tasks are ready',
          });
          loadTasks();
        } else {
          toast.error('Failed to generate tasks', {
            description: result.error || 'Please try again',
          });
        }
      }
    } catch (error: any) {
      console.error('Error generating tasks:', error);
      toast.error('An unexpected error occurred', {
        description: 'Please try again later',
      });
    } finally {
    setIsGenerating(false);
    }
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const newStatus = task.status === 'completed' ? 'pending' : 'completed';

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
    );

    try {
      const result = await toggleTaskAction(id, newStatus === 'completed');

      if (result.success) {
        toast.success(newStatus === 'completed' ? 'Task completed! 🎉' : 'Task marked as incomplete');
        router.refresh();
      } else {
        // Revert optimistic update
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status: task.status } : t))
        );
        toast.error('Failed to update task', {
          description: result.error || 'Please try again',
        });
      }
    } catch (error: any) {
      // Revert optimistic update
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: task.status } : t))
      );
      console.error('Error toggling task:', error);
      toast.error('An unexpected error occurred');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-zinc-300">
          Progress:{' '}
          <span className="font-medium">
            {completion.done}/{completion.total} completed
          </span>
        </div>
        <Button
          onClick={handleGenerateTasks}
          disabled={isGenerating || isLoading}
          className="bg-orange-600 hover:bg-orange-700 text-white"
        >
          {isGenerating || isLoading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              {isGenerating ? 'Generating...' : 'Loading...'}
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Generate Weekly Tasks
            </>
          )}
        </Button>
      </div>

      <Progress value={completion.percent} className="h-2 bg-zinc-800" />

      {isLoading ? (
        <div className="text-sm text-zinc-500 py-8 text-center flex flex-col items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <p>Loading tasks...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-sm text-zinc-500 py-8 text-center">
          <p className="mb-1">No tasks yet. Click "Generate Weekly Tasks" to get started.</p>
          <p className="text-xs text-zinc-600">We'll analyze your business data to create personalized tasks.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const priorityUpper = task.priority.toUpperCase();
            
            return (
            <Card
              key={task.id}
              className={cn(
                'bg-zinc-800/50 border-zinc-700/50 p-3',
                'transition-all',
                  isCompleted && 'opacity-60',
              )}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                    checked={isCompleted}
                    onCheckedChange={() => toggleTask(task.id)}
                    className="border-zinc-600 data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600 mt-0.5"
                />
                <div className="flex-1 min-w-0">
                    <p
                    className={cn(
                      'text-sm text-zinc-200',
                        isCompleted && 'line-through text-zinc-500',
                    )}
                  >
                    {task.title}
                    </p>
                    {task.description && !isCompleted && (
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{task.description}</p>
                    )}
                    {task.estimated_minutes && !isCompleted && (
                      <p className="text-xs text-zinc-500 mt-1">
                        ⏱️ ~{task.estimated_minutes} min
                      </p>
                    )}
                  </div>
                    <Badge
                      className={cn(
                      'text-xs flex-shrink-0',
                      priorityUpper === 'HIGH'
                          ? 'bg-red-500/20 text-red-400 border-red-500/30'
                        : priorityUpper === 'MEDIUM'
                          ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                          : 'bg-green-500/20 text-green-400 border-green-500/30',
                      )}
                    >
                    {priorityUpper}
                    </Badge>
              </div>
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}


