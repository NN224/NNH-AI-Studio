'use client'

import { useMemo, useState, useCallback, type ChangeEvent } from 'react'
import { toast } from 'sonner'
import type { BusinessProfile, BusinessProfilePayload, FeatureCategoryKey, FeatureSelection, SpecialLinks } from '@/types/features'
import { FEATURE_CATALOG } from '@/lib/features/feature-definitions'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const FEATURE_CATEGORY_KEYS: readonly FeatureCategoryKey[] = ['amenities', 'payment_methods', 'services', 'atmosphere']

const DEFAULT_FEATURES: FeatureSelection = {
  amenities: [],
  payment_methods: [],
  services: [],
  atmosphere: [],
}

const COMMON_CATEGORIES: readonly string[] = [
  'Night club',
  'Bar',
  'Live music venue',
  'Dance club',
  'Cocktail bar',
  'Restaurant',
  'Entertainment venue',
  'Event venue',
  'Lounge',
  'Wine bar',
  'Beer garden',
  'Pub',
  'Sports bar',
  'Karaoke bar',
]

const FROM_BUSINESS_OPTIONS: readonly { key: string; label: string; icon: string }[] = [
  { key: 'black_owned', label: 'Black-owned', icon: '✊🏿' },
  { key: 'women_led', label: 'Women-led', icon: '👩' },
  { key: 'lgbtq_friendly', label: 'LGBTQ+ friendly', icon: '🏳️‍🌈' },
  { key: 'veteran_led', label: 'Veteran-led', icon: '🎖️' },
  { key: 'latino_owned', label: 'Latino-owned', icon: '🌎' },
  { key: 'family_owned', label: 'Family-owned', icon: '👨‍👩‍👧‍👦' },
]

interface TabComponentProps {
  readonly profile: BusinessProfilePayload
  readonly onChange: (next: BusinessProfilePayload) => void
  readonly onDirty: () => void
}

function withUpdatedFeatures(
  profile: BusinessProfilePayload,
  category: FeatureCategoryKey,
  updater: (current: readonly string[]) => readonly string[],
): BusinessProfilePayload {
  const nextFeatures: FeatureSelection = {
    ...DEFAULT_FEATURES,
    ...profile.features,
    [category]: updater(profile.features?.[category] ?? []),
  }

  return {
    ...profile,
    features: nextFeatures,
  }
}

function withUpdatedLinks(profile: BusinessProfilePayload, updater: (current: SpecialLinks) => SpecialLinks): BusinessProfilePayload {
  return {
    ...profile,
    specialLinks: updater(profile.specialLinks ?? {}),
  }
}

function sanitizeUrl(value: string): string {
  return value.trim()
}

