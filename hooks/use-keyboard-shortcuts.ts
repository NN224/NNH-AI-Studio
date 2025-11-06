import { useEffect } from 'react';
import { useRouter } from '@/lib/navigation';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description?: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = !shortcut.ctrlKey || event.ctrlKey;
        const metaMatch = !shortcut.metaKey || event.metaKey;
        const shiftMatch = !shortcut.shiftKey || event.shiftKey;
        const altMatch = !shortcut.altKey || event.altKey;

        if (keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

export function useNavigationShortcuts() {
  const router = useRouter();

  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'h',
      metaKey: true,
      action: () => router.push('/dashboard'),
      description: 'Go to Dashboard',
    },
    {
      key: 'l',
      metaKey: true,
  action: () => router.push('/locations'),
      description: 'Go to Locations',
    },
    {
      key: 'v',
      metaKey: true,
      action: () => router.push('/reviews'),
      description: 'Go to Reviews',
    },
    {
      key: 'p',
      metaKey: true,
  action: () => router.push('/posts'),
      description: 'Go to Posts',
    },
    {
      key: 'a',
      metaKey: true,
  action: () => router.push('/analytics'),
      description: 'Go to Analytics',
    },
    {
      key: ',',
      metaKey: true,
  action: () => router.push('/settings'),
      description: 'Go to Settings',
    },
  ];

  useKeyboardShortcuts(shortcuts);
}

