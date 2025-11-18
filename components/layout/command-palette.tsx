'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  MapPin,
  Star,
  MessageSquare,
  FileText,
  BarChart3,
  Settings,
  Zap,
  Users,
  Search,
  Plus,
  Download,
  Upload,
} from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const navigationCommands = [
    {
      icon: LayoutDashboard,
      label: t('commands.dashboard'),
      action: '/dashboard',
      shortcut: 'G D',
    },
    {
      icon: MapPin,
      label: t('commands.locations'),
      action: '/locations',
      shortcut: 'G L',
    },
    {
      icon: Star,
      label: t('commands.reviews'),
      action: '/reviews',
      shortcut: 'G R',
    },
    {
      icon: MessageSquare,
      label: t('commands.questions'),
      action: '/questions',
    },
    {
      icon: FileText,
      label: t('commands.gmbPosts'),
      action: '/posts',
      shortcut: 'G P',
    },
    {
      icon: BarChart3,
      label: t('commands.analytics'),
      action: '/analytics',
      shortcut: 'G A',
    },
    {
      icon: Zap,
      label: t('commands.automation'),
      action: '/automation',
    },
    {
      icon: Settings,
      label: t('commands.settings'),
      action: '/settings',
      shortcut: 'G S',
    },
  ];

  const actionCommands = [
    {
      icon: Plus,
      label: t('commands.createGmbPost'),
      action: '/posts',
    },
    {
      icon: Download,
      label: t('commands.exportData'),
      action: 'export',
    },
    {
      icon: Upload,
      label: t('commands.importLocations'),
      action: 'import',
    },
  ];

  const searchCommands = [
    {
      icon: Search,
      label: t('commands.searchLocations'),
      action: 'search-locations',
    },
    {
      icon: Search,
      label: t('commands.searchReviews'),
      action: 'search-reviews',
    },
    {
      icon: Search,
      label: t('commands.searchPosts'),
      action: 'search-posts',
    },
  ];

  const handleSelect = (action: string) => {
    onOpenChange(false);

    if (action.startsWith('/')) {
      router.push(action);
    } else {
      console.log('Action:', action);
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={t('placeholder')} />
      <CommandList>
        <CommandEmpty>{t('empty')}</CommandEmpty>

        <CommandGroup heading={t('navigation')}>
          {navigationCommands.map((command) => {
            const Icon = command.icon;
            return (
              <CommandItem
                key={command.action}
                onSelect={() => handleSelect(command.action)}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span>{command.label}</span>
                </div>
                {command.shortcut && (
                  <Badge variant="secondary" className="text-xs font-mono">
                    {command.shortcut}
                  </Badge>
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t('actions')}>
          {actionCommands.map((command) => {
            const Icon = command.icon;
            return (
              <CommandItem
                key={command.action}
                onSelect={() => handleSelect(command.action)}
                className="flex items-center gap-2"
              >
                <Icon className="h-4 w-4" />
                <span>{command.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t('search')}>
          {searchCommands.map((command) => {
            const Icon = command.icon;
            return (
              <CommandItem
                key={command.action}
                onSelect={() => handleSelect(command.action)}
                className="flex items-center gap-2"
              >
                <Icon className="h-4 w-4" />
                <span>{command.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

