export type FeatureCategoryKey = 'amenities' | 'payment_methods' | 'services' | 'atmosphere'

export type FeatureSelection = Record<FeatureCategoryKey, readonly string[]>

export interface SpecialLinks {
  readonly menu?: string | null
  readonly booking?: string | null
  readonly order?: string | null
  readonly appointment?: string | null
}

export interface SocialLinks {
  readonly facebook?: string | null
  readonly instagram?: string | null
  readonly twitter?: string | null
  readonly whatsapp?: string | null
  readonly youtube?: string | null
  readonly linkedin?: string | null
  readonly tiktok?: string | null
  readonly pinterest?: string | null
}

export interface BusinessProfile {
  readonly id: string
  readonly locationResourceId: string | null
  readonly locationName: string
  readonly description: string
  readonly shortDescription: string
  readonly phone: string
  readonly website: string
  readonly primaryCategory: string
  readonly additionalCategories: readonly string[]
  readonly features: FeatureSelection
  readonly specialLinks: SpecialLinks
  readonly socialLinks: SocialLinks
  readonly fromTheBusiness: readonly string[]
  readonly openingDate: string | null
  readonly serviceAreaEnabled: boolean
  readonly profileCompleteness: number
}

export interface BusinessProfilePayload extends BusinessProfile {
  readonly regularHours?: Record<string, unknown>
  readonly moreHours?: Record<string, unknown>
  readonly serviceItems?: unknown[]
  readonly profileCompletenessBreakdown?: {
    readonly basicsFilled: boolean
    readonly categoriesSet: boolean
    readonly featuresAdded: boolean
    readonly linksAdded: boolean
  }
}
