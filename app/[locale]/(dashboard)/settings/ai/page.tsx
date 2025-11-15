import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AISettingsForm } from '@/components/settings/ai-settings-form';
import { AIUsageStats } from '@/components/settings/ai-usage-stats';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

export default async function AISettingsPage() {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/auth/login');
  }

  // Fetch existing AI settings
  const { data: aiSettings } = await supabase
    .from('ai_settings')
    .select('*')
    .eq('user_id', user.id)
    .order('priority', { ascending: true });

  // Fetch AI usage stats
  const { data: usageStats } = await supabase
    .from('ai_requests')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-purple-500" />
          إعدادات الذكاء الاصطناعي
        </h1>
        <p className="text-muted-foreground mt-2">
          قم بإعداد مزودي الذكاء الاصطناعي وإدارة استخدامك
        </p>
      </div>

      {/* AI Settings Form */}
      <Card>
        <CardHeader>
          <CardTitle>مزودي الذكاء الاصطناعي</CardTitle>
          <CardDescription>
            أضف API Keys من OpenAI أو Anthropic أو Google AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AISettingsForm 
            userId={user.id} 
            existingSettings={aiSettings || []} 
          />
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      <AIUsageStats 
        userId={user.id} 
        usageData={usageStats || []} 
      />
    </div>
  );
}

