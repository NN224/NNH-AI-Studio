'use client'

import { useMemo, useState, useCallback, type ChangeEvent } from 'react'
import { toast } from 'sonner'
import type { BusinessProfilePayload, FeatureCategoryKey } from '@/types/features'
import { FEATURE_CATALOG } from '@/lib/features/feature-definitions'
import { ESSENTIAL_FEATURES, getEssentialFeatures } from '@/lib/features/essential-features'
import { getIndustryFeatures } from '@/lib/features/industry-specific-features'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Tag, Link2, List, Sparkles, Bot, CheckCircle2, Circle } from 'lucide-react'

const FEATURE_CATEGORY_KEYS: readonly FeatureCategoryKey[] = ['amenities', 'payment_methods', 'services', 'atmosphere']
const COMMON_CATEGORIES: readonly string[] = [
  'Night club', 'Bar', 'Live music venue', 'Dance club', 'Cocktail bar',
  'Restaurant', 'Entertainment venue', 'Event venue', 'Lounge', 'Wine bar',
  'Beer garden', 'Pub', 'Sports bar', 'Karaoke bar',
]
// Removed FROM_BUSINESS_OPTIONS - not relevant for target market
const __DEV__ = process.env.NODE_ENV !== 'production'

interface TabComponentProps {
  readonly profile: BusinessProfilePayload
  readonly onChange: (next: BusinessProfilePayload) => void
  readonly onDirty: () => void
  readonly disabled?: boolean
}

function withUpdatedFeatures(
  profile: BusinessProfilePayload,
  category: FeatureCategoryKey,
  updater: (current: readonly string[]) => readonly string[],
): BusinessProfilePayload {
  return {
    ...profile,
    features: {
    ...profile.features,
    [category]: updater(profile.features?.[category] ?? []),
    },
  }
}

function sanitizeUrl(value: string): string {
  return value.trim()
}

function sanitizePhone(value: string): string {
  return value.trim()
}

