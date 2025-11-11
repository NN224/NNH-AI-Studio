'use client'

/**
 * Create Location Tab - Multi-Step Wizard
 * Google-like location creation experience
 */

import { useState } from "react"
import { LocationCreationRequest } from "@/lib/types/location-creation"
import { Step1BasicInfo } from "./wizard/Step1BasicInfo"
import { Step2CategoryHours } from "./wizard/Step2CategoryHours"
import { Step3Features } from "./wizard/Step3Features"
import { Step4Review } from "./wizard/Step4Review"

interface CreateLocationTabProps {
  readonly onLocationCreated: (location: LocationCreationRequest) => void
}

const createInitialFormState = () => ({
  business_name: "",
  street: "",
  city: "",
  state: "",
  postal_code: "",
  country: "AE",
  phone: "",
  website: "",
  primary_category: "Night club",
  additional_categories: [] as string[],
  business_hours: {
    monday: { open: "", close: "", closed: true },
    tuesday: { open: "", close: "", closed: true },
    wednesday: { open: "", close: "", closed: true },
    thursday: { open: "22:00", close: "04:00", closed: false },
    friday: { open: "22:00", close: "04:00", closed: false },
    saturday: { open: "22:00", close: "04:00", closed: false },
    sunday: { open: "", close: "", closed: true },
  },
  features: [] as string[],
  payment_methods: [] as string[],
})

export type CreateLocationFormData = ReturnType<typeof createInitialFormState>

export function CreateLocationTab({ onLocationCreated }: CreateLocationTabProps) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<CreateLocationFormData>(() => createInitialFormState())
  
  const totalSteps = 4
  
  const handleSubmit = () => {
    // Phase 2: Mock submission
    const newLocation: LocationCreationRequest = {
      id: `loc-${Date.now()}`,
      user_id: 'user123',
      business_name: formData.business_name,
      address: {
        street: formData.street,
        city: formData.city,
        state: formData.state,
        postal_code: formData.postal_code,
        country: formData.country
      },
      phone: formData.phone,
      website: formData.website,
      primary_category: formData.primary_category,
      additional_categories: formData.additional_categories,
      business_hours: formData.business_hours,
      features: formData.features,
      payment_methods: formData.payment_methods,
      status: 'pending_verification',
      google_location_id: `ChIJ${Math.random().toString(36).slice(2, 11)}`,
      verification: {
        method: 'POSTCARD',
        verification_id: `verify-${Date.now()}`,
        requested_at: new Date().toISOString(),
        expected_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    onLocationCreated(newLocation)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('dashboard:refresh'));
      console.log('[CreateLocationTab] New location created, dashboard refresh triggered');
    }
    
    // Reset form
    setStep(1)
    setFormData(createInitialFormState())
  }
  
  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {[1, 2, 3, 4].map((s, idx) => (
            <div key={s} className="flex items-center flex-1">
              <div className={`
                flex items-center justify-center w-10 h-10 rounded-full font-bold transition-all
                ${step >= s ? 'bg-orange-600 text-white scale-110' : 'bg-zinc-800 text-zinc-500'}
              `}>
                {step > s ? '✓' : s}
              </div>
              {s < 4 && (
                <div className={`
                  flex-1 h-1 mx-2 transition-all rounded
                  ${step > s ? 'bg-orange-600' : 'bg-zinc-800'}
                `} />
              )}
            </div>
          ))}
        </div>
        <div className="text-center text-sm text-zinc-400">
          Step {step} of {totalSteps}
        </div>
      </div>
      
      {/* Step Content */}
      {step === 1 && (
        <Step1BasicInfo 
          formData={formData} 
          setFormData={setFormData}
          onNext={() => setStep(2)}
        />
      )}
      
      {step === 2 && (
        <Step2CategoryHours 
          formData={formData} 
          setFormData={setFormData}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}
      
      {step === 3 && (
        <Step3Features 
          formData={formData} 
          setFormData={setFormData}
          onNext={() => setStep(4)}
          onBack={() => setStep(2)}
        />
      )}
      
      {step === 4 && (
        <Step4Review 
          formData={formData}
          onSubmit={handleSubmit}
          onBack={() => setStep(3)}
        />
      )}
    </div>
  )
}

