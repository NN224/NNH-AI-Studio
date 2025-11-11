'use client'

/**
 * Issues Tab
 * Display rejected locations with error messages and retry options
 */

import { LocationCreationRequest } from '@/lib/types/location-creation'

interface IssuesTabProps {
  readonly locations: ReadonlyArray<LocationCreationRequest>
  readonly onRetry: (locationId: string) => void
}

export function IssuesTab({ locations, onRetry }: IssuesTabProps) {
  if (locations.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">✅</div>
        <h3 className="text-xl font-semibold text-white mb-2">
          No Issues Found
        </h3>
        <p className="text-zinc-400">
          All your locations are proceeding smoothly
        </p>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">
          Locations With Issues
        </h3>
        <p className="text-zinc-400 text-sm">
          These locations need your attention to complete verification
        </p>
      </div>
      
      {locations.map((location) => (
        <div 
          key={location.id}
          className="bg-zinc-900/50 border border-red-500/20 rounded-xl overflow-hidden"
        >
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-lg font-semibold text-white">
                    {location.business_name}
                  </h4>
                  <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full text-xs font-medium">
                    ❌ Rejected
                  </span>
                </div>
                
                <div className="space-y-1 text-sm text-zinc-400">
                  <div className="flex items-center gap-2">
                    <span>📍</span>
                    <span>{location.address.street}, {location.address.city}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>📞</span>
                    <span>{location.phone}</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-xs text-zinc-500">
                  Rejected {new Date(location.updated_at).toLocaleDateString()}
                </div>
              </div>
            </div>
            
            {/* Error Message */}
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="flex-1">
                  <div className="font-medium text-red-400 mb-2">
                    Verification Failed
                  </div>
                  <div className="text-sm text-zinc-400 mb-3">
                    {location.verification.error_message || 'Unable to verify this location. Please review the details and try again.'}
                  </div>
                  
                  {/* Common Issues */}
                  <div className="text-xs text-zinc-500">
                    <div className="font-medium mb-1">Common reasons:</div>
                    <ul className="space-y-0.5 ml-4">
                      <li>• Address doesn't match official records</li>
                      <li>• Business name is inconsistent</li>
                      <li>• Phone number is invalid or unreachable</li>
                      <li>• Location already claimed by another user</li>
                      <li>• Business category is incorrect</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Suggested Actions */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-4">
              <div className="font-medium text-white mb-2 text-sm">
                💡 Suggested Actions
              </div>
              <div className="space-y-2 text-sm text-zinc-400">
                <div className="flex items-start gap-2">
                  <span>1.</span>
                  <span>Verify your address matches official records (government registration, utility bills)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span>2.</span>
                  <span>Ensure business name is exactly as registered</span>
                </div>
                <div className="flex items-start gap-2">
                  <span>3.</span>
                  <span>Check if the location is already claimed on Google Maps</span>
                </div>
                <div className="flex items-start gap-2">
                  <span>4.</span>
                  <span>Contact Google Business Profile support for manual review</span>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  onRetry(location.id);
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new Event('dashboard:refresh'));
                    console.log('[IssuesTab] Retry clicked, dashboard refresh dispatched');
                  }
                }}
                className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
              >
                <span>🔄</span>
                <span>Edit & Retry Verification</span>
              </button>
              <button className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition flex items-center gap-2">
                <span>📧</span>
                <span>Contact Support</span>
              </button>
              <button className="px-4 py-3 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg font-medium transition" title="Delete location">
                🗑️
              </button>
            </div>
          </div>
          
          {/* Footer */}
          <div className="px-6 py-3 bg-zinc-900/50 border-t border-zinc-800">
            <div className="flex items-center justify-between text-xs">
              <div className="text-zinc-500">
                Originally created {new Date(location.created_at).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-4">
                <button className="text-blue-400 hover:text-blue-300 transition">
                  📖 View Guidelines
                </button>
                <button className="text-orange-400 hover:text-orange-300 transition">
                  🎓 Troubleshooting Guide
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
      
      {/* Help Section */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mt-6">
        <div className="flex gap-3">
          <div className="text-2xl">💬</div>
          <div>
            <div className="font-medium text-blue-400 mb-1">Need Help?</div>
            <div className="text-sm text-zinc-400 mb-3">
              If you're having trouble resolving these issues, our support team can help you through the process.
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">
                💬 Chat with Support
              </button>
              <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition">
                📧 Email Support
              </button>
              <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition">
                📚 Help Center
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
