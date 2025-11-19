import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
import { fetchAutoAnswerStats } from '@/lib/data/monitoring';
import { formatRelativeTime } from '@/lib/utils/date-utils';

export function AutoAnswerMonitoring() {
  const { t } = useTranslation('common');
  const [stats, setStats] = useState<any>(null);
  const [recentAnswers, setRecentAnswers] = useState<{ id: string; question: string; answer: string; confidence: number; locationName: string; answeredAt: string }[]>([]);

  const fetchStatsInterval = async () => {
    const data = await fetchAutoAnswerStats();
    setStats(data.stats);
    setRecentAnswers(data.recentAnswers);
  };

  useEffect(() => {
    fetchStatsInterval();
    const interval = setInterval(fetchStatsInterval, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* بطاقات الإحصائيات */}
      <Card>
        <CardHeader>
          <CardTitle>{t('autoAnswerMonitoring.todayAnswers')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" aria-label="Today's Answers">{stats?.todayCount || 0}</div>
          <p className="text-sm text-gray-500">
            متوسط الوقت: {stats?.avgResponseTime || '0'} ثانية
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>معدل النجاح</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" aria-label="Success Rate">{stats?.successRate || '0'}%</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>متوسط الثقة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" aria-label="Average Confidence">{stats?.avgConfidence || '0'}%</div>
          <p className="text-sm text-gray-500">
            الحد الأدنى: {stats?.confidenceThreshold || 80}%
          </p>
        </CardContent>
      </Card>

      {/* قائمة الردود الأخيرة */}
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>الردود الأخيرة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentAnswers.map((answer) => (
              <div key={answer.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm font-medium">{answer.question}</div>
                  <Badge variant={answer.confidence >= 80 ? 'default' : 'secondary'}>
                    ثقة {answer.confidence}%
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mb-2">{answer.answer}</p>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{answer.locationName}</span>
                  <span>{formatRelativeTime(answer.answeredAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* رسم بياني للأداء */}
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>أداء الرد التلقائي (آخر 7 أيام)</CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.performanceData?.length ? (
            <div className="text-center text-gray-500">
              {t('autoAnswerMonitoring.noChartAvailable')}
            </div>
          ) : (
            <div className="text-center text-gray-500">
              {t('autoAnswerMonitoring.noDataAvailable')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
