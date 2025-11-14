'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
import { useTranslations } from 'next-intl';

interface DataManagementProps {
  accountId?: string;
  retentionDays?: number;
  setRetentionDays?: (value: number) => void;
  deleteOnDisconnect?: boolean;
  setDeleteOnDisconnect?: (value: boolean) => void;
}

export function DataManagement({ 
  accountId,
  retentionDays: retentionDaysProp,
  setRetentionDays: setRetentionDaysProp,
  deleteOnDisconnect: deleteOnDisconnectProp,
  setDeleteOnDisconnect: setDeleteOnDisconnectProp
}: DataManagementProps) {
  const t = useTranslations('Settings.data')
  const {
    hasArchivedData,
    archivedLocationsCount,
    archivedReviewsCount,
    activeAccounts,
    refresh,
  } = useGMBConnection();

  // Use props if provided, otherwise use local state
  const [localRetentionDays, setLocalRetentionDays] = useState(30);
  const [localDeleteOnDisconnect, setLocalDeleteOnDisconnect] = useState(false);
  
  const retentionDays = retentionDaysProp ?? localRetentionDays;
  const setRetentionDays = setRetentionDaysProp ?? setLocalRetentionDays;
  const deleteOnDisconnect = deleteOnDisconnectProp ?? localDeleteOnDisconnect;
  const setDeleteOnDisconnect = setDeleteOnDisconnectProp ?? setLocalDeleteOnDisconnect;

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const currentAccountId = accountId || activeAccounts[0]?.id;

  // Load current settings if not provided via props
  useEffect(() => {
    if (!retentionDaysProp && activeAccounts.length > 0) {
      const account = activeAccounts[0];
      setLocalRetentionDays(account.data_retention_days || 30);
      setLocalDeleteOnDisconnect(account.delete_on_disconnect || false);
    }
  }, [activeAccounts, retentionDaysProp]);

  const handlePermanentDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await permanentlyDeleteArchivedData();
      
      if (result.success) {
        toast.success(t('toast.success'), {
          description: result.message,
        });
        setShowDeleteDialog(false);
        refresh();
      } else {
        toast.error(t('toast.error'), {
          description: result.error || t('toast.deleteFailed'),
        });
      }
    } catch (error) {
      const err = error as Error;
      toast.error(t('toast.error'), {
        description: err.message || t('toast.unexpectedError'),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!currentAccountId) {
      toast.error(t('toast.noAccount'));
      return;
    }

    setIsSaving(true);
    try {
      // If settings are managed by parent, just show success
      // The parent will handle saving via unified API
      if (setRetentionDaysProp && setDeleteOnDisconnectProp) {
        toast.success(t('toast.settingsWillBeSaved'), {
          description: t('toast.clickSaveAllChanges'),
        });
        setIsSaving(false);
        return;
      }

      // Otherwise, use server action (fallback)
      const result = await updateDataRetentionSettings(
        currentAccountId,
        retentionDays,
        deleteOnDisconnect
      );

      if (result.success) {
        toast.success(t('toast.settingsSaved'), {
          description: result.message,
        });
        refresh();
      } else {
        toast.error(t('toast.error'), {
          description: result.error || t('toast.saveFailed'),
        });
      }
    } catch (error) {
      const err = error as Error;
      toast.error(t('toast.error'), {
        description: err.message || t('toast.unexpectedError'),
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
            {t('archivedData.alert')}
          </AlertDescription>
        </Alert>
      )}

      {/* Retained Data Card */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-100">
            <Archive className="h-5 w-5 text-orange-500" />
            {t('archivedData.title')}
          </CardTitle>
          <CardDescription className="text-zinc-400">
            {t('archivedData.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasArchivedData ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm text-zinc-400">{t('archivedData.locations')}</Label>
                      <p className="text-2xl font-bold text-zinc-100">{archivedLocationsCount}</p>
                    </div>
                    <Database className="h-8 w-8 text-blue-500/50" />
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm text-zinc-400">{t('archivedData.reviews')}</Label>
                      <p className="text-2xl font-bold text-zinc-100">{archivedReviewsCount}</p>
                      <p className="text-xs text-zinc-500 mt-1">{t('archivedData.anonymized')}</p>
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
                    toast.info(t('archivedData.exportComingSoon'));
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t('archivedData.export')}
                </Button>

                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('archivedData.deletePermanently')}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Database className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">{t('archivedData.empty')}</p>
              <p className="text-xs text-zinc-600 mt-1">
                {t('archivedData.emptyDescription')}
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
            {t('retention.title')}
          </CardTitle>
          <CardDescription className="text-zinc-400">
            {t('retention.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium text-zinc-200">
                  {t('deleteOnDisconnect')}
                </Label>
                <p className="text-xs text-zinc-500">
                  {t('retention.deleteOnDisconnectDesc')}
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
                    {t('retentionDays')}
                  </Label>
                  <p className="text-xs text-zinc-500">
                    {t('retention.periodDescription')}
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
                      {days} {t('retention.days')}
                    </Button>
                  ))}
                </div>

                <Alert className="border-zinc-700 bg-zinc-800/50">
                  <Shield className="h-4 w-4 text-blue-400" />
                  <AlertDescription className="text-xs text-zinc-400">
                    {t('retention.anonymizationNote')}
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>

          {setRetentionDaysProp && setDeleteOnDisconnectProp ? (
            <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
              <p className="text-xs text-blue-600 dark:text-blue-400">
                {t('retention.saveHint')}
              </p>
            </div>
          ) : (
            <Button
              onClick={handleSaveSettings}
              disabled={isSaving || !currentAccountId}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              {isSaving ? t('retention.saving') : t('retention.saveButton')}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Permanent Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-zinc-100">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              {t('deleteDialog.title')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {t('deleteDialog.description')}
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>{archivedLocationsCount} {t('deleteDialog.locations')}</li>
                <li>{archivedReviewsCount} {t('deleteDialog.reviews')}</li>
                <li>{t('deleteDialog.associatedData')}</li>
              </ul>
              <p className="mt-4 text-red-400 font-medium">
                {t('deleteDialog.warning')}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700">{t('deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? t('deleteDialog.deleting') : t('deleteDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
