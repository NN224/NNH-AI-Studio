'use client'

/**
 * Step 3: Features & Amenities
 * Select business features and payment methods
 */

import { useId } from 'react'
import { FEATURES, PAYMENT_METHODS } from '@/lib/types/location-creation'
import type { CreateLocationFormData } from '../CreateLocationTab'

interface Step3Props {
  readonly formData: CreateLocationFormData
  readonly setFormData: (data: CreateLocationFormData) => void
  readonly onNext: () => void
  readonly onBack: () => void
}

export function Step3Features({ formData, setFormData, onNext, onBack }: Step3Props) {
  const featuresGroupLabelId = useId()
  const paymentGroupLabelId = useId()
  const toggleFeature = (featureId: string) => {
    const features = formData.features.includes(featureId)
      ? formData.features.filter((f: string) => f !== featureId)
      : [...formData.features, featureId]
    setFormData({ ...formData, features })
  }
  
  const togglePaymentMethod = (methodId: string) => {
    const methods = formData.payment_methods.includes(methodId)
      ? formData.payment_methods.filter((m: string) => m !== methodId)
      : [...formData.payment_methods, methodId]
    setFormData({ ...formData, payment_methods: methods })
  }
  
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">✨</div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Features & Amenities
        </h2>
        <p className="text-zinc-400">
          Tell customers what makes your business special
        </p>
      </div>
      
      {/* Features */}
      <div>
        <p className="block text-sm font-medium text-white mb-3" id={featuresGroupLabelId}>
          Business Features (optional)
        </p>
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
          role="group"
          aria-labelledby={featuresGroupLabelId}
        >
          {FEATURES.map(feature => (
            <button
              key={feature.id}
              onClick={() => toggleFeature(feature.id)}
              className={`
                p-4 rounded-lg border-2 transition-all text-left
                ${formData.features.includes(feature.id)
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{feature.icon}</span>
                <div>
                  <div className={`font-medium ${formData.features.includes(feature.id) ? 'text-orange-400' : 'text-white'}`}>
                    {feature.label}
                  </div>
                  {formData.features.includes(feature.id) && (
                    <div className="text-xs text-orange-400/70 mt-1">✓ Selected</div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          💡 Select all features that apply to your business
        </p>
      </div>
      
      {/* Payment Methods */}
      <div>
        <p className="block text-sm font-medium text-white mb-3" id={paymentGroupLabelId}>
          Payment Methods (optional)
        </p>
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
          role="group"
          aria-labelledby={paymentGroupLabelId}
        >
          {PAYMENT_METHODS.map(method => (
            <button
              key={method.id}
              onClick={() => togglePaymentMethod(method.id)}
              className={`
                p-4 rounded-lg border-2 transition-all text-left
                ${formData.payment_methods.includes(method.id)
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{method.icon}</span>
                <div>
                  <div className={`font-medium ${formData.payment_methods.includes(method.id) ? 'text-green-400' : 'text-white'}`}>
                    {method.label}
                  </div>
                  {formData.payment_methods.includes(method.id) && (
                    <div className="text-xs text-green-400/70 mt-1">✓ Accepted</div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          💳 Let customers know which payment methods you accept
        </p>
      </div>
      
      {/* Info Box */}
      <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
        <div className="flex gap-3">
          <div className="text-2xl">💡</div>
          <div>
            <div className="font-medium text-purple-400 mb-1">Optional but Recommended</div>
            <div className="text-sm text-zinc-400">
              Adding features and amenities helps customers find your business when searching for 
              specific services. For example, "Night clubs with parking" or "Bars with Wi-Fi".
            </div>
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
              console.log('[Step3Features] Features completed, dashboard refresh triggered');
            }
            onNext();
          }}
          className="px-8 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition hover:scale-105"
        >
          Next: Review →
        </button>
      </div>
    </div>
  )
}
