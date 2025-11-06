'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { useRouter } from '@/lib/navigation';
import { toast } from 'sonner';
import { useKeyboardShortcut, useSequenceShortcut } from '@/lib/hooks/use-keyboard-shortcut';
import { ShortcutsModal } from './shortcuts-modal';

interface KeyboardContextType {
  showShortcutsModal: () => void;
  hideShortcutsModal: () => void;
  openCommandPalette: () => void;
}

const KeyboardContext = createContext<KeyboardContextType | undefined>(undefined);

export function useKeyboard() {
  const context = useContext(KeyboardContext);
  if (!context) {
    throw new Error('useKeyboard must be used within KeyboardProvider');
  }
  return context;
}

interface KeyboardProviderProps {
  children: React.ReactNode;
  onCommandPaletteOpen: () => void;
}

export function KeyboardProvider({ children, onCommandPaletteOpen }: KeyboardProviderProps) {
  const router = useRouter();
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  const showShortcutsModal = useCallback(() => setShortcutsModalOpen(true), []);
  const hideShortcutsModal = useCallback(() => setShortcutsModalOpen(false), []);

  const openCommandPalette = useCallback(() => {
    onCommandPaletteOpen();
  }, [onCommandPaletteOpen]);

  useKeyboardShortcut([
    {
      key: 'k',
      metaKey: true,
      action: openCommandPalette,
      description: 'Open command palette',
      category: 'Global',
    },
    {
      key: '?',
      action: showShortcutsModal,
      description: 'Show keyboard shortcuts',
      category: 'Global',
    },
    {
      key: 'Escape',
      action: () => {
        if (shortcutsModalOpen) {
          hideShortcutsModal();
        }
      },
      description: 'Close modals',
      category: 'Global',
    },
  ]);

  useSequenceShortcut(['g', 'd'], () => {
    router.push('/dashboard');
    toast.success('Navigated to Dashboard');
  });

  useSequenceShortcut(['g', 'l'], () => {
    router.push('/locations');
    toast.success('Navigated to Locations');
  });

  useSequenceShortcut(['g', 'v'], () => {
    router.push('/reviews');
    toast.success('Navigated to Reviews');
  });

  useSequenceShortcut(['g', 'p'], () => {
    router.push('/posts');
    toast.success('Navigated to Posts');
  });

  useSequenceShortcut(['g', 'a'], () => {
    router.push('/analytics');
    toast.success('Navigated to Analytics');
  });

  useSequenceShortcut(['g', 's'], () => {
    router.push('/settings');
    toast.success('Navigated to Settings');
  });

  useKeyboardShortcut([
    {
      key: 'r',
      action: () => {
        window.location.reload();
      },
      description: 'Refresh data',
      category: 'Actions',
    },
  ]);

  return (
    <KeyboardContext.Provider
      value={{
        showShortcutsModal,
        hideShortcutsModal,
        openCommandPalette,
      }}
    >
      {children}
      <ShortcutsModal open={shortcutsModalOpen} onOpenChange={setShortcutsModalOpen} />
    </KeyboardContext.Provider>
  );
}

