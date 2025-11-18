'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, TestTube, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function TestAutoReplySection() {
  const [reviewId, setReviewId] = useState('');
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    suggestedReply?: string;
    requiresApproval?: boolean;
  } | null>(null);

  const handleTest = async () => {
    if (!reviewId.trim()) {
      toast.error('يرجى إدخال معرف المراجعة');
      return;
    }

    setTesting(true);
    setResult(null);

    try {
      const response = await fetch('/api/reviews/test-auto-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId: reviewId.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل الاختبار');
      }

      setResult({
        success: data.success,
        message: data.message,
        suggestedReply: data.data?.suggestedReply,
        requiresApproval: data.data?.requiresApproval,
      });

      if (data.success) {
        toast.success('✅ تم الاختبار بنجاح!');
      } else {
        toast.error(data.error || 'فشل الاختبار');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
      setResult({
        success: false,
        message: errorMessage,
      });
      toast.error(errorMessage);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <TestTube className="w-5 h-5 text-orange-400" />
          اختبار الرد التلقائي
        </CardTitle>
        <CardDescription>
          اختبر النظام على مراجعة معينة (أدخل معرف المراجعة)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reviewId" className="text-white">
            معرف المراجعة (Review ID)
          </Label>
          <div className="flex gap-2">
            <Input
              id="reviewId"
              value={reviewId}
              onChange={(e) => setReviewId(e.target.value)}
              placeholder="أدخل UUID للمراجعة..."
              className="bg-zinc-950 border-zinc-700 text-white"
              disabled={testing}
            />
            <Button
              onClick={handleTest}
              disabled={testing || !reviewId.trim()}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  جاري الاختبار...
                </>
              ) : (
                <>
                  <TestTube className="w-4 h-4 mr-2" />
                  اختبار
                </>
              )}
            </Button>
          </div>
        </div>

        {result && (
          <div
            className={`p-4 rounded-lg border ${
              result.success
                ? 'bg-green-950/30 border-green-500/30'
                : 'bg-red-950/30 border-red-500/30'
            }`}
          >
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
              )}
              <div className="flex-1">
                <p
                  className={`font-medium ${
                    result.success ? 'text-green-300' : 'text-red-300'
                  }`}
                >
                  {result.message}
                </p>
                {result.suggestedReply && (
                  <div className="mt-3 p-3 bg-zinc-950/50 rounded border border-zinc-700">
                    <p className="text-xs text-zinc-400 mb-2">الرد المقترح:</p>
                    <p className="text-sm text-white whitespace-pre-wrap">
                      {result.suggestedReply}
                    </p>
                  </div>
                )}
                {result.requiresApproval && (
                  <p className="text-xs text-yellow-400 mt-2">
                    ⚠️ يتطلب الموافقة قبل الإرسال
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-zinc-500">
          💡 نصيحة: يمكنك الحصول على معرف المراجعة من صفحة المراجعات (Reviews Tab)
        </p>
      </CardContent>
    </Card>
  );
}

