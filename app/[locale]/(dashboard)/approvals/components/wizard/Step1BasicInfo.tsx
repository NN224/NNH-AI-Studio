"use client"

/**
 * Step 1: Basic Information
 * Business name, address, contact details
 */

import { Dispatch, SetStateAction, useId } from "react"
import type { CreateLocationFormData } from "../CreateLocationTab"

interface Step1Props {
  readonly formData: CreateLocationFormData
  readonly setFormData: Dispatch<SetStateAction<CreateLocationFormData>>
  readonly onNext: () => void
}

export function Step1BasicInfo({ formData, setFormData, onNext }: Readonly<Step1Props>) {
  const businessNameId = useId()
  const streetId = useId()
  const cityId = useId()
  const stateId = useId()
  const postalCodeId = useId()
  const countryId = useId()
  const phoneId = useId()
  const websiteId = useId()

  const isValid =
    formData.business_name.trim() &&
    formData.street.trim() &&
    formData.city.trim() &&
    formData.phone.trim()
  
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">📍</div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Basic Information
        </h2>
        <p className="text-zinc-400">
          Enter your business details as they should appear on Google
        </p>
      </div>
      
      {/* Business Name */}
      <div>
        <label htmlFor={businessNameId} className="block text-sm font-medium text-white mb-2">
          Business Name <span className="text-orange-500">*</span>
        </label>
        <input
          id={businessNameId}
          type="text"
          value={formData.business_name}
          onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none transition"
          placeholder="The DXB Night Club - Downtown Branch"
        />
        <p className="text-xs text-zinc-500 mt-1">
          💡 Use your official business name as registered
        </p>
      </div>
      
      {/* Address */}
      <div>
        <label htmlFor={streetId} className="block text-sm font-medium text-white mb-2">
          Street Address <span className="text-orange-500">*</span>
        </label>
        <input
          id={streetId}
          type="text"
          value={formData.street}
          onChange={(e) => setFormData({ ...formData, street: e.target.value })}
          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none transition"
          placeholder="123 Sheikh Zayed Road"
        />
        <p className="text-xs text-zinc-500 mt-1">
          📮 Make sure this address can receive postal mail
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor={cityId} className="block text-sm font-medium text-white mb-2">
            City <span className="text-orange-500">*</span>
          </label>
          <input
            id={cityId}
            type="text"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none transition"
            placeholder="Dubai"
          />
        </div>
        <div>
          <label htmlFor={stateId} className="block text-sm font-medium text-white mb-2">
            State/Province
          </label>
          <input
            id={stateId}
            type="text"
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none transition"
            placeholder="Dubai"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor={postalCodeId} className="block text-sm font-medium text-white mb-2">
            Postal Code
          </label>
          <input
            id={postalCodeId}
            type="text"
            value={formData.postal_code}
            onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none transition"
            placeholder="00000"
          />
        </div>
        <div>
          <label htmlFor={countryId} className="block text-sm font-medium text-white mb-2">
            Country <span className="text-orange-500">*</span>
          </label>
          <select
            id={countryId}
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-orange-500 focus:outline-none transition"
          >
            <option value="AE">🇦🇪 United Arab Emirates</option>
            <option value="SA">🇸🇦 Saudi Arabia</option>
            <option value="US">🇺🇸 United States</option>
            <option value="GB">🇬🇧 United Kingdom</option>
            <option value="FR">🇫🇷 France</option>
            <option value="DE">🇩🇪 Germany</option>
          </select>
        </div>
      </div>
      
      {/* Contact */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor={phoneId} className="block text-sm font-medium text-white mb-2">
            Phone Number <span className="text-orange-500">*</span>
          </label>
          <input
            id={phoneId}
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none transition"
            placeholder="+971 4 XXX XXXX"
          />
          <p className="text-xs text-zinc-500 mt-1">
            📞 Include country code
          </p>
        </div>
        <div>
          <label htmlFor={websiteId} className="block text-sm font-medium text-white mb-2">
            Website (optional)
          </label>
          <input
            id={websiteId}
            type="url"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none transition"
            placeholder="https://yourwebsite.com"
          />
        </div>
      </div>
      
      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex gap-3">
          <div className="text-2xl">ℹ️</div>
          <div>
            <div className="font-medium text-blue-400 mb-1">Important Information</div>
            <div className="text-sm text-zinc-400">
              Make sure your address can receive postal mail. Google will send a verification postcard 
              with a code to this address. The verification process typically takes 5-14 business days.
            </div>
          </div>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex justify-end gap-3 pt-6 border-t border-zinc-800">
        <button
          onClick={() => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event("dashboard:refresh"))
            }
            onNext();
          }}
          disabled={!isValid}
          className={`
            px-8 py-3 rounded-lg font-medium transition-all flex items-center gap-2
            ${isValid
              ? 'bg-orange-600 hover:bg-orange-700 text-white hover:scale-105'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }
          `}
        >
          Next: Category & Hours →
        </button>
      </div>
    </div>
  )
}