export function FeaturesTab({ profile, onChange, onDirty }: TabComponentProps) {
  const allFeatures = FEATURE_CATALOG

  const activeFeatureCount = useMemo(() => {
    return FEATURE_CATEGORY_KEYS.reduce((acc, key) => acc + (profile.features?.[key]?.length ?? 0), 0)
  }, [profile.features])

  const totalFeatureCount = useMemo(() => {
    return FEATURE_CATEGORY_KEYS.reduce((acc, key) => acc + (allFeatures[key]?.length ?? 0), 0)
  }, [allFeatures])

  const handleToggle = (category: FeatureCategoryKey, featureKey: string) => {
    const nextProfile = withUpdatedFeatures(profile, category, (current) => {
      const set = new Set(current)
      if (set.has(featureKey)) {
        set.delete(featureKey)
      } else {
        set.add(featureKey)
      }
      return Array.from(set)
    })

    onChange(nextProfile)
    onDirty()
    window.dispatchEvent(new Event('dashboard:refresh'))
    console.log('[FeaturesTab] Feature toggled, dashboard refresh triggered')
  }

  return (
    <div className="space-y-8">
      <div className="text-center py-4">
        <h2 className="text-2xl font-bold text-white mb-2">✨ Features & Attributes</h2>
        <p className="text-zinc-400">Enable features that your business offers to improve discoverability</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-800/50 rounded-xl p-6 text-center">
          <div className="text-3xl font-bold text-white mb-1">{activeFeatureCount}</div>
          <div className="text-sm text-zinc-400">Active Features</div>
        </div>
        <div className="bg-zinc-800/50 rounded-xl p-6 text-center">
          <div className="text-3xl font-bold text-white mb-1">{totalFeatureCount}</div>
          <div className="text-sm text-zinc-400">Total Available</div>
        </div>
        <div className="bg-zinc-800/50 rounded-xl p-6 text-center">
          <div className="text-3xl font-bold text-orange-400 mb-1">{Math.max(totalFeatureCount - activeFeatureCount, 0)}</div>
          <div className="text-sm text-zinc-400">Missing Features</div>
        </div>
      </div>

      {FEATURE_CATEGORY_KEYS.map((category) => {
        const categoryConfig = allFeatures[category] ?? []
        const enabledFeatures = new Set(profile.features?.[category] ?? [])
        const enabledCount = enabledFeatures.size
        const completion = categoryConfig.length > 0 ? Math.round((enabledCount / categoryConfig.length) * 100) : 0

        return (
          <div key={category} className="bg-zinc-800/30 border border-zinc-800 rounded-xl overflow-hidden">
            <FeatureCategorySection
              categoryKey={category}
              name={
                {
                  amenities: 'Basic Amenities',
                  payment_methods: 'Payment Methods',
                  services: 'Services',
                  atmosphere: 'Atmosphere',
                }[category]
              }
              icon={
                {
                  amenities: '🏢',
                  payment_methods: '💳',
                  services: '🛎️',
                  atmosphere: '🎭',
                }[category]
              }
              total={categoryConfig.length}
              completion={completion}
              enabledCount={enabledCount}
            >
              <div className="p-6 pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {categoryConfig.map((feature) => {
                  const isEnabled = enabledFeatures.has(feature.key)

                  return (
                    <label
                      key={feature.id}
                      className={cn(
                        'flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition',
                        isEnabled ? 'border-orange-500 bg-orange-500/10' : 'border-zinc-700 hover:border-zinc-600 bg-zinc-900/50',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => handleToggle(category, feature.key)}
                        className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-orange-600 focus:ring-orange-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{feature.icon}</span>
                          <span className="font-medium text-white text-sm">{feature.name}</span>
                        </div>
                        <div className="text-xs text-zinc-500">{feature.commonPercentage}% have this</div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </FeatureCategorySection>
          </div>
        )
      })}
    </div>
  )
}

interface FeatureCategorySectionProps {
  readonly categoryKey: FeatureCategoryKey
  readonly name: string
  readonly icon: string
  readonly total: number
  readonly enabledCount: number
  readonly completion: number
  readonly children: React.ReactNode
}

function FeatureCategorySection({ categoryKey, name, icon, total, enabledCount, completion, children }: FeatureCategorySectionProps) {
  const [isExpanded, setExpanded] = useState(true)

  return (
    <div>
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between p-6 hover:bg-zinc-800/50 transition"
        aria-expanded={isExpanded}
        aria-controls={`${categoryKey}-features`}
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl" aria-hidden>
            {icon}
          </span>
          <div className="text-left">
            <h3 className="text-lg font-bold text-white">{name}</h3>
            <p className="text-sm text-zinc-400">
              {enabledCount} of {total} enabled
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-zinc-500">{completion}%</div>
          <span className={cn('text-zinc-400 transition-transform', isExpanded ? 'rotate-180' : '')}>▼</span>
        </div>
      </button>

      {isExpanded && (
        <div id={`${categoryKey}-features`} className="border-t border-zinc-800">
          {children}
        </div>
      )}
    </div>
  )
}

export function BusinessInfoTab({ profile, onChange, onDirty }: TabComponentProps) {
  const [activeView, setActiveView] = useState<'basic' | 'attributes' | 'optimizer' | 'insights'>('basic')
  const [previewSundayOpen, setPreviewSundayOpen] = useState(false)

  const completion = Math.round(profile.profileCompleteness ?? 0)
  const breakdown = profile.profileCompletenessBreakdown ?? {
    basicsFilled: true,
    categoriesSet: true,
    featuresAdded: true,
    linksAdded: true,
  }

  const missingChecklist = useMemo(() => {
    return [
      !breakdown.basicsFilled,
      !breakdown.categoriesSet,
      !breakdown.featuresAdded,
      !breakdown.linksAdded,
    ].filter(Boolean).length
  }, [breakdown])

  const amenityFeatures = new Set(profile.features?.amenities ?? [])
  const servicesFeatures = new Set(profile.features?.services ?? [])

  const aiScore = useMemo(() => {
    const featureBoost = (amenityFeatures.size + servicesFeatures.size) * 2
    const linksBoost = Object.values(profile.specialLinks ?? {}).filter(Boolean).length * 3
    return Math.min(100, Math.round(completion + featureBoost + linksBoost))
  }, [amenityFeatures.size, servicesFeatures.size, completion, profile.specialLinks])

  const competitorRank = useMemo(() => {
    if (aiScore >= 95) return '#1'
    if (aiScore >= 90) return '#2'
    if (aiScore >= 80) return '#3'
    return '#4+'
  }, [aiScore])

  const hasArabicName = useMemo(() => /[\u0600-\u06FF]/.test(profile.locationName), [profile.locationName])

  const suggestionName = useMemo(() => {
    if (profile.locationName.toLowerCase().includes('dubai')) {
      return profile.locationName.trim()
    }
    return `${profile.locationName.trim()} - AI Solutions Dubai`
  }, [profile.locationName])

  const enhancedDescription = useMemo(() => {
    const base = profile.description.trim().length > 0 ? profile.description.trim() : 'We help businesses grow with automation and AI-driven marketing.'
    const keywords = ['AI-powered', 'Google Business Profile', 'automation', 'growth']
    const missingKeywords = keywords.filter((keyword) => !base.toLowerCase().includes(keyword.toLowerCase()))
    const sentences: string[] = [base]

    if (missingKeywords.length > 0) {
      sentences.push(`Specialising in ${missingKeywords.slice(0, 2).join(' & ')} for brands in Dubai.`)
    }
    if (!base.toLowerCase().includes('reviews')) {
      sentences.push('We optimise reviews, posts, and questions with one unified AI command center.')
    }

    const full = sentences.join(' ')
    const short = `${profile.locationName} • AI automation & growth in Dubai`
    return { full, short }
  }, [profile.description, profile.locationName])

  const commitProfile = useCallback(
    (next: BusinessProfilePayload, message?: string) => {
      onChange(next)
      onDirty()
      window.dispatchEvent(new Event('dashboard:refresh'))
      if (message) {
        toast.success(message)
      }
    },
    [onChange, onDirty],
  )

  const updateProfile = useCallback(
    (partial: Partial<BusinessProfilePayload>, message?: string) => {
      const next: BusinessProfilePayload = {
        ...profile,
        ...partial,
      }
      commitProfile(next, message)
    },
    [commitProfile, profile],
  )

  const handleTextArea = (event: ChangeEvent<HTMLTextAreaElement>) => {
    updateProfile({ description: event.target.value }, undefined)
  }

  const handleInputChange = (field: keyof Pick<BusinessProfilePayload, 'locationName' | 'shortDescription' | 'phone' | 'website'>, value: string) => {
    updateProfile({ [field]: value } as Partial<BusinessProfilePayload>)
  }

  const toggleFeature = useCallback(
    (category: FeatureCategoryKey, featureKey: string, enabled: boolean) => {
      const nextProfile = withUpdatedFeatures(profile, category, (current) => {
        const set = new Set(current)
        if (enabled) {
          set.add(featureKey)
        } else {
          set.delete(featureKey)
        }
        return Array.from(set)
      })
      commitProfile(nextProfile, enabled ? 'Attribute added' : 'Attribute removed')
    },
    [profile, commitProfile],
  )

  type Suggestion = {
    readonly title: string
    readonly description: string
    readonly cta?: string
    readonly onApply?: () => void
    readonly disabled?: boolean
  }

  const criticalSuggestions = useMemo<Suggestion[]>(() => {
    const suggestions: Suggestion[] = []

    if (!hasArabicName) {
      suggestions.push({
        title: 'Add Arabic business name',
        description: 'Boost trust with bilingual audiences searching locally.',
        cta: 'Apply Arabic name',
        onApply: () => {
          const arabicName = `${profile.locationName.trim()} | استوديو الذكاء الاصطناعي NNH`
          updateProfile({ locationName: arabicName }, 'Added Arabic business name')
        },
      })
    }

    if (!(profile.shortDescription || '').toLowerCase().includes('price')) {
      suggestions.push({
        title: 'Add price range',
        description: 'Shoppers are 42% more likely to engage when price context exists.',
        cta: 'Set price range',
        onApply: () => {
          const next = `${profile.shortDescription}`.includes('•')
            ? `${profile.shortDescription} • Price range: $$`
            : `${profile.shortDescription || profile.locationName} • Price range: $$`
          updateProfile({ shortDescription: next }, 'Price range added to short description')
        },
      })
    }

    if (!amenityFeatures.has('wheelchair_accessible')) {
      suggestions.push({
        title: 'Enable wheelchair access attribute',
        description: 'This attribute appears in accessibility filters and improves visibility.',
        cta: 'Add Wheelchair',
        onApply: () => toggleFeature('amenities', 'wheelchair_accessible', true),
      })
    }

    return suggestions
  }, [amenityFeatures, hasArabicName, profile.locationName, profile.shortDescription, toggleFeature, updateProfile])

  const seoSuggestions = useMemo<Suggestion[]>(() => {
    const suggestions: Suggestion[] = []

    if (!profile.locationName.toLowerCase().includes('ai')) {
      suggestions.push({
        title: 'Insert "AI" in title 3x',
        description: 'Exact-match keywords outperform generalised names for AI services.',
        cta: 'Add AI keywords',
        onApply: () => {
          const nextName = suggestionName.includes('AI') ? suggestionName : `${suggestionName} | AI Agency`
          updateProfile({ locationName: nextName }, 'AI keywords added to name')
        },
      })
    }

    if (!profile.description.toLowerCase().includes('near me')) {
      suggestions.push({
        title: 'Add "near me" phrasing',
        description: 'Captures high-intent local searches ("AI agency near me").',
        cta: 'Inject near me',
        onApply: () => {
          updateProfile({ description: `${enhancedDescription.full} We are the go-to AI studio near me in Dubai.` }, 'Added near me keyword')
        },
      })
    }

    if (!profile.description.toLowerCase().includes('testimonial')) {
      suggestions.push({
        title: 'Reference testimonials',
        description: 'Mention social proof to improve conversion odds.',
        cta: 'Add testimonial note',
        onApply: () => {
          updateProfile(
            {
              description: `${enhancedDescription.full} "Clients rate us 4.9★ for automation results."`,
            },
            'Testimonial snippet added',
          )
        },
      })
    }

    return suggestions
  }, [enhancedDescription.full, profile.description, profile.locationName, suggestionName, updateProfile])

  const applyAllAi = () => {
    const actions = [...criticalSuggestions, ...seoSuggestions].filter((item) => Boolean(item.onApply))
    if (actions.length === 0) {
      toast.info('No pending AI suggestions to apply')
      return
    }
    actions.forEach((item) => item.onApply?.())
    toast.success('AI suggestions applied')
  }

  const competitorIntel = useMemo(() => {
    return [
      { label: '24/7 Support', available: servicesFeatures.has('delivery') },
      { label: 'WhatsApp', available: Boolean(profile.specialLinks?.appointment) },
      { label: 'Live Chat', available: false },
      { label: 'Instagram link', available: Boolean(profile.specialLinks?.booking) },
      { label: 'YouTube videos', available: Boolean(profile.specialLinks?.menu) },
    ]
  }, [profile.specialLinks, servicesFeatures])

  const predicts = useMemo(() => {
    const visibility = Math.min(100, completion + 45)
    const reviewsPerMonth = Math.round((completion / 100) * 24 + criticalSuggestions.length * 2)
    const directions = Math.round((aiScore / 100) * 180)
    return {
      visibility,
      reviewsPerMonth,
      directions,
    }
  }, [aiScore, completion, criticalSuggestions.length])

  const infoCardClass = (key: 'basic' | 'attributes' | 'optimizer' | 'insights') =>
    cn(
      'rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 shadow-lg shadow-black/30 transition',
      activeView === key ? 'border-orange-500/50 bg-orange-500/5' : 'hover:border-orange-500/30 hover:bg-zinc-900/60',
    )

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Profile" subtitle="Complete" value={`${completion}%`} accent="bg-emerald-500/15 text-emerald-200" />
        <MetricCard title="AI Score" subtitle="Optimized" value={`${aiScore}/100`} accent="bg-orange-500/15 text-orange-200" />
        <MetricCard title="Missing" subtitle="Items to fix" value={`${missingChecklist}`} accent="bg-red-500/15 text-red-200" />
        <MetricCard title="Compet." subtitle="Rank" value={competitorRank} accent="bg-sky-500/15 text-sky-200" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {(
          [
            { key: 'basic', label: '📝 Basic' },
            { key: 'attributes', label: '🏷️ Attributes' },
            { key: 'optimizer', label: '🤖 AI Optimizer' },
            { key: 'insights', label: '🔬 Insights' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveView(tab.key)}
            className={cn(
              'rounded-full border px-4 py-2 text-sm font-medium transition',
              activeView === tab.key
                ? 'border-orange-500 bg-orange-500/20 text-orange-100 shadow-[0_0_15px_rgba(251,146,60,0.35)]'
                : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-orange-500/40 hover:text-orange-200',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className={infoCardClass('basic')}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">🏢 Basic details</h3>
                <p className="text-xs text-zinc-400">Edit your core listing information</p>
              </div>
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-200">
                AI Score +8 when completed
              </Badge>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs uppercase tracking-wide text-zinc-500">Business name</label>
                <input
                  value={profile.locationName}
                  onChange={(event) => handleInputChange('locationName', event.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white focus:border-orange-500 focus:outline-none"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-orange-200/90">
                  <span>⚠️ AI: Add keywords "NNH AI Studio - IT Solutions Dubai"</span>
                  <Button size="sm" onClick={() => updateProfile({ locationName: suggestionName }, 'Business name optimized')}>
                    Apply ✓
                  </Button>
                  <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300" onClick={() => toast.info('Name suggestion skipped')}>
                    Skip ✗
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs uppercase tracking-wide text-zinc-500">Phone number</label>
                  <input
                    value={profile.phone}
                    onChange={(event) => handleInputChange('phone', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white focus:border-orange-500 focus:outline-none"
                    placeholder="+971 XX XXX XXXX"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-zinc-500">Website</label>
                  <input
                    value={profile.website}
                    onChange={(event) => handleInputChange('website', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white focus:border-orange-500 focus:outline-none"
                    placeholder="https://example.com"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={infoCardClass('basic')}>
            <h3 className="text-lg font-semibold text-white">📝 Description</h3>
            <p className="text-xs text-zinc-400">Tell customers what makes you unique</p>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-wide text-zinc-500">Current</div>
                <textarea
                  value={profile.description}
                  onChange={handleTextArea}
                  rows={6}
                  maxLength={750}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white focus:border-orange-500 focus:outline-none"
                />
                <p className="text-xs text-zinc-500">{profile.description.length}/750 characters</p>
              </div>
              <div className="space-y-3 rounded-lg border border-orange-500/40 bg-orange-500/10 p-4 text-sm text-orange-50">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">💡 AI Enhanced</span>
                  <Button size="sm" className="bg-white/20 text-white hover:bg-white/30" onClick={() => updateProfile({ description: enhancedDescription.full, shortDescription: enhancedDescription.short }, 'AI description applied')}>
                    Use This Version
                  </Button>
                </div>
                <p className="leading-relaxed text-orange-100/90">{enhancedDescription.full}</p>
                <div className="rounded-md border border-orange-500/30 bg-orange-500/10 p-2 text-xs text-orange-100/80">
                  Short preview: {enhancedDescription.short}
                </div>
              </div>
            </div>
          </div>

          <div className={infoCardClass('insights')}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">⏰ Business hours</h3>
              <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-500/30">Great response rate</Badge>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-zinc-200">
              <div className="space-y-1">
                <Row label="Mon - Fri" value="09:00 - 18:00" />
                <Row label="Saturday" value="10:00 - 16:00" />
                <Row label="Sunday" value={previewSundayOpen ? '09:00 - 14:00 (preview)' : 'Closed'} accent={previewSundayOpen ? 'text-orange-200' : undefined} />
              </div>
              <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-3 text-xs text-zinc-400">
                <p className="flex items-center gap-2 text-orange-200">
                  🤖 AI insight
                </p>
                <p className="mt-2">Opening on Sundays can unlock +23% more direction requests.</p>
                <Button
                  size="sm"
                  className="mt-3 w-full bg-orange-500 text-white hover:bg-orange-600"
                  onClick={() => {
                    setPreviewSundayOpen((prev) => !prev)
                    toast.success(previewSundayOpen ? 'Sunday hours reverted' : 'Sunday preview activated')
                  }}
                >
                  {previewSundayOpen ? 'Revert change' : 'Test this change'}
                </Button>
              </div>
            </div>
          </div>

          <div className={infoCardClass('attributes')}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">🏷️ Attributes</h3>
              <Badge variant="outline" className="border-orange-500/40 text-orange-200">
                Appear in 2.5x more searches when complete
              </Badge>
            </div>
            <div className="mt-4 grid gap-3">
              {[
                { label: 'WiFi', key: 'wifi_free', enabled: amenityFeatures.has('wifi_free') },
                { label: 'Parking', key: 'parking', enabled: amenityFeatures.has('parking') },
                { label: 'Wheelchair', key: 'wheelchair_accessible', enabled: amenityFeatures.has('wheelchair_accessible') },
              ].map((attribute) => (
                <div key={attribute.key} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">
                      {attribute.enabled ? '✅' : '⬜'} {attribute.label}
                    </span>
                    {attribute.key === 'wheelchair_accessible' ? (
                      <span className="text-xs text-orange-200/90">AI: Add Wheelchair = appear in 2.5x more searches</span>
                    ) : null}
                  </div>
                  <Button
                    size="sm"
                    variant={attribute.enabled ? 'outline' : 'default'}
                    className={attribute.enabled ? 'border-zinc-700 text-zinc-300' : 'bg-orange-500 text-white hover:bg-orange-600'}
                    onClick={() => toggleFeature('amenities', attribute.key, !attribute.enabled)}
                  >
                    {attribute.enabled ? 'Remove' : 'Enable'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className={infoCardClass('optimizer')}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">🧠 AI Optimizer</h3>
              <Badge className="bg-lime-500/20 text-lime-100 border-lime-500/40">Auto insights</Badge>
            </div>
            <div className="mt-4 space-y-5">
              <SuggestionGroup title="🔴 Critical" badge={`${criticalSuggestions.length}`} suggestions={criticalSuggestions} />
              <SuggestionGroup title="🟡 Boost SEO" badge={`${seoSuggestions.length}`} suggestions={seoSuggestions} />
              <Button className="w-full bg-orange-500 text-white hover:bg-orange-600" onClick={applyAllAi}>
                🚀 Apply all AI
              </Button>
            </div>
          </div>

          <div className={infoCardClass('insights')}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">🏆 Competitor intel</h3>
              <Badge variant="outline" className="border-sky-500/40 text-sky-200">
                Rank {competitorRank}
              </Badge>
            </div>
            <div className="mt-4 space-y-2 text-sm text-zinc-200">
              <p>Your competitors have:</p>
              <ul className="list-disc list-inside text-zinc-300">
                {competitorIntel.map((item) => (
                  <li key={item.label}>{item.label}: {item.available ? '✅' : '⬜'}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className={infoCardClass('insights')}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">🔮 Predictions</h3>
              <Badge variant="outline" className="border-purple-500/40 text-purple-200">
                AI-powered
              </Badge>
            </div>
            <div className="mt-4 space-y-2 text-sm text-zinc-200">
              <p>Based on your profile:</p>
              <ul className="list-disc list-inside text-zinc-300">
                <li>Visibility: {predicts.visibility}%</li>
                <li>Reviews per month: {predicts.reviewsPerMonth}</li>
                <li>Direction requests: {predicts.directions}°</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-orange-500/40 bg-orange-500/10 p-6">
          <h3 className="text-lg font-semibold text-white">🔥 AI Automation</h3>
          <p className="text-xs text-orange-100/80">Automations currently running</p>
          <ul className="mt-4 space-y-2 text-sm text-orange-50/90">
            <li>✓ Auto-update keywords</li>
            <li>✓ A/B test description</li>
            <li>✓ Seasonal adjustments</li>
            <li>✓ Monitor competitors</li>
          </ul>
          <Button
            className="mt-4 bg-white/20 text-white hover:bg-white/30"
            variant="ghost"
            onClick={() => toast.info('AI activity log coming soon')}
          >
            View AI Activity Log
          </Button>
        </div>
        <div className="rounded-xl border border-sky-500/40 bg-sky-500/10 p-6">
          <h3 className="text-lg font-semibold text-white">📊 Performance impact</h3>
          <p className="text-xs text-sky-100/80">Result of recent changes</p>
          <div className="mt-4 space-y-3 text-sm text-sky-50/90">
            <div className="flex items-center justify-between">
              <span>Changes applied</span>
              <span className="font-semibold">↑32% views this week</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Best day</span>
              <span className="font-semibold">Sunday (+45% clicks)</span>
            </div>
            <div className="flex items-center justify-between">
              <span>AI time saved</span>
              <span className="font-semibold">4 hours this month</span>
            </div>
          </div>
          <Button
            className="mt-4 bg-white/20 text-white hover:bg-white/30"
            variant="ghost"
            onClick={() => toast.info('Performance report coming soon')}
          >
            View Detailed Report
          </Button>
        </div>
      </div>
    </div>
  )
}

interface MetricCardProps {
  readonly title: string
  readonly subtitle: string
  readonly value: string
  readonly accent: string
}

function MetricCard({ title, subtitle, value, accent }: MetricCardProps) {
  return (
    <div className="bg-zinc-800/50 rounded-xl p-6 text-center">
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-zinc-400">{subtitle}</div>
      <div className="mt-4">
        <Badge variant="outline" className={cn('border-transparent', accent)}>
          {title}
        </Badge>
      </div>
    </div>
  )
}

interface RowProps {
  readonly label: string
  readonly value: string
  readonly accent?: string
}

function Row({ label, value, accent }: RowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className={cn('text-sm font-medium', accent)}>{value}</span>
    </div>
  )
}

interface SuggestionGroupProps {
  readonly title: string
  readonly badge: string
  readonly suggestions: Suggestion[]
}

function SuggestionGroup({ title, badge, suggestions }: SuggestionGroupProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-white">{title}</h4>
        <Badge variant="outline" className="border-zinc-700 text-zinc-300">
          {badge}
        </Badge>
      </div>
      <div className="space-y-2">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.title}
            className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800 bg-zinc-900/50"
          >
            <div className="flex-1">
              <h5 className="text-sm font-medium text-white">{suggestion.title}</h5>
              <p className="text-xs text-zinc-400">{suggestion.description}</p>
            </div>
            {suggestion.cta && (
              <Button
                size="sm"
                variant="outline"
                className="border-zinc-700 text-zinc-300"
                onClick={suggestion.onApply}
                disabled={suggestion.disabled}
              >
                {suggestion.cta}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function CategoriesTab({ profile, onChange, onDirty }: TabComponentProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const addCategory = (category: string) => {
    if (profile.additionalCategories.length >= 9 || profile.additionalCategories.includes(category)) {
      return
    }

    const next: BusinessProfilePayload = {
      ...profile,
      additionalCategories: [...profile.additionalCategories, category],
    }

    onChange(next)
    onDirty()
    window.dispatchEvent(new Event('dashboard:refresh'))
    console.log('[CategoriesTab] Category added, dashboard refresh triggered')
  }

  const removeCategory = (category: string) => {
    const next: BusinessProfilePayload = {
      ...profile,
      additionalCategories: profile.additionalCategories.filter((item) => item !== category),
    }

    onChange(next)
    onDirty()
    window.dispatchEvent(new Event('dashboard:refresh'))
    console.log('[CategoriesTab] Category removed, dashboard refresh triggered')
  }

  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return COMMON_CATEGORIES.filter(
      (category) =>
        category.toLowerCase().includes(query) &&
        category !== profile.primaryCategory &&
        !profile.additionalCategories.includes(category),
    )
  }, [searchQuery, profile.primaryCategory, profile.additionalCategories])

  const updatePrimaryCategory = (value: string) => {
    const next: BusinessProfilePayload = {
      ...profile,
      primaryCategory: value,
    }
    onChange(next)
    onDirty()
    window.dispatchEvent(new Event('dashboard:refresh'))
    console.log('[CategoriesTab] Primary category updated, dashboard refresh triggered')
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="text-center py-4">
        <h2 className="text-2xl font-bold text-white mb-2">🏷️ Business Categories</h2>
        <p className="text-zinc-400">Help customers find your business by selecting relevant categories</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">Primary Category *</label>
        <select
          value={profile.primaryCategory}
          onChange={(event) => updatePrimaryCategory(event.target.value)}
          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-orange-500 focus:outline-none"
        >
          {COMMON_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <p className="text-xs text-zinc-500 mt-1">Your main business category - choose the most relevant one</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-white">
            Additional Categories ({profile.additionalCategories.length}/9)
          </label>
        </div>

        {profile.additionalCategories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {profile.additionalCategories.map((category) => (
              <div key={category} className="flex items-center gap-2 px-3 py-2 bg-orange-500/20 border border-orange-500/30 rounded-lg">
                <span className="text-sm text-white">{category}</span>
                <button
                  type="button"
                  onClick={() => removeCategory(category)}
                  className="text-orange-400 hover:text-orange-300"
                  aria-label={`Remove ${category}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search categories..."
          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none mb-3"
        />

        <div className="max-h-64 overflow-y-auto space-y-2 bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
          {filteredCategories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => addCategory(category)}
              disabled={profile.additionalCategories.length >= 9}
              className="w-full text-left px-3 py-2 hover:bg-zinc-800 rounded text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              + {category}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-purple-950/20 border border-purple-500/30 rounded-xl p-4">
        <div className="flex gap-3">
          <span className="text-2xl" aria-hidden>
            💡
          </span>
          <div>
            <div className="font-medium text-purple-400 mb-1">Category Tips</div>
            <ul className="text-sm text-purple-300/80 space-y-1">
              <li>• Choose categories that accurately describe your business</li>
              <li>• More categories = better discovery in relevant searches</li>
              <li>• Your primary category has the most impact on search</li>
              <li>• You can add up to 9 additional categories</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export function LinksTab({ profile, onChange, onDirty }: TabComponentProps) {
  const handleChange = (key: keyof SpecialLinks, value: string) => {
    const next = withUpdatedLinks(profile, (current) => ({
      ...current,
      [key]: value ? sanitizeUrl(value) : null,
    }))

    onChange(next)
    onDirty()
    window.dispatchEvent(new Event('dashboard:refresh'))
    console.log('[LinksTab] Link updated, dashboard refresh triggered')
  }

  const links: readonly { key: keyof SpecialLinks; label: string; icon: string; placeholder: string; description: string }[] = [
    {
      key: 'menu',
      label: 'Menu URL',
      icon: '🍽️',
      placeholder: 'https://yoursite.com/menu',
      description: 'Link to your menu (for restaurants)',
    },
    {
      key: 'booking',
      label: 'Booking/Reservation URL',
      icon: '📅',
      placeholder: 'https://yoursite.com/book',
      description: 'Direct link for customers to make reservations',
    },
    {
      key: 'order',
      label: 'Order Online URL',
      icon: '🛒',
      placeholder: 'https://yoursite.com/order',
      description: 'Link to online ordering system',
    },
    {
      key: 'appointment',
      label: 'Appointment URL',
      icon: '🗓️',
      placeholder: 'https://yoursite.com/appointment',
      description: 'Link for booking appointments',
    },
  ]

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="text-center py-4">
        <h2 className="text-2xl font-bold text-white mb-2">🔗 Special Links</h2>
        <p className="text-zinc-400">Add direct action links to improve customer experience</p>
      </div>

      {links.map((link) => {
        const value = profile.specialLinks?.[link.key] ?? ''

        return (
          <div key={link.key} className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl" aria-hidden>
                {link.icon}
              </span>
              <div>
                <label className="block text-sm font-medium text-white">{link.label}</label>
                <p className="text-xs text-zinc-500">{link.description}</p>
              </div>
            </div>

            <input
              type="url"
              value={value ?? ''}
              onChange={(event) => handleChange(link.key, event.target.value)}
              placeholder={link.placeholder}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none"
            />

            {value && (
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-2 text-sm text-orange-400 hover:text-orange-300"
              >
                Test Link →
              </a>
            )}
          </div>
        )
      })}

      <div className="bg-green-950/20 border border-green-500/30 rounded-xl p-4">
        <div className="flex gap-3">
          <span className="text-2xl" aria-hidden>
            ✅
          </span>
          <div>
            <div className="font-medium text-green-400 mb-1">Why Add These Links?</div>
            <ul className="text-sm text-green-300/80 space-y-1">
              <li>• Makes it easy for customers to take action directly from Google</li>
              <li>• Increases conversion rates and bookings</li>
              <li>• Shows up as buttons on your Google Business Profile</li>
              <li>• Improves user experience and reduces friction</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export function MoreTab({ profile, onChange, onDirty }: TabComponentProps) {
  const toggleAttribute = (key: string) => {
    const set = new Set(profile.fromTheBusiness)
    if (set.has(key)) {
      set.delete(key)
    } else {
      set.add(key)
    }

    const next: BusinessProfilePayload = {
      ...profile,
      fromTheBusiness: Array.from(set),
    }

    onChange(next)
    onDirty()
    window.dispatchEvent(new Event('dashboard:refresh'))
    console.log('[MoreTab] Attribute toggled, dashboard refresh triggered')
  }

  const updateOpeningDate = (value: string) => {
    const next: BusinessProfilePayload = {
      ...profile,
      openingDate: value || null,
    }

    onChange(next)
    onDirty()
    window.dispatchEvent(new Event('dashboard:refresh'))
    console.log('[MoreTab] Opening date updated, dashboard refresh triggered')
  }

  const updateServiceArea = (checked: boolean) => {
    const next: BusinessProfilePayload = {
      ...profile,
      serviceAreaEnabled: checked,
    }

    onChange(next)
    onDirty()
    window.dispatchEvent(new Event('dashboard:refresh'))
    console.log('[MoreTab] Service area toggled, dashboard refresh triggered')
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="text-center py-4">
        <h2 className="text-2xl font-bold text-white mb-2">📋 More Attributes</h2>
        <p className="text-zinc-400">Additional business information and settings</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-3">From the Business</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {FROM_BUSINESS_OPTIONS.map((option) => {
            const isChecked = profile.fromTheBusiness.includes(option.key)

            return (
              <label
                key={option.key}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition',
                  isChecked ? 'border-orange-500 bg-orange-500/10' : 'border-zinc-700 hover:border-zinc-600 bg-zinc-900/50',
                )}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleAttribute(option.key)}
                  className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-xl" aria-hidden>
                  {option.icon}
                </span>
                <span className="text-white font-medium">{option.label}</span>
              </label>
            )
          })}
        </div>
        <p className="text-xs text-zinc-500 mt-2">These attributes help customers find businesses that align with their values</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">Opening Date</label>
        <input
          type="date"
          value={profile.openingDate ?? ''}
          onChange={(event) => updateOpeningDate(event.target.value)}
          className="w-full md:w-auto px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-orange-500 focus:outline-none"
        />
        <p className="text-xs text-zinc-500 mt-1">When did your business first open?</p>
      </div>

      <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={profile.serviceAreaEnabled}
            onChange={(event) => updateServiceArea(event.target.checked)}
            className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-orange-600 focus:ring-orange-500"
          />
          <div>
            <span className="text-white font-medium">Show service area on map</span>
            <p className="text-xs text-zinc-500 mt-1">Display the geographic area where you provide services</p>
          </div>
        </label>
      </div>

      <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-4">
        <div className="flex gap-3">
          <span className="text-2xl" aria-hidden>
            ℹ️
          </span>
          <div>
            <div className="font-medium text-white mb-1">About These Settings</div>
            <p className="text-sm text-zinc-400">
              These attributes provide additional context about your business and help customers make informed decisions. They appear on your Google Business Profile and can improve your visibility in relevant searches.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

