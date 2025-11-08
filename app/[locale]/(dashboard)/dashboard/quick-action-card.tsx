

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface QuickActionCardProps {
  title: string;
  description: string;
  icon?: string;
  actionLabel: string;
  onAction?: () => void;
  route?: string;
}

export default function QuickActionCard({
  title,
  description,
  icon = '⚡',
  actionLabel,
  onAction,
  route,
}: QuickActionCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      if (onAction) {
        await onAction();
      } else if (route) {
        router.push(route);
      }
      window.dispatchEvent(new Event('dashboard:refresh'));
    } catch (error) {
      console.error(`[QuickActionCard] Error during ${title} action:`, error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 flex flex-col justify-between transition hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/10">
      <div className="flex flex-col gap-2">
        <div className="text-3xl">{icon}</div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-sm text-zinc-400">{description}</p>
      </div>
      <button
        onClick={handleClick}
        disabled={loading}
        className={`mt-4 px-4 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
          loading
            ? 'bg-zinc-700 cursor-wait text-zinc-300'
            : 'bg-orange-600 hover:bg-orange-700 text-white'
        }`}
      >
        {loading ? 'Processing...' : actionLabel}
      </button>
    </div>
  );
}