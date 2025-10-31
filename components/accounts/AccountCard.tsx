"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Clock, RefreshCw, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import type { GmbAccount } from '@/lib/types/database';

interface AccountCardProps {
  account: GmbAccount;
  syncingAccountId: string | null;
  deletingAccountId: string | null;
  onSync: (accountId: string) => void;
  onDisconnect: (accountId: string) => void;
  formatDate: (dateString?: string | null) => string;
  index?: number;
}

export function AccountCard({
  account,
  syncingAccountId,
  deletingAccountId,
  onSync,
  onDisconnect,
  formatDate,
  index = 0,
}: AccountCardProps) {
  if (!account || !account.id) {
    console.error("AccountCard received invalid account data", account);
    return null;
  }

  const isSyncing = syncingAccountId === account.id;
  const isDeleting = deletingAccountId === account.id;
  const isActive = account.is_active ?? false;
  const currentStatus = isActive ? 'active' : 'disconnected';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="h-full"
    >
      <Card 
        data-testid={`account-card-${account.id}`} 
        className="bg-card border border-primary/30 shadow-sm transition-all duration-200 hover:shadow-lg hover:shadow-primary/20 hover:border-primary/50 flex flex-col h-full"
      >
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <motion.div 
                className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
              >
                <Building2 className="w-5 h-5 text-primary" />
              </motion.div>
              <div className="min-w-0">
                <CardTitle className="text-base font-semibold text-foreground truncate">{account.account_name || 'Unnamed Account'}</CardTitle>
                <CardDescription className="text-xs text-muted-foreground truncate">{account.email || 'No email'}</CardDescription>
              </div>
            </div>
            <Badge
              variant={isActive ? 'default' : 'secondary'}
              className={`capitalize text-xs px-2 py-0.5 rounded-full transition-colors duration-200 ${
                isActive
                  ? 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700/50'
                  : 'bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/50'
              }`}
            >
              {currentStatus}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0 flex-grow flex flex-col justify-between">
          <div className="grid grid-cols-2 gap-3">
            <motion.div 
              className="bg-secondary/40 rounded-md p-2 border border-primary/10 text-center"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-center gap-1 mb-0.5 text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <p className="text-xs font-medium">Locations</p>
              </div>
              <p className="text-lg font-bold text-foreground">{account.total_locations ?? 0}</p>
            </motion.div>
            <motion.div 
              className="bg-secondary/40 rounded-md p-2 border border-primary/10 text-center"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-center gap-1 mb-0.5 text-muted-foreground">
                <Clock className="w-3 h-3" />
                <p className="text-xs font-medium">Last Sync</p>
              </div>
              <p className="text-xs font-medium text-foreground h-5 flex items-center justify-center">
                {formatDate(account.last_sync)}
              </p>
            </motion.div>
          </div>

          <div className="mt-auto space-y-2">
            {!isActive && (
              <p className="text-xs text-center text-orange-500/90 dark:text-orange-400/80 mb-2 px-2">
                Account disconnected. Reconnect to enable syncing and updates.
              </p>
            )}
            <div className="flex gap-2">
              <Button
                onClick={() => onSync(account.id)}
                disabled={isSyncing || !isActive || isDeleting}
                className="flex-1 transition-all duration-200 hover:scale-105"
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </Button>
              <Button
                onClick={() => onDisconnect(account.id)}
                disabled={isDeleting || !isActive}
                variant="destructive"
                size="sm"
                className="flex-shrink-0 transition-all duration-200 hover:scale-105"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                {isDeleting ? '...' : 'Disconnect'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
