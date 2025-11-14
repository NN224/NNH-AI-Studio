'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clock,
  RotateCcw,
  User,
  FileText,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Shield,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
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

interface ChangeHistoryPanelProps {
  locationId: string;
  locationName: string;
  onRollback?: () => void;
}

interface HistoryRecord {
  id: string;
  operation_type: string;
  created_at: string;
  created_by: string;
  changes: Record<string, any>;
  previous_values: Record<string, any>;
  current_values: Record<string, any>;
  metadata?: Record<string, any>;
}

export function ChangeHistoryPanel({ 
  locationId, 
  locationName,
  onRollback
}: ChangeHistoryPanelProps) {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [rollbackLoading, setRollbackLoading] = useState(false);
  
  const supabase = createClient();

  useEffect(() => {
    loadHistory();
  }, [locationId]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .rpc('get_profile_history_with_diff', { 
          p_location_id: locationId 
        });

      if (error) throw error;

      setHistory(data || []);
    } catch (error) {
      console.error('Failed to load history:', error);
      toast.error('Failed to load change history');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const handleRollback = async () => {
    if (!selectedHistoryId) return;

    try {
      setRollbackLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .rpc('rollback_profile_to_history', {
          p_history_id: selectedHistoryId,
          p_user_id: user.id
        });

      if (error) throw error;

      if (data?.success) {
        toast.success('Profile rolled back successfully');
        loadHistory();
        onRollback?.();
      } else {
        throw new Error(data?.error || 'Rollback failed');
      }
    } catch (error: any) {
      console.error('Rollback error:', error);
      toast.error('Failed to rollback', {
        description: error.message
      });
    } finally {
      setRollbackLoading(false);
      setRollbackDialogOpen(false);
      setSelectedHistoryId(null);
    }
  };

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'create':
        return <FileText className="h-4 w-4" />;
      case 'update':
        return <Check className="h-4 w-4" />;
      case 'bulk_update':
        return <Copy className="h-4 w-4" />;
      case 'rollback':
        return <RotateCcw className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getOperationColor = (type: string) => {
    switch (type) {
      case 'create':
        return 'text-green-500';
      case 'update':
        return 'text-blue-500';
      case 'bulk_update':
        return 'text-purple-500';
      case 'rollback':
        return 'text-orange-500';
      default:
        return 'text-gray-500';
    }
  };

  const formatFieldName = (field: string): string => {
    return field
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'Not set';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Change History
          </CardTitle>
          <CardDescription>
            View all changes made to {locationName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No change history available</p>
              <p className="text-sm mt-1">Changes will appear here once you start editing</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {history.map((record) => {
                  const isExpanded = expandedItems.has(record.id);
                  const hasChanges = Object.keys(record.changes || {}).length > 0;
                  
                  return (
                    <div
                      key={record.id}
                      className="border rounded-lg p-4 hover:bg-secondary/20 transition-colors"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "p-2 rounded-full bg-secondary",
                            getOperationColor(record.operation_type)
                          )}>
                            {getOperationIcon(record.operation_type)}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {formatFieldName(record.operation_type)}
                              </span>
                              {record.metadata?.bulkUpdate && (
                                <Badge variant="secondary" className="text-xs">
                                  Bulk
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(new Date(record.created_at), { 
                                  addSuffix: true 
                                })}
                              </span>
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                User
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {record.operation_type !== 'create' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedHistoryId(record.id);
                                setRollbackDialogOpen(true);
                              }}
                              className="gap-1"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Rollback
                            </Button>
                          )}
                          
                          {hasChanges && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleExpanded(record.id)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {/* Changes Detail */}
                      {isExpanded && hasChanges && (
                        <div className="mt-4 space-y-2 pl-11">
                          {Object.entries(record.changes).map(([field, change]: [string, any]) => (
                            <div key={field} className="space-y-1">
                              <Label className="text-sm font-medium">
                                {formatFieldName(field)}
                              </Label>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="space-y-1">
                                  <span className="text-muted-foreground">Before:</span>
                                  <pre className="bg-secondary/50 p-2 rounded text-xs overflow-auto">
                                    {formatValue(change.old)}
                                  </pre>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-muted-foreground">After:</span>
                                  <pre className="bg-secondary/50 p-2 rounded text-xs overflow-auto">
                                    {formatValue(change.new)}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
      
      <AlertDialog open={rollbackDialogOpen} onOpenChange={setRollbackDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Confirm Rollback
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the profile to its state at the selected point in history.
              The current state will be backed up before rolling back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rollbackLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRollback}
              disabled={rollbackLoading}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {rollbackLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Rollback to This Version
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Fix missing imports
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
