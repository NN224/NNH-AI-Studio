'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useRouter } from 'next/navigation';

interface ProfileProtectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  protectionScore: number; // 0..1
  issues: string[];
}

export function ProfileProtectionModal({
  isOpen,
  onClose,
  protectionScore,
  issues,
}: ProfileProtectionModalProps) {
  const router = useRouter();
  const scorePercent = Math.round((protectionScore ?? 0) * 100);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent className="max-w-xl bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Profile Protection</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Review your protection status and recommended fixes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-zinc-100">{scorePercent}%</div>
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Inactive</Badge>
          </div>
          <Progress value={scorePercent} className="h-2 bg-zinc-800" />

          <div className="space-y-2">
            <h4 className="text-sm text-zinc-300 font-medium">Issues</h4>
            {issues.length === 0 ? (
              <div className="text-sm text-zinc-500">No issues detected.</div>
            ) : (
              <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-300">
                {issues.map((issue, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-yellow-400">⚠️</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="text-sm text-zinc-300 font-medium">Recommendations</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="justify-start border-zinc-700/50 hover:border-orange-500/50 hover:bg-orange-500/10"
                onClick={() => {
                  onClose();
                  router.push('/features');
                }}
              >
                Complete GMB Profile
              </Button>
              <Button
                variant="outline"
                className="justify-start border-zinc-700/50 hover:border-orange-500/50 hover:bg-orange-500/10"
                onClick={() => {
                  onClose();
                  router.push('/media');
                }}
              >
                Upload 5 New Photos
              </Button>
              <Button
                variant="outline"
                className="justify-start border-zinc-700/50 hover:border-orange-500/50 hover:bg-orange-500/10"
                onClick={() => {
                  onClose();
                  router.push('/posts');
                }}
              >
                Create a GMB Post
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <Button onClick={onClose} className="bg-orange-600 hover:bg-orange-700 text-white">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


