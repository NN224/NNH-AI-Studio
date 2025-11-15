'use client';

/**
 * AI Settings Form
 * Form to manage AI provider API keys
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AISettings {
  id: string;
  user_id: string;
  provider: 'openai' | 'anthropic' | 'google';
  api_key: string;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

interface AISettingsFormProps {
  userId: string;
  existingSettings: AISettings[];
}

export function AISettingsForm({ userId, existingSettings }: AISettingsFormProps) {
  const router = useRouter();
  const [settings, setSettings] = useState<AISettings[]>(existingSettings);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});

  // New setting form state
  const [newProvider, setNewProvider] = useState<'openai' | 'anthropic' | 'google'>('openai');
  const [newApiKey, setNewApiKey] = useState('');

  const handleAddSetting = async () => {
    if (!newApiKey.trim()) {
      setError('يرجى إدخال API Key');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/settings/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: newProvider,
          api_key: newApiKey,
          is_active: true,
          priority: settings.length + 1,
        }),
      });

      if (!response.ok) {
        throw new Error('فشل في إضافة الإعدادات');
      }

      const newSetting = await response.json();
      setSettings([...settings, newSetting]);
      setNewApiKey('');
      setIsAdding(false);
      setSuccess('تم إضافة الإعدادات بنجاح!');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSetting = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الإعدادات؟')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/settings/ai/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('فشل في حذف الإعدادات');
      }

      setSettings(settings.filter((s) => s.id !== id));
      setSuccess('تم حذف الإعدادات بنجاح!');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/settings/ai/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive }),
      });

      if (!response.ok) {
        throw new Error('فشل في تحديث الإعدادات');
      }

      setSettings(
        settings.map((s) => (s.id === id ? { ...s, is_active: isActive } : s))
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const toggleShowApiKey = (id: string) => {
    setShowApiKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'openai':
        return 'OpenAI';
      case 'anthropic':
        return 'Anthropic (Claude)';
      case 'google':
        return 'Google AI';
      default:
        return provider;
    }
  };

  const maskApiKey = (apiKey: string) => {
    if (apiKey.length <= 8) return '****';
    return `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
  };

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-900/20">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600 dark:text-green-400">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Existing Settings */}
      <div className="space-y-4">
        {settings.map((setting) => (
          <Card key={setting.id}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{getProviderName(setting.provider)}</h3>
                    {setting.is_active ? (
                      <Badge className="bg-green-500">نشط</Badge>
                    ) : (
                      <Badge variant="secondary">غير نشط</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {showApiKeys[setting.id] ? setting.api_key : maskApiKey(setting.api_key)}
                    </code>
                    <Button
                      onClick={() => toggleShowApiKey(setting.id)}
                      variant="ghost"
                      size="sm"
                    >
                      {showApiKeys[setting.id] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`active-${setting.id}`}>تفعيل</Label>
                    <Switch
                      id={`active-${setting.id}`}
                      checked={setting.is_active}
                      onCheckedChange={(checked) => handleToggleActive(setting.id, checked)}
                      disabled={loading}
                    />
                  </div>
                  <Button
                    onClick={() => handleDeleteSetting(setting.id)}
                    variant="ghost"
                    size="sm"
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {settings.length === 0 && !isAdding && (
          <div className="text-center py-8 text-muted-foreground">
            <p>لم تقم بإضافة أي مزود ذكاء اصطناعي بعد</p>
          </div>
        )}
      </div>

      {/* Add New Setting */}
      {isAdding ? (
        <Card>
          <CardHeader>
            <CardTitle>إضافة مزود جديد</CardTitle>
            <CardDescription>أدخل API Key من المزود المطلوب</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>المزود</Label>
              <Select
                value={newProvider}
                onValueChange={(value: any) => setNewProvider(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI (GPT-4, GPT-3.5)</SelectItem>
                  <SelectItem value="anthropic">Anthropic (Claude 3)</SelectItem>
                  <SelectItem value="google">Google AI (Gemini Pro)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                placeholder="sk-..."
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                سيتم تشفير المفتاح وتخزينه بشكل آمن
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddSetting} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                إضافة
              </Button>
              <Button
                onClick={() => {
                  setIsAdding(false);
                  setNewApiKey('');
                  setError(null);
                }}
                variant="outline"
                disabled={loading}
              >
                إلغاء
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setIsAdding(true)} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          إضافة مزود جديد
        </Button>
      )}

      {/* Help Text */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <h4 className="font-semibold mb-2">كيفية الحصول على API Key:</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <strong>OpenAI:</strong> قم بزيارة{' '}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                platform.openai.com/api-keys
              </a>
            </li>
            <li>
              <strong>Anthropic:</strong> قم بزيارة{' '}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                console.anthropic.com/settings/keys
              </a>
            </li>
            <li>
              <strong>Google AI:</strong> قم بزيارة{' '}
              <a
                href="https://makersuite.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                makersuite.google.com/app/apikey
              </a>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

