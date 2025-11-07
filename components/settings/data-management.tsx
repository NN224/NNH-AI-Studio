'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { 
  Trash2, 
  Download, 
  Database, 
  Archive,
  AlertTriangle,
  Clock,
  Shield,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { useGMBConnection } from '@/hooks/use-gmb-connection';
import {
  permanentlyDeleteArchivedData,
  updateDataRetentionSettings,
} from '@/server/actions/gmb-account';

interface DataManagementProps {
  accountId?: string;
}

export function DataManagement({ accountId }: DataManagementProps) {
  const {
    hasArchivedData,
    archivedLocationsCount,
    archivedReviewsCount,
    activeAccounts,
    refresh,
  } = useGMBConnection();

  const [retentionDays, setRetentionDays] = useState(30);
  const [deleteOnDisconnect, setDeleteOnDisconnect] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const currentAccountId = accountId || activeAccounts[0]?.id;

  // Load current settings
  useEffect(() => {
    if (activeAccounts.length > 0) {
      const account = activeAccounts[0];
      setRetentionDays(account.data_retention_days || 30);
      setDeleteOnDisconnect(account.delete_on_disconnect || false);
    }
  }, [activeAccounts]);

  const handlePermanentDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await permanentlyDeleteArchivedData();
      
      if (result.success) {
        toast.success('Success', {
          description: result.message,
        });
        setShowDeleteDialog(false);
        refresh();
      } else {
        toast.error('Error', {
          description: result.error || 'Failed to delete archived data',
        });
      }
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'An unexpected error occurred',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!currentAccountId) {
      toast.error('No account found');
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateDataRetentionSettings(
        currentAccountId,
        retentionDays,
        deleteOnDisconnect
      );

      if (result.success) {
        toast.success('Settings saved', {
          description: result.message,
        });
        refresh();
      } else {
        toast.error('Error', {
          description: result.error || 'Failed to save settings',
        });
      }
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'An unexpected error occurred',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Archived Data Overview */}
      {hasArchivedData && (
        <Alert className="border-orange-500/30 bg-orange-500/10">
          <Info className="h-4 w-4 text-orange-500" />
          <AlertDescription className="text-orange-200">
            You have archived data from disconnected accounts. This data is anonymized and stored for historical purposes.
          </AlertDescription>
        </Alert>
      )}

      {/* Retained Data Card */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-100">
            <Archive className="h-5 w-5 text-orange-500" />
            Retained Historical Data
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Data preserved after account disconnect (anonymized for privacy)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasArchivedData ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm text-zinc-400">Archived Locations</Label>
                      <p className="text-2xl font-bold text-zinc-100">{archivedLocationsCount}</p>
                    </div>
                    <Database className="h-8 w-8 text-blue-500/50" />
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm text-zinc-400">Archived Reviews</Label>
                      <p className="text-2xl font-bold text-zinc-100">{archivedReviewsCount}</p>
                      <p className="text-xs text-zinc-500 mt-1">(anonymized)</p>
                    </div>
                    <Shield className="h-8 w-8 text-green-500/50" />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                  onClick={() => {
                    // TODO: Implement export functionality
                    toast.info('Export feature coming soon');
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>

                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Permanently
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Database className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">No archived data found</p>
              <p className="text-xs text-zinc-600 mt-1">
                Data from disconnected accounts will appear here
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Retention Settings */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-100">
            <Clock className="h-5 w-5 text-orange-500" />
            Data Retention Policy
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Control how your data is handled when you disconnect an account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium text-zinc-200">
                  Delete all data on disconnect
                </Label>
                <p className="text-xs text-zinc-500">
                  Immediately delete all data when you disconnect (cannot be undone)
                </p>
              </div>
              <Switch
                checked={deleteOnDisconnect}
                onCheckedChange={setDeleteOnDisconnect}
                className="data-[state=checked]:bg-red-500"
              />
            </div>

            {!deleteOnDisconnect && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-zinc-200">
                    Data retention period
                  </Label>
                  <p className="text-xs text-zinc-500">
                    Keep anonymized data for this many days before automatic deletion
                  </p>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[30, 60, 90, 365].map((days) => (
                    <Button
                      key={days}
                      variant={retentionDays === days ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setRetentionDays(days)}
                      className={
                        retentionDays === days
                          ? 'bg-orange-600 hover:bg-orange-700'
                          : 'border-zinc-700'
                      }
                    >
                      {days} days
                    </Button>
                  ))}
                </div>

                <Alert className="border-zinc-700 bg-zinc-800/50">
                  <Shield className="h-4 w-4 text-blue-400" />
                  <AlertDescription className="text-xs text-zinc-400">
                    Personal data is anonymized immediately on disconnect. Only statistical data is retained.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>

          <Button
            onClick={handleSaveSettings}
            disabled={isSaving || !currentAccountId}
            className="w-full bg-orange-600 hover:bg-orange-700"
          >
            {isSaving ? 'Saving...' : 'Save Retention Settings'}
          </Button>
        </CardContent>
      </Card>

      {/* Permanent Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-zinc-100">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Permanently Delete All Archived Data?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This will permanently delete:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>{archivedLocationsCount} archived locations</li>
                <li>{archivedReviewsCount} archived reviews</li>
                <li>All associated questions and posts</li>
              </ul>
              <p className="mt-4 text-red-400 font-medium">
                This action cannot be undone!
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
