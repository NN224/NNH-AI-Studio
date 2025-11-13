import { cn } from '@/lib/utils';

interface ComingSoonProps {
  readonly title: string;
  readonly description?: string;
  readonly icon?: string;
  readonly badge?: string | null;
  readonly className?: string;
  readonly children?: React.ReactNode;
}

export function ComingSoon({
  title,
  description = 'This module is currently under construction. Stay tuned for the rollout.',
  icon = '🚧',
  badge = 'Coming Soon',
  className,
  children,
}: ComingSoonProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-5 rounded-3xl border border-zinc-800 bg-zinc-900/50 p-12 text-center shadow-[0_0_40px_rgba(0,0,0,0.45)]',
        className,
      )}
    >
      <div className="text-5xl">{icon}</div>
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold text-white">{title}</h1>
        {description ? <p className="max-w-2xl text-sm text-zinc-400">{description}</p> : null}
      </div>
      {badge ? (
        <span className="rounded-full border border-orange-500/40 bg-orange-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-200">
          {badge}
        </span>
      ) : null}
      {children}
    </div>
  );
}


