"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmText?: string;
  confirmVariant?: 'default' | 'destructive';
  onConfirm: () => Promise<void> | void;
  isLoading?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  title,
  message,
  confirmText = 'Confirm',
  confirmVariant = 'default',
  onConfirm,
  isLoading = false,
}: ConfirmationModalProps) {
  const [pending, setPending] = useState(false);
  const disabled = isLoading || pending;
  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent className="max-w-md bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">{title}</DialogTitle>
          <DialogDescription className="text-zinc-400">{message}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose} className="text-zinc-300 hover:text-zinc-100">
            Cancel
          </Button>
          <Button
            onClick={async () => {
              setPending(true);
              try {
                await onConfirm();
              } finally {
                setPending(false);
              }
            }}
            disabled={disabled}
            className={
              confirmVariant === 'destructive'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-orange-600 hover:bg-orange-700 text-white'
            }
          >
            {disabled ? 'Processing...' : confirmText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


