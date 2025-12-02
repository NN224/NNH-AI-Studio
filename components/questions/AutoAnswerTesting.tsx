import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

async function callAutoAnswerService(
  question: string,
): Promise<{ answer: string }> {
  // Call the backend service to generate an answer
  const response = await fetch("/api/questions/auto-answer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch answer from backend.");
  }

  return response.json();
}

export function AutoAnswerTesting() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    try {
      const result = await callAutoAnswerService(question);
      setAnswer(result.answer);
      setError(null);
    } catch (e: unknown) {
      setError("Failed to generate answer. Please try again.");
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
              <Alert>
                <AlertTitle>الرد:</AlertTitle>
                <AlertDescription>{answer}</AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertTitle>خطأ:</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
