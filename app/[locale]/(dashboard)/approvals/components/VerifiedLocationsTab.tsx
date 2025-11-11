'use client'

/**
 * Verified Locations Tab
 * Display and manage successfully verified locations
 */

import { LocationCreationRequest } from '@/lib/types/location-creation'

interface VerifiedLocationsTabProps {
  readonly locations: ReadonlyArray<LocationCreationRequest>
}

export function VerifiedLocationsTab({ locations }: VerifiedLocationsTabProps) {
  if (locations.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">✅</div>
        <h3 className="text-xl font-semibold text-white mb-2">
          No Verified Locations Yet
        </h3>
        <p className="text-zinc-400">
          Complete the verification process to see your locations here
        </p>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">
          Successfully Verified Locations
        </h3>
        <p className="text-zinc-400 text-sm">
          These locations are now live on Google Business Profile
        </p>
      </div>
      
      {locations.map((location) => (
        <div 
          key={location.id}
          className="bg-zinc-900/50 border border-green-500/20 rounded-xl overflow-hidden hover:border-green-500/40 transition"
        >
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-lg font-semibold text-white">
                    {location.business_name}
                  </h4>
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                    ✓ Verified
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
                  <div className="flex items-center gap-2">
                    <span>🏷️</span>
                    <span>{location.primary_category}</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-xs text-zinc-500 mb-2">
                  Verified {location.verification.completed_at ? new Date(location.verification.completed_at).toLocaleDateString() : 'N/A'}
                </div>
                <div className="text-xs text-zinc-600">
                  ID: {location.google_location_id}
                </div>
              </div>
            </div>
            
            {/* Verification Details */}
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-green-400 text-sm mb-2">
                <span>✓</span>
                <span className="font-medium">Location Successfully Verified</span>
              </div>
              <div className="text-xs text-zinc-400">
                Verified via {location.verification.method?.replace('_', ' ')} on{' '}
                {location.verification.completed_at ? new Date(location.verification.completed_at).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }) : 'N/A'}
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-zinc-900 rounded-lg">
                <div className="text-2xl mb-1">👥</div>
                <div className="text-xs text-zinc-500">Active</div>
              </div>
              <div className="text-center p-3 bg-zinc-900 rounded-lg">
                <div className="text-2xl mb-1">📊</div>
                <div className="text-xs text-zinc-500">Stats Available</div>
              </div>
              <div className="text-center p-3 bg-zinc-900 rounded-lg">
                <div className="text-2xl mb-1">⭐</div>
                <div className="text-xs text-zinc-500">Ready for Reviews</div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.business_name)}`, '_blank');
                    window.dispatchEvent(new Event('dashboard:refresh'));
                    console.log('[VerifiedLocationsTab] View on Google clicked, dashboard refresh dispatched');
                  }
                }}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
              >
                <span>👁️</span>
                <span>View on Google</span>
              </button>

              <button
                onClick={() => {
                  console.log('[VerifiedLocationsTab] Edit Details clicked');
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new Event('dashboard:refresh'));
                  }
                }}
                className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
              >
                <span>✏️</span>
                <span>Edit Details</span>
              </button>

              <button
                onClick={() => {
                  console.log('[VerifiedLocationsTab] More options clicked');
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new Event('dashboard:refresh'));
                  }
                }}
                className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition"
                title="More options"
              >
                ⚙️
              </button>
            </div>
          </div>
          
          {/* Footer */}
          <div className="px-6 py-3 bg-zinc-900/50 border-t border-zinc-800">
            <div className="flex items-center justify-between text-xs">
              <div className="text-zinc-500">
                Created {new Date(location.created_at).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-4">
                <button className="text-blue-400 hover:text-blue-300 transition">
                  📊 View Analytics
                </button>
                <button className="text-orange-400 hover:text-orange-300 transition">
                  💬 Manage Reviews
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
      
      {/* Success Message */}
      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mt-6">
        <div className="flex gap-3">
          <div className="text-2xl">🎉</div>
          <div>
            <div className="font-medium text-green-400 mb-1">Congratulations!</div>
            <div className="text-sm text-zinc-400">
              Your verified locations are now live on Google Maps and Search. Customers can find you, 
              see your business hours, leave reviews, and get directions. Monitor your performance in 
              the Analytics section.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
