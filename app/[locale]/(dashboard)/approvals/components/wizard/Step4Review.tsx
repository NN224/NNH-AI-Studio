'use client'

/**
 * Step 4: Review & Submit
 * Final review before creating location
 */

import { FEATURES, PAYMENT_METHODS } from '@/lib/types/location-creation'
import type { CreateLocationFormData } from '../CreateLocationTab'

interface Step4Props {
  readonly formData: CreateLocationFormData
  readonly onSubmit: () => void
  readonly onBack: () => void
}

export function Step4Review({ formData, onSubmit, onBack }: Step4Props) {
  const getFeatureLabel = (id: string) => FEATURES.find(f => f.id === id)?.label || id
  const getPaymentLabel = (id: string) => PAYMENT_METHODS.find(p => p.id === id)?.label || id
  const cityState = [formData.city, formData.state].filter(Boolean).join(', ')
  const postalCountry = [formData.postal_code, formData.country].filter(Boolean).join(' ')
  const formattedAddress = [formData.street, cityState || undefined, postalCountry || undefined].filter(Boolean).join(', ')
  
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">📋</div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Review Your Location
        </h2>
        <p className="text-zinc-400">
          Please review all details before submitting to Google
        </p>
      </div>
      
      {/* Business Info */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 bg-zinc-900 border-b border-zinc-800">
          <h3 className="font-semibold text-white flex items-center gap-2">
            📍 Basic Information
          </h3>
        </div>
        <div className="p-6 space-y-3">
          <ReviewItem label="Business Name" value={formData.business_name} />
          <ReviewItem 
            label="Address" 
            value={formattedAddress} 
          />
          <ReviewItem label="Phone" value={formData.phone} />
          {formData.website && <ReviewItem label="Website" value={formData.website} />}
        </div>
      </div>
      
      {/* Category & Hours */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 bg-zinc-900 border-b border-zinc-800">
          <h3 className="font-semibold text-white flex items-center gap-2">
            🏷️ Category & Hours
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <ReviewItem label="Primary Category" value={formData.primary_category} />
          {formData.additional_categories.length > 0 && (
            <ReviewItem 
              label="Additional Categories" 
              value={formData.additional_categories.join(', ')} 
            />
          )}
          
          <div>
            <div className="text-sm font-medium text-zinc-400 mb-2">Business Hours</div>
            <div className="space-y-1">
              {Object.entries(formData.business_hours).map(([day, hours]: [string, any]) => (
                <div key={day} className="flex justify-between text-sm">
                  <span className="text-white capitalize">{day}</span>
                  <span className="text-zinc-400">
                    {hours.closed ? 'Closed' : `${hours.open} - ${hours.close}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Features */}
      {(formData.features.length > 0 || formData.payment_methods.length > 0) && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 bg-zinc-900 border-b border-zinc-800">
            <h3 className="font-semibold text-white flex items-center gap-2">
              ✨ Features & Amenities
            </h3>
          </div>
          <div className="p-6 space-y-4">
            {formData.features.length > 0 && (
              <div>
                <div className="text-sm font-medium text-zinc-400 mb-2">Features</div>
                <div className="flex flex-wrap gap-2">
                  {formData.features.map((id: string) => (
                    <span key={id} className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm">
                      {getFeatureLabel(id)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {formData.payment_methods.length > 0 && (
              <div>
                <div className="text-sm font-medium text-zinc-400 mb-2">Payment Methods</div>
                <div className="flex flex-wrap gap-2">
                  {formData.payment_methods.map((id: string) => (
                    <span key={id} className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                      {getPaymentLabel(id)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Important Notice */}
      <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
        <div className="flex gap-3">
          <div className="text-2xl">⚠️</div>
          <div>
            <div className="font-medium text-orange-400 mb-1">Before You Submit</div>
            <ul className="text-sm text-zinc-400 space-y-1">
              <li>• Make sure all information is accurate and up-to-date</li>
              <li>• Google will send a verification postcard to the address provided</li>
              <li>• Verification typically takes 5-14 business days</li>
              <li>• You'll be notified when the postcard arrives</li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex justify-between gap-3 pt-6 border-t border-zinc-800">
        <button
          onClick={onBack}
          className="px-8 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition"
        >
          ← Back
        </button>
        <button
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('dashboard:refresh'));
              console.log('[Step4Review] Location submitted to Google, dashboard refresh triggered');
            }
            onSubmit();
          }}
          className="px-8 py-3 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white rounded-lg font-medium transition hover:scale-105 flex items-center gap-2"
        >
          <span>🚀</span>
          <span>Submit to Google</span>
        </button>
      </div>
    </div>
  )
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
      <span className="text-sm font-medium text-zinc-400">{label}</span>
      <span className="text-sm text-white">{value}</span>
    </div>
  )
}

