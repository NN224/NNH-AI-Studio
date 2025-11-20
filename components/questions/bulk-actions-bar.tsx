'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Sparkles, 
  MessageSquare,
  Loader2
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { apiClient } from '@/lib/utils/api-client';

interface BulkActionsBarProps {
  selectedCount: number;
  selectedIds: string[];
  onComplete: () => void;
  onClearSelection: () => void;
}

export function BulkActionsBar({ 
  selectedCount, 
  selectedIds,
  onComplete,
  onClearSelection
}: BulkActionsBarProps) {
  const [loading, setLoading] = useState(false);
  const [actionType, setActionType] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleBulkAction = async (action: 'analyze' | 'answer' | 'approve' | 'reject' | 'delete') => {
    setActionType(action);
    
    // Show confirmation for destructive actions
    if (action === 'reject' || action === 'delete') {
      setDialogOpen(true);
      return;
    }
    
    await executeBulkAction(action);
  };

  const executeBulkAction = async (action: string) => {
    setLoading(true);
    
    try {
      const options: any = {};
      
      // Configure options based on action
      if (action === 'answer') {
        options.autoAnswer = true;
        options.useML = true;
      }
      
      const response = await apiClient.post('/api/questions/bulk', {
        action,
        questionIds: selectedIds,
        options
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Bulk action failed');
      }

      const { results } = data;
      
      toast.success(`Bulk ${action} completed!`, {
        description: `${results.success.length} succeeded, ${results.failed.length} failed`
      });
      
      onComplete();
      onClearSelection();
      
    } catch (error: any) {
      console.error('Bulk action error:', error);
      toast.error(`Failed to ${action} questions`, {
        description: error.message || 'Please try again'
      });
    } finally {
      setLoading(false);
      setDialogOpen(false);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="sticky top-0 z-20 flex items-center gap-4 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 px-6 py-4">
        <span className="text-sm font-medium text-zinc-400">
          {selectedCount} question{selectedCount !== 1 ? 's' : ''} selected
        </span>
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBulkAction('analyze')}
            disabled={loading}
            className="gap-2"
          >
            {loading && actionType === 'analyze' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Analyze with AI
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBulkAction('answer')}
            disabled={loading}
            className="gap-2"
          >
            {loading && actionType === 'answer' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageSquare className="h-4 w-4" />
            )}
            Auto Answer
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBulkAction('approve')}
            disabled={loading}
            className="gap-2 text-green-500 hover:text-green-400"
          >
            {loading && actionType === 'approve' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Approve
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBulkAction('reject')}
            disabled={loading}
            className="gap-2 text-red-500 hover:text-red-400"
          >
            {loading && actionType === 'reject' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            Reject
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleBulkAction('delete')}
            disabled={loading}
            className="gap-2 text-zinc-500 hover:text-red-400"
          >
            {loading && actionType === 'delete' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Archive
          </Button>
        </div>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={onClearSelection}
          className="ml-auto"
        >
          Clear selection
        </Button>
      </div>
      
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'delete' ? 'Archive' : 'Reject'} {selectedCount} questions?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {actionType === 'delete' 
                ? 'Archived questions will be hidden but can be restored later.'
                : 'This will clear any draft answers and mark questions as pending.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 hover:bg-zinc-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => executeBulkAction(actionType!)}
              className={actionType === 'delete' 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-orange-600 hover:bg-orange-700'
              }
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                actionType === 'delete' ? 'Archive' : 'Reject'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
