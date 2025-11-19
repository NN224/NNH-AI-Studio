import { useState } from 'react';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Alert } from '@components/ui';
import { useAutoAnswerService } from '@lib/services/ai-question-answer-service';

export function AutoAnswerTesting() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    try {
      const result = await useAutoAnswerService(question);
      setAnswer(result.answer);
      setError(null);
    } catch (e) {
      setError('Failed to generate answer. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>اختبار الرد التلقائي</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              placeholder="أدخل سؤالًا للاختبار"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <Button onClick={handleTest}>اختبار</Button>
            {answer && (
              <Alert variant="success">
                <Alert.Title>الرد:</Alert.Title>
                <Alert.Description>{answer}</Alert.Description>
              </Alert>
            )}
            {error && (
              <Alert variant="error">
                <Alert.Title>خطأ:</Alert.Title>
                <Alert.Description>{error}</Alert.Description>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

async function useAutoAnswerService(question: string): Promise<{ answer: string }> {
  // Call the backend service to generate an answer
  const response = await fetch('/api/questions/auto-answer', {
    method: 'POST',
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch answer from backend.');
  }

  return response.json();
}
