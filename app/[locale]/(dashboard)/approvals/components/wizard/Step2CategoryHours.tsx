"use client"

/**
 * Step 2: Category & Business Hours
 * Select business category and set operating hours
 */

import { BUSINESS_CATEGORIES, DAYS_OF_WEEK } from "@/lib/types/location-creation"
import { Dispatch, SetStateAction, useId } from "react"
import type { CreateLocationFormData } from "../CreateLocationTab"

type BusinessHours = CreateLocationFormData["business_hours"]
type DayKey = keyof BusinessHours

interface Step2Props {
  readonly formData: CreateLocationFormData
  readonly setFormData: Dispatch<SetStateAction<CreateLocationFormData>>
  readonly onNext: () => void
  readonly onBack: () => void
}

export function Step2CategoryHours({
  formData,
  setFormData,
  onNext,
  onBack,
}: Readonly<Step2Props>) {
  const primaryCategoryId = useId()
  const addCategorySelectId = useId()

  const toggleDay = (day: DayKey) => {
    setFormData({
      ...formData,
      business_hours: {
        ...formData.business_hours,
        [day]: {
          ...formData.business_hours[day],
          closed: !formData.business_hours[day].closed
        }
      }
    })
  }
  
  const updateHours = (day: DayKey, field: "open" | "close", value: string) => {
    setFormData({
      ...formData,
      business_hours: {
        ...formData.business_hours,
        [day]: {
          ...formData.business_hours[day],
          [field]: value
        }
      }
    })
  }
  
  const addCategory = (category: string) => {
    if (!formData.additional_categories.includes(category)) {
      setFormData({
        ...formData,
        additional_categories: [...formData.additional_categories, category],
      })
    }
  }
  
  const removeCategory = (category: string) => {
    setFormData({
      ...formData,
      additional_categories: formData.additional_categories.filter((c) => c !== category),
    })
  }
  
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">🏷️</div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Category & Hours
        </h2>
        <p className="text-zinc-400">
          Help customers find your business with the right category
        </p>
      </div>
      
      {/* Primary Category */}
      <div>
        <label htmlFor={primaryCategoryId} className="block text-sm font-medium text-white mb-2">
          Primary Category <span className="text-orange-500">*</span>
        </label>
        <select
          id={primaryCategoryId}
          value={formData.primary_category}
          onChange={(e) => setFormData({ ...formData, primary_category: e.target.value })}
          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-orange-500 focus:outline-none transition"
        >
          {BUSINESS_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <p className="text-xs text-zinc-500 mt-1">
          🎯 Choose the category that best describes your business
        </p>
      </div>
      
      {/* Additional Categories */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Additional Categories (optional)
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {formData.additional_categories.map((cat: string) => (
            <span
              key={cat}
              className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm flex items-center gap-2"
            >
              {cat}
              <button
                type="button"
                onClick={() => removeCategory(cat)}
                className="hover:text-orange-300"
                aria-label={`Remove category ${cat}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
        <select
          id={addCategorySelectId}
          onChange={(e) => {
            if (e.target.value) {
              addCategory(e.target.value)
              e.target.value = ""
            }
          }}
          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-orange-500 focus:outline-none transition"
          defaultValue=""
        >
          <option value="">+ Add another category</option>
          {BUSINESS_CATEGORIES
            .filter(
              (category) =>
                category !== formData.primary_category && !formData.additional_categories.includes(category)
            )
            .map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
        </select>
      </div>
      
      {/* Business Hours */}
      <div>
        <label className="block text-sm font-medium text-white mb-3">
          Business Hours <span className="text-orange-500">*</span>
        </label>
        <div className="space-y-2">
          {(DAYS_OF_WEEK as DayKey[]).map((day) => {
            const checkboxId = `${day}-open-toggle`
            const openId = `${day}-open-time`
            const closeId = `${day}-close-time`
            return (
              <div
                key={day}
                className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-800 rounded-lg p-3"
              >
              <div className="flex items-center gap-2 w-32">
                <input
                  id={checkboxId}
                  type="checkbox"
                  checked={!formData.business_hours[day].closed}
                  onChange={() => toggleDay(day)}
                  className="w-4 h-4 rounded border-zinc-700 text-orange-600 focus:ring-orange-500"
                />
                <label htmlFor={checkboxId} className="text-white capitalize font-medium">
                  {day}
                </label>
              </div>
              
              {formData.business_hours[day].closed ? (
                <span className="text-zinc-500 italic">Closed</span>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <label htmlFor={openId} className="sr-only">
                      {day} opening time
                    </label>
                    <input
                      id={openId}
                      type="time"
                      value={formData.business_hours[day].open}
                      onChange={(e) => updateHours(day, "open", e.target.value)}
                      className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <span className="text-zinc-500">to</span>
                  <div className="flex flex-col">
                    <label htmlFor={closeId} className="sr-only">
                      {day} closing time
                    </label>
                    <input
                      id={closeId}
                      type="time"
                      value={formData.business_hours[day].close}
                      onChange={(e) => updateHours(day, "close", e.target.value)}
                      className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
            )
          })}
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          ⏰ For businesses open past midnight, use times after 24:00 (e.g., 26:00 for 2 AM)
        </p>
      </div>
      
      {/* Actions */}
      <div className="flex justify-between gap-3 pt-6 border-t border-zinc-800">
        <button
          onClick={onBack}
          type="button"
          className="px-8 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event("dashboard:refresh"))
            }
            onNext();
          }}
          className="px-8 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition hover:scale-105"
        >
          Next: Features →
        </button>
      </div>
    </div>
  )
}