// Simplified BusinessInfoTab - All content merged into a single simple interface
export function BusinessInfoTab({ profile, onChange, onDirty, disabled = false }: TabComponentProps) {
  // Safety check
  if (!profile) {
    return (
      <div className="p-6 text-center text-zinc-400">
        <p>Loading profile data...</p>
      </div>
    )
  }

  const handleInputChange = (field: keyof Pick<BusinessProfilePayload, 'locationName' | 'shortDescription' | 'phone' | 'website'>, value: string) => {
    if (disabled) return
    onChange({ ...profile, [field]: value })
    onDirty()
  }

  const handleTextArea = (event: ChangeEvent<HTMLTextAreaElement>) => {
    if (disabled) return
    onChange({ ...profile, description: event.target.value })
    onDirty()
  }

  // AI Suggestions
  const aiSuggestions = useMemo(() => {
    const suggestions: Array<{ title: string; description: string; onApply: () => void }> = []
  const amenityFeatures = new Set(profile.features?.amenities ?? [])
    const hasArabicName = /[\u0600-\u06FF]/.test(profile.locationName)
    const description = profile.description.toLowerCase()

    // Critical suggestions

    if (!amenityFeatures.has('wheelchair_accessible')) {
      suggestions.push({
        title: 'Enable wheelchair access attribute',
        description: 'This attribute appears in accessibility filters and improves visibility',
        onApply: () => {
          const nextFeatures = withUpdatedFeatures(profile, 'amenities', (current) => [...current, 'wheelchair_accessible'])
          onChange(nextFeatures)
          onDirty()
          toast.success('Wheelchair access attribute added')
        },
      })
    }

    if (!description.includes('near me') && description.length > 50) {
      suggestions.push({
        title: 'Add "near me" phrasing',
        description: 'Captures high-intent local searches',
        onApply: () => {
          onChange({ ...profile, description: `${profile.description} Find us near me in Dubai.` })
          onDirty()
          toast.success('"Near me" keyword added')
        },
      })
    }

    if (!profile.website && profile.phone) {
      suggestions.push({
        title: 'Add website URL',
        description: 'Websites increase trust and conversions',
        onApply: () => {
          toast.info('Please add your website URL in the Website field above')
        },
      })
    }

    if (profile.additionalCategories.length === 0 && profile.primaryCategory) {
      suggestions.push({
        title: 'Add additional categories',
        description: 'Additional categories improve your search visibility',
        onApply: () => {
          toast.info('Please add additional categories from the Categories section above')
        },
      })
    }

    return suggestions
  }, [profile, onChange, onDirty])

  const applyAllSuggestions = () => {
    if (disabled) {
      toast.error('Profile is locked. Please unlock to apply suggestions.')
      return
    }
    if (aiSuggestions.length === 0) {
      toast.info('No AI suggestions available')
      return
    }
    aiSuggestions.forEach((suggestion) => suggestion.onApply())
    toast.success(`Applied ${aiSuggestions.length} suggestion(s)`)
  }

  // Categories
  const updatePrimaryCategory = (value: string) => {
    if (disabled) return
    onChange({ ...profile, primaryCategory: value })
    onDirty()
    window.dispatchEvent(new Event('dashboard:refresh'))
  }
  
  const addCategory = (category: string) => {
    if (disabled) return
    if (profile.additionalCategories.length >= 9 || profile.additionalCategories.includes(category)) return
    onChange({ ...profile, additionalCategories: [...profile.additionalCategories, category] })
    onDirty()
    window.dispatchEvent(new Event('dashboard:refresh'))
  }
  
  const removeCategory = (category: string) => {
    if (disabled) return
    onChange({ ...profile, additionalCategories: profile.additionalCategories.filter((item) => item !== category) })
    onDirty()
    window.dispatchEvent(new Event('dashboard:refresh'))
  }

  // Links
  const handleLinkChange = (key: keyof typeof profile.specialLinks, value: string) => {
    if (disabled) return
    onChange({
      ...profile,
      specialLinks: {
        ...profile.specialLinks,
      [key]: value ? sanitizeUrl(value) : null,
      },
    })
    onDirty()
    window.dispatchEvent(new Event('dashboard:refresh'))
  }

  // Social Links
  const handleSocialLinkChange = (key: string, value: string) => {
    if (disabled) return
    onChange({
      ...profile,
      socialLinks: {
        ...(profile.socialLinks || {}),
        [key]: value ? sanitizeUrl(value) : null,
      },
    })
    onDirty()
    window.dispatchEvent(new Event('dashboard:refresh'))
  }

  // Removed toggleAttribute - FROM_BUSINESS_OPTIONS removed

  const updateOpeningDate = (value: string) => {
    if (disabled) return
    onChange({ ...profile, openingDate: value || null })
    onDirty()
    window.dispatchEvent(new Event('dashboard:refresh'))
  }

  const updateServiceArea = (checked: boolean) => {
    if (disabled) return
    onChange({ ...profile, serviceAreaEnabled: checked })
    onDirty()
    window.dispatchEvent(new Event('dashboard:refresh'))
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* AI Suggestions */}
      {aiSuggestions.length > 0 && (
        <div className="bg-gradient-to-r from-purple-950/30 to-orange-950/30 border border-purple-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Bot className="w-6 h-6 text-purple-400" />
              <div>
                <h3 className="text-lg font-semibold text-white">AI Suggestions</h3>
                <p className="text-sm text-zinc-400">Smart suggestions to improve your profile</p>
      </div>
            </div>
            <Button
              onClick={applyAllSuggestions}
              disabled={disabled}
              className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply All
            </Button>
          </div>
          <div className="space-y-3">
            {aiSuggestions.map((suggestion, index) => (
              <div
                key={index}
                className="flex items-start justify-between gap-4 p-4 rounded-lg border border-purple-500/20 bg-purple-950/20"
              >
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-white mb-1">{suggestion.title}</h4>
                  <p className="text-xs text-zinc-400">{suggestion.description}</p>
                </div>
                <Button
                  size="sm"
                  onClick={suggestion.onApply}
                  disabled={disabled}
                  className="bg-purple-600/80 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply
                </Button>
              </div>
        ))}
      </div>
        </div>
      )}

      {/* Basic Info */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-orange-400" />
          Basic Information
        </h3>
        <div className="space-y-4">
      <div>
            <label className="block text-sm font-medium text-white mb-2">Business Name</label>
        <input
                  value={profile.locationName || ''}
              onChange={(e) => handleInputChange('locationName', e.target.value)}
              disabled={disabled}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white focus:border-orange-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
                </div>
          <div className="grid gap-4 sm:grid-cols-2">
        <div>
              <label className="block text-sm font-medium text-white mb-2">Phone</label>
          <input
            value={profile.phone || ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
            placeholder="+971 XX XXX XXXX"
                disabled={disabled}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white focus:border-orange-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
        <div>
              <label className="block text-sm font-medium text-white mb-2">Website</label>
          <input
            value={profile.website || ''}
                onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="https://example.com"
                disabled={disabled}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white focus:border-orange-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
          <div>
            <label className="block text-sm font-medium text-white mb-2">Description</label>
                <textarea
                  value={profile.description || ''}
                  onChange={handleTextArea}
              rows={4}
                  maxLength={750}
                  disabled={disabled}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white focus:border-orange-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
            <p className="text-xs text-zinc-500 mt-1">{(profile.description || '').length}/750 characters</p>
              </div>
            </div>
          </div>

      {/* Categories */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Tag className="w-5 h-5 text-orange-400" />
          Categories
        </h3>
        <div className="space-y-4">
      <div>
            <label className="block text-sm font-medium text-white mb-2">Primary Category</label>
        <select
          value={profile.primaryCategory || ''}
              onChange={(e) => updatePrimaryCategory(e.target.value)}
              disabled={disabled}
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:border-orange-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {COMMON_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>
      <div>
            <label className="block text-sm font-medium text-white mb-2">
            Additional Categories ({(profile.additionalCategories || []).length}/9)
          </label>
        {(profile.additionalCategories || []).length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {(profile.additionalCategories || []).map((cat) => (
                  <Badge key={cat} variant="outline" className="border-orange-500/40 text-orange-200">
                    {cat}
                <button
                  type="button"
                      onClick={() => removeCategory(cat)}
                      disabled={disabled}
                      className="ml-2 text-orange-400 hover:text-orange-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                      ×
                </button>
                  </Badge>
            ))}
          </div>
        )}
            <div className="flex flex-wrap gap-2">
              {COMMON_CATEGORIES.filter(
                (cat) => cat !== profile.primaryCategory && !(profile.additionalCategories || []).includes(cat)
              ).slice(0, 6).map((cat) => (
                <Button
                  key={cat}
                  size="sm"
                  variant="outline"
                  onClick={() => addCategory(cat)}
              disabled={(profile.additionalCategories || []).length >= 9 || disabled}
                  className="border-zinc-700 text-zinc-300"
            >
                  + {cat}
                </Button>
          ))}
        </div>
      </div>
          </div>
        </div>

      {/* Action Links */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Link2 className="w-5 h-5 text-orange-400" />
          Action Links
        </h3>
        <div className="space-y-4">
          {[
            { key: 'menu' as const, label: 'Menu URL', placeholder: 'https://yoursite.com/menu' },
            { key: 'booking' as const, label: 'Booking URL', placeholder: 'https://yoursite.com/book' },
            { key: 'order' as const, label: 'Order Online URL', placeholder: 'https://yoursite.com/order' },
            { key: 'appointment' as const, label: 'Appointment URL', placeholder: 'https://yoursite.com/appointment' },
          ].map((link) => (
            <div key={link.key}>
              <label className="block text-sm font-medium text-white mb-2">{link.label}</label>
          <input
            type="url"
                value={(() => {
                  const val = profile.specialLinks?.[link.key];
                  return typeof val === 'string' ? val : '';
                })()}
                onChange={(e) => handleLinkChange(link.key, e.target.value)}
            placeholder={link.placeholder}
                disabled={disabled}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white focus:border-orange-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
        </div>
          ))}
          </div>
        </div>

      {/* Social Media Links */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-orange-400" />
          Social Media
        </h3>
        <p className="text-sm text-zinc-400 mb-4">Connect your social media profiles (from Google My Business attributes)</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { key: 'facebook' as const, label: 'Facebook', placeholder: 'https://facebook.com/yourpage', icon: '📘' },
            { key: 'instagram' as const, label: 'Instagram', placeholder: 'https://instagram.com/yourhandle', icon: '📷' },
            { key: 'twitter' as const, label: 'Twitter', placeholder: 'https://twitter.com/yourhandle', icon: '🐦' },
            { key: 'whatsapp' as const, label: 'WhatsApp', placeholder: 'https://wa.me/971xxxxxxxxx', icon: '💬' },
            { key: 'youtube' as const, label: 'YouTube', placeholder: 'https://youtube.com/@yourchannel', icon: '📹' },
            { key: 'linkedin' as const, label: 'LinkedIn', placeholder: 'https://linkedin.com/company/yourcompany', icon: '💼' },
            { key: 'tiktok' as const, label: 'TikTok', placeholder: 'https://tiktok.com/@yourhandle', icon: '🎵' },
            { key: 'pinterest' as const, label: 'Pinterest', placeholder: 'https://pinterest.com/yourprofile', icon: '📌' },
          ].map((social) => (
            <div key={social.key}>
              <label className="block text-sm font-medium text-white mb-2">
                <span className="mr-2">{social.icon}</span>
                {social.label}
              </label>
              <input
                type="url"
                value={(() => {
                  const val = profile.socialLinks?.[social.key];
                  return typeof val === 'string' ? val : '';
                })()}
                onChange={(e) => handleSocialLinkChange(social.key, e.target.value)}
                placeholder={social.placeholder}
                disabled={disabled}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white focus:border-orange-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          ))}
        </div>
      </div>
      
      {/* Additional Settings */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <List className="w-5 h-5 text-orange-400" />
          Additional Settings
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">Opening Date</label>
            <input
              type="date"
              value={profile.openingDate ?? ''}
              onChange={(e) => updateOpeningDate(e.target.value)}
              disabled={disabled}
              className="w-full md:w-auto px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:border-orange-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Select opening date"
            />
            <p className="text-xs text-zinc-500 mt-1">When did your business first open?</p>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg border border-zinc-800 bg-zinc-950/50">
            <input
              type="checkbox"
              checked={profile.serviceAreaEnabled}
              onChange={(e) => updateServiceArea(e.target.checked)}
              disabled={disabled}
              className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div>
              <span className="text-white font-medium text-sm">Service Area Business</span>
              <p className="text-xs text-zinc-500 mt-1">Enable if you provide services in a geographic area rather than at a fixed location</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Simplified FeaturesTab with Industry-specific Features
export function FeaturesTab({ profile, onChange, onDirty, disabled = false }: TabComponentProps) {
  // Safety check
  if (!profile) {
    return (
      <div className="p-6 text-center text-zinc-400">
        <p>Loading profile data...</p>
      </div>
    )
  }

  // Get features based on business category
  const allFeatures = useMemo(() => {
    return getIndustryFeatures(profile.primaryCategory || 'general');
  }, [profile.primaryCategory]);

  const activeFeatureCount = useMemo(() => {
    return FEATURE_CATEGORY_KEYS.reduce((acc, key) => acc + (profile.features?.[key]?.length ?? 0), 0)
  }, [profile.features])

  const toggleFeature = useCallback(
    (category: FeatureCategoryKey, featureKey: string, enabled: boolean) => {
      if (disabled) return
      const nextProfile = withUpdatedFeatures(profile, category, (current) => {
        const set = new Set(current)
        if (enabled) {
          set.add(featureKey)
        } else {
          set.delete(featureKey)
        }
        return Array.from(set)
      })
      onChange(nextProfile)
      onDirty()
      window.dispatchEvent(new Event('dashboard:refresh'))
      if (__DEV__) {
        console.log('[FeaturesTab] Feature toggled, dashboard refresh triggered')
      }
    },
    [profile, onChange, onDirty, disabled],
  )

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-400" />
            Features & Attributes
          </h3>
          <Badge variant="outline" className="border-orange-500/40 text-orange-200">
            {activeFeatureCount} selected
          </Badge>
          </div>
        <div className="space-y-6">
          {FEATURE_CATEGORY_KEYS.map((category) => {
            const features = allFeatures[category] || []
            const activeFeatures = new Set(profile.features?.[category] ?? [])

            return (
              <div key={category} className="space-y-3">
                <h4 className="text-sm font-medium text-zinc-300 capitalize">{category.replace('_', ' ')}</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {features.map((feature) => {
                    const isActive = activeFeatures.has(feature.key)
                    return (
                      <button
                        key={feature.key}
                        type="button"
                        onClick={() => toggleFeature(category, feature.key, !isActive)}
                        disabled={disabled}
                        className={cn(
                          'flex items-start gap-3 p-3 rounded-lg border-2 transition text-left relative',
                          isActive
                            ? 'border-orange-500 bg-orange-500/10'
                            : 'border-zinc-700 hover:border-zinc-600 bg-zinc-950/50',
                          disabled && 'opacity-50 cursor-not-allowed',
                        )}
                      >
                        {isActive ? (
                          <CheckCircle2 className="w-5 h-5 text-orange-400 flex-shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-zinc-500 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{feature.icon}</span>
                            <span className={cn(
                              "text-sm font-medium",
                              isActive ? "text-white" : "text-zinc-300"
                            )}>
                              {feature.name}
                            </span>
                          </div>
                          <span className="text-xs text-zinc-400 mt-1">{feature.nameAr}</span>
                        </div>
                        {feature.importance === 'critical' && (
                          <Badge variant="destructive" className="text-xs absolute top-1 right-1">
                            Critical
                          </Badge>
                        )}
                      </button>
                    )
                  })}
          </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

