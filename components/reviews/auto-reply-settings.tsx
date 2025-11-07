'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { saveAutoReplySettings, getAutoReplySettings, type AutoReplySettings } from '@/server/actions/auto-reply';

interface AutoReplySettingsProps {
  locationId?: string;
}

export function AutoReplySettings({ locationId }: AutoReplySettingsProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AutoReplySettings>({
    enabled: false,
    minRating: 4,
    replyToPositive: true,
    replyToNeutral: false,
    replyToNegative: false,
    requireApproval: true,
    tone: 'friendly',
    locationId: locationId,
  });

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [locationId]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const result = await getAutoReplySettings(locationId);
      if (result.success && result.data) {
        setSettings(result.data);
      }
    } catch (error) {
      console.error('Error loading auto-reply settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await saveAutoReplySettings({
        ...settings,
        locationId: locationId,
      });

      if (result.success) {
        toast.success('Auto-reply settings saved!', {
          description: result.message,
        });
      } else {
        toast.error('Failed to save settings', {
          description: result.error,
        });
      }
    } catch (error) {
      console.error('Error saving auto-reply settings:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          <span className="font-semibold text-white">AI Auto Reply</span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
            disabled={loading || saving}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
        </label>
      </div>

      {/* Status */}
      <div className="text-xs text-gray-400 mb-2">
        Status: <span className={settings.enabled ? 'text-green-400' : 'text-gray-500'}>
          {settings.enabled ? 'ON' : 'OFF'}
        </span>
        {loading && <span className="ml-2 text-gray-500">Loading...</span>}
      </div>

      {/* Expand Button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-sm text-gray-400 hover:text-white transition-colors"
      >
        <span>⚙️ Settings</span>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {/* Expanded Settings */}
      {expanded && (
        <div className="mt-4 space-y-3 pt-3 border-t border-gray-800">
          <div className="text-sm text-gray-300 mb-2">Auto-reply to:</div>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={settings.replyToPositive}
              onChange={(e) => setSettings({ ...settings, replyToPositive: e.target.checked })}
              disabled={loading || saving}
              className="w-4 h-4 rounded border-gray-600 text-orange-500 focus:ring-orange-500" 
            />
            <span className="text-sm text-gray-300">Positive reviews (4-5⭐)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={settings.replyToNeutral}
              onChange={(e) => setSettings({ ...settings, replyToNeutral: e.target.checked })}
              disabled={loading || saving}
              className="w-4 h-4 rounded border-gray-600 text-orange-500 focus:ring-orange-500" 
            />
            <span className="text-sm text-gray-300">Neutral reviews (3⭐)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={settings.replyToNegative}
              onChange={(e) => setSettings({ ...settings, replyToNegative: e.target.checked })}
              disabled={loading || saving}
              className="w-4 h-4 rounded border-gray-600 text-orange-500 focus:ring-orange-500" 
            />
            <span className="text-sm text-gray-300">Negative reviews (1-2⭐)</span>
          </label>

          <div className="pt-3 border-t border-gray-800">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={settings.requireApproval}
                onChange={(e) => setSettings({ ...settings, requireApproval: e.target.checked })}
                disabled={loading || saving}
                className="w-4 h-4 rounded border-gray-600 text-orange-500 focus:ring-orange-500" 
              />
              <span className="text-sm text-gray-300">Require approval before sending</span>
            </label>
          </div>

          <div className="pt-3 border-t border-gray-800">
            <label className="block text-sm text-gray-300 mb-2">Tone:</label>
            <select
              value={settings.tone}
              onChange={(e) => setSettings({ ...settings, tone: e.target.value as AutoReplySettings['tone'] })}
              disabled={loading || saving}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="friendly">😊 Friendly</option>
              <option value="professional">👔 Professional</option>
              <option value="apologetic">🙏 Apologetic</option>
              <option value="marketing">🎯 Marketing</option>
            </select>
          </div>

          <button 
            onClick={handleSave}
            disabled={loading || saving}
            className="w-full mt-3 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {saving ? '💾 Saving...' : '💾 Save Settings'}
          </button>
        </div>
      )}
    </div>
  );
}

