'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function AutoReplySettings() {
  const [expanded, setExpanded] = useState(false);
  const [enabled, setEnabled] = useState(false);

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
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
        </label>
      </div>

      {/* Status */}
      <div className="text-xs text-gray-400 mb-2">
        Status: <span className={enabled ? 'text-green-400' : 'text-gray-500'}>
          {enabled ? 'ON' : 'OFF'}
        </span>
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
            <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-gray-600 text-orange-500 focus:ring-orange-500" />
            <span className="text-sm text-gray-300">Positive reviews (4-5⭐)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-gray-600 text-orange-500 focus:ring-orange-500" />
            <span className="text-sm text-gray-300">Neutral reviews (3⭐)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded border-gray-600 text-orange-500 focus:ring-orange-500" />
            <span className="text-sm text-gray-300">Negative reviews (1-2⭐)</span>
          </label>

          <div className="pt-3 border-t border-gray-800">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-gray-600 text-orange-500 focus:ring-orange-500" />
              <span className="text-sm text-gray-300">Require approval before sending</span>
            </label>
          </div>

          <button className="w-full mt-3 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors">
            💾 Save Settings
          </button>
        </div>
      )}
    </div>
  );
}

