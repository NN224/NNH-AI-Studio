'use client'

/**
 * Pending Verification Tab
 * Manage locations awaiting verification and enter verification codes
 */

import { useId, useState } from 'react'
import { LocationCreationRequest, VERIFICATION_METHODS } from '@/lib/types/location-creation'

interface PendingVerificationTabProps {
  readonly locations: ReadonlyArray<LocationCreationRequest>
  readonly onVerificationComplete: (locationId: string, code: string) => void
}

export function PendingVerificationTab({ locations, onVerificationComplete }: PendingVerificationTabProps) {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const codeInputId = useId()
  
  if (locations.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">⏳</div>
        <h3 className="text-xl font-semibold text-white mb-2">
          No Pending Verifications
        </h3>
        <p className="text-zinc-400">
          Create a new location to start the verification process
        </p>
      </div>
    )
  }
  
  const handleVerify = (locationId: string) => {
    if (verificationCode.trim().length >= 5) {
      onVerificationComplete(locationId, verificationCode)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('dashboard:refresh'));
        console.log('[PendingVerificationTab] Verification completed, dashboard refresh dispatched');
      }
      setVerificationCode('')
      setSelectedLocation(null)
    }
  }
  
  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">
          Locations Awaiting Verification
        </h3>
        <p className="text-zinc-400 text-sm">
          Enter the verification code when you receive it from Google
        </p>
      </div>
      
      {locations.map((location) => {
        const method = VERIFICATION_METHODS.find(m => m.id === location.verification.method)
        const isSelected = selectedLocation === location.id
        
        return (
          <div 
            key={location.id}
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition"
          >
            {/* Location Header */}
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-white mb-2">
                    {location.business_name}
                  </h4>
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
                  <div className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-xs font-medium mb-2">
                    Pending Verification
                  </div>
                  <div className="text-xs text-zinc-500">
                    Created {new Date(location.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              
              {/* Verification Method Info */}
              {method && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{method.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium text-white mb-1">
                        Verification via {method.name}
                      </div>
                      <div className="text-sm text-zinc-400 mb-2">
                        {method.description}
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1 text-zinc-500">
                          <span>⏱️</span>
                          <span>Est. Time: {method.estimatedTime}</span>
                        </div>
                        {location.verification.expected_date && (
                          <div className="flex items-center gap-1 text-zinc-500">
                            <span>📅</span>
                            <span>Expected: {location.verification.expected_date}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Verification Code Input */}
              {isSelected ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2" htmlFor={codeInputId}>
                      Enter Verification Code
                    </label>
                    <input
                      id={codeInputId}
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                      placeholder="Enter 5-6 digit code"
                      className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-center text-2xl font-mono tracking-wider focus:border-orange-500 focus:outline-none"
                      maxLength={6}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleVerify(location.id)}
                      disabled={verificationCode.length < 5}
                      className={`
                        flex-1 px-4 py-3 rounded-lg font-medium transition
                        ${verificationCode.length >= 5
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        }
                      `}
                    >
                      ✓ Verify Location
                    </button>
                    <button
                      onClick={() => {
                        setSelectedLocation(null)
                        setVerificationCode('')
                      }}
                      className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedLocation(location.id)}
                    className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition"
                  >
                    📝 Enter Verification Code
                  </button>
                  <button
                    className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition"
                    title="Resend verification"
                  >
                    🔄 Resend
                  </button>
                </div>
              )}
            </div>
            
            {/* Help Text */}
            <div className="px-6 py-3 bg-zinc-900/50 border-t border-zinc-800">
              <div className="text-xs text-zinc-500">
                💡 Haven't received your code? It can take up to {method?.estimatedTime.toLowerCase()} to arrive.
              </div>
            </div>
          </div>
        )
      })}
      
      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mt-6">
        <div className="flex gap-3">
          <div className="text-2xl">ℹ️</div>
          <div>
            <div className="font-medium text-blue-400 mb-1">Verification Process</div>
            <div className="text-sm text-zinc-400 space-y-1">
              <p>• <strong>Postcard:</strong> Check your mailbox daily. The code expires after 30 days.</p>
              <p>• <strong>Phone:</strong> Answer the call and note down the 6-digit code.</p>
              <p>• <strong>Email:</strong> Check your inbox and spam folder.</p>
              <p>• If you don't receive the code within the expected time, you can request a new verification.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

