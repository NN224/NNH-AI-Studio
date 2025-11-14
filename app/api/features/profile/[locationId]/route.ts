import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { BusinessProfile, BusinessProfilePayload, FeatureCategoryKey, FeatureSelection, SpecialLinks } from '@/types/features'
import { FEATURE_CATALOG, ALL_FEATURE_KEYS } from '@/lib/features/feature-definitions'

const FEATURE_CATEGORY_KEYS: readonly FeatureCategoryKey[] = ['amenities', 'payment_methods', 'services', 'atmosphere']

function parseRecord(value: unknown): Record<string, any> {
  if (!value) return {}
  if (typeof value === 'object') return { ...(value as Record<string, any>) }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, any>
      }
    } catch (error) {
      console.warn('[features/profile] Failed to parse string metadata', error)
    }
  }
  return {}
}

function ensureStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item : String(item ?? '')).trim())
      .filter((item) => item.length > 0)
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
  }

  return []
}

function normalizeBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 'yes', 'y'].includes(normalized)) return true
    if (['false', '0', 'no', 'n'].includes(normalized)) return false
  }
  return fallback
}

function normalizeFeatureSelection(raw: Record<string, any>): FeatureSelection {
  const selection: FeatureSelection = {
    amenities: [],
    payment_methods: [],
    services: [],
    atmosphere: [],
  }

  FEATURE_CATEGORY_KEYS.forEach((category) => {
    const rawValue = raw?.[category]
    const values = ensureStringArray(rawValue).filter((key) => ALL_FEATURE_KEYS.has(key))
    selection[category] = Array.from(new Set(values))
  })

  // Fall back to attribute arrays if provided as flat list
  if (selection.amenities.length === 0 && Array.isArray(raw?.attributes)) {
    const attributes = ensureStringArray(raw.attributes)
    const index = new Map<string, FeatureCategoryKey>()
    FEATURE_CATEGORY_KEYS.forEach((category) => {
      FEATURE_CATALOG[category].forEach((definition) => {
        index.set(definition.key, category)
      })
    })

    attributes.forEach((attribute) => {
      const category = index.get(attribute)
      if (!category) return
      selection[category] = Array.from(new Set([...selection[category], attribute]))
    })
  }

  return selection
}

function sanitizeWebsite(value: string): string {
  return value.trim()
}

function sanitizePhone(value: string): string {
  return value.trim()
}

function computeCompleteness(profile: BusinessProfile) {
  const basicsFilled = Boolean(
    profile.locationName.trim() &&
      profile.description.trim() &&
      profile.phone.trim() &&
      profile.website.trim(),
  )
  const categoriesSet = Boolean(profile.primaryCategory.trim()) && profile.additionalCategories.length > 0
  const featuresAdded = FEATURE_CATEGORY_KEYS.some((category) => profile.features[category]?.length)
  const linksAdded = Object.values(profile.specialLinks).some((link) => Boolean(link))

  const breakdown = {
    basicsFilled,
    categoriesSet,
    featuresAdded,
    linksAdded,
  }

  const totalChecks = Object.values(breakdown).length
  const completed = Object.values(breakdown).filter(Boolean).length
  const score = Math.round((completed / totalChecks) * 100)

  return { score, breakdown }
}

function buildSpecialLinks(raw: Record<string, any>, row: Record<string, any>): SpecialLinks {
  const linksMetadata = parseRecord(raw.specialLinks ?? raw.links)

  return {
    menu: linksMetadata.menu ?? raw.menu_url ?? row.menu_url ?? null,
    booking: linksMetadata.booking ?? raw.booking_url ?? row.booking_url ?? null,
    order: linksMetadata.order ?? raw.order_url ?? row.order_url ?? null,
    appointment: linksMetadata.appointment ?? raw.appointment_url ?? row.appointment_url ?? null,
  }
}

function normalizeBusinessProfile(row: Record<string, any>): BusinessProfilePayload {
  const metadata = parseRecord(row.metadata)
  const profileMetadata = parseRecord(metadata.profile)

  const baseProfile: BusinessProfile = {
    id: String(row.id ?? row.location_id ?? ''),
    locationResourceId: typeof row.location_id === 'string' ? row.location_id : metadata.location_id ?? null,
    locationName:
      row.location_name ??
      profileMetadata.locationName ??
      metadata.name ??
      profileMetadata.title ??
      'Unnamed location',
    description:
      row.description ??
      profileMetadata.description ??
      metadata.description ??
      '',
    shortDescription:
      row.short_description ??
      profileMetadata.shortDescription ??
      profileMetadata.merchantDescription ??
      metadata.shortDescription ??
      '',
    phone: sanitizePhone(row.phone ?? metadata.phone ?? profileMetadata.phone ?? ''),
    website: sanitizeWebsite(row.website ?? metadata.website ?? metadata.websiteUri ?? ''),
    primaryCategory:
      row.category ??
      metadata.primary_category ??
      metadata.primaryCategory ??
      metadata.categories?.primary ??
      '',
    additionalCategories: ensureStringArray(
      row.additional_categories ?? metadata.additional_categories ?? metadata.additionalCategories,
    ),
    features: normalizeFeatureSelection(metadata.features ?? metadata.attributes ?? {}),
    specialLinks: buildSpecialLinks(metadata, row),
    fromTheBusiness: ensureStringArray(row.from_the_business ?? metadata.from_the_business ?? metadata.fromBusiness),
    openingDate: row.opening_date ?? metadata.opening_date ?? null,
    serviceAreaEnabled: normalizeBoolean(row.service_area_enabled ?? metadata.service_area_enabled, false),
    profileCompleteness: Number(row.profile_completeness ?? metadata.profileCompleteness ?? 0) || 0,
  }

  const completeness = computeCompleteness(baseProfile)

  return {
    ...baseProfile,
    profileCompleteness: completeness.score,
    profileCompletenessBreakdown: completeness.breakdown,
  }
}

function mergeMetadata(
  original: Record<string, any>,
  profile: BusinessProfilePayload,
  completeness: { score: number; breakdown: Record<string, boolean> },
): Record<string, any> {
  const current = parseRecord(original)
  return {
    ...current,
    profile: {
      ...parseRecord(current.profile),
      description: profile.description,
      shortDescription: profile.shortDescription,
    },
    features: profile.features,
    specialLinks: profile.specialLinks,
    primaryCategory: profile.primaryCategory,
    additionalCategories: profile.additionalCategories,
    from_the_business: profile.fromTheBusiness,
    service_area_enabled: profile.serviceAreaEnabled,
    opening_date: profile.openingDate,
    profileCompleteness: completeness.score,
    profileCompletenessBreakdown: completeness.breakdown,
  }
}

async function getAuthorizedLocation(
  supabase: any,
  userId: string,
  locationId: string,
): Promise<Record<string, any>> {
  const { data, error } = await supabase
    .from('gmb_locations')
    .select('*')
    .eq('id', locationId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message || 'Failed to query location')
  }

  if (!data) {
    throw new Error('Location not found')
  }

  return data
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { locationId: string } },
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { locationId } = params
    if (!locationId) {
      return NextResponse.json({ error: 'Location ID required' }, { status: 400 })
    }

    const row = await getAuthorizedLocation(supabase, user.id, locationId)
    const profile = normalizeBusinessProfile(row)

    return NextResponse.json(profile)
  } catch (error: unknown) {
    const isError = error instanceof Error
    const message = isError ? error.message : 'Internal server error'
    const status = message === 'Location not found' ? 404 : 500
    console.error('[GET /api/features/profile/:locationId] Error', { message, status, error })
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { locationId: string } },
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { locationId } = params
    if (!locationId) {
      return NextResponse.json({ error: 'Location ID required' }, { status: 400 })
    }

    let payload: BusinessProfilePayload
    try {
      payload = await request.json()
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    const currentRow = await getAuthorizedLocation(supabase, user.id, locationId)

    const normalizedFeatureSelection: FeatureSelection = {
      amenities: Array.from(new Set(payload.features.amenities ?? []))
        .map((item) => item.trim())
        .filter((item) => ALL_FEATURE_KEYS.has(item)),
      payment_methods: Array.from(new Set(payload.features.payment_methods ?? []))
        .map((item) => item.trim())
        .filter((item) => ALL_FEATURE_KEYS.has(item)),
      services: Array.from(new Set(payload.features.services ?? []))
        .map((item) => item.trim())
        .filter((item) => ALL_FEATURE_KEYS.has(item)),
      atmosphere: Array.from(new Set(payload.features.atmosphere ?? []))
        .map((item) => item.trim())
        .filter((item) => ALL_FEATURE_KEYS.has(item)),
    }

    const specialLinksPayload = payload.specialLinks ?? {}
    const fromBusinessPayload = payload.fromTheBusiness ?? []
    const additionalCategoriesPayload = payload.additionalCategories ?? []

    const normalizedProfile: BusinessProfile = {
      id: payload.id,
      locationResourceId: payload.locationResourceId,
      locationName: payload.locationName.trim(),
      description: payload.description,
      shortDescription: payload.shortDescription,
      phone: sanitizePhone(payload.phone),
      website: sanitizeWebsite(payload.website),
      primaryCategory: payload.primaryCategory.trim(),
      additionalCategories: Array.from(new Set(additionalCategoriesPayload.map((item) => item.trim()))),
      features: normalizedFeatureSelection,
      specialLinks: {
        menu: specialLinksPayload.menu ? sanitizeWebsite(specialLinksPayload.menu) : null,
        booking: specialLinksPayload.booking ? sanitizeWebsite(specialLinksPayload.booking) : null,
        order: specialLinksPayload.order ? sanitizeWebsite(specialLinksPayload.order) : null,
        appointment: specialLinksPayload.appointment ? sanitizeWebsite(specialLinksPayload.appointment) : null,
      },
      fromTheBusiness: Array.from(new Set(fromBusinessPayload.map((item) => item.trim()))),
      openingDate: payload.openingDate ?? null,
      serviceAreaEnabled: payload.serviceAreaEnabled,
      profileCompleteness: payload.profileCompleteness,
    }

    const completeness = computeCompleteness(normalizedProfile)
    const updatedMetadata = mergeMetadata(currentRow.metadata, { ...normalizedProfile, profileCompleteness: completeness.score }, completeness)

    const updatePayload: Record<string, any> = {
      metadata: updatedMetadata,
      updated_at: new Date().toISOString(),
      profile_completeness: completeness.score,
    }

    if ('location_name' in currentRow) updatePayload.location_name = normalizedProfile.locationName
    if ('description' in currentRow) updatePayload.description = normalizedProfile.description
    if ('short_description' in currentRow) updatePayload.short_description = normalizedProfile.shortDescription
    if ('phone' in currentRow) updatePayload.phone = normalizedProfile.phone
    if ('website' in currentRow) updatePayload.website = normalizedProfile.website
    if ('category' in currentRow) updatePayload.category = normalizedProfile.primaryCategory
    if ('additional_categories' in currentRow) updatePayload.additional_categories = normalizedProfile.additionalCategories
    if ('from_the_business' in currentRow) updatePayload.from_the_business = normalizedProfile.fromTheBusiness
    if ('service_area_enabled' in currentRow) updatePayload.service_area_enabled = normalizedProfile.serviceAreaEnabled
    if ('opening_date' in currentRow) updatePayload.opening_date = normalizedProfile.openingDate

    if ('menu_url' in currentRow) updatePayload.menu_url = normalizedProfile.specialLinks.menu ?? null
    if ('booking_url' in currentRow) updatePayload.booking_url = normalizedProfile.specialLinks.booking ?? null
    if ('order_url' in currentRow) updatePayload.order_url = normalizedProfile.specialLinks.order ?? null
    if ('appointment_url' in currentRow) updatePayload.appointment_url = normalizedProfile.specialLinks.appointment ?? null

    const { error: updateError } = await supabase
      .from('gmb_locations')
      .update(updatePayload)
      .eq('id', locationId)
      .eq('user_id', user.id)

    if (updateError) {
      throw new Error(updateError.message || 'Failed to update location profile')
    }

    const updatedRow = await getAuthorizedLocation(supabase, user.id, locationId)
    const profileResponse = normalizeBusinessProfile(updatedRow)

    return NextResponse.json(profileResponse)
  } catch (error: unknown) {
    const isError = error instanceof Error
    const message = isError ? error.message : 'Internal server error'
    const status = message === 'Location not found' ? 404 : 500
    console.error('[PUT /api/features/profile/:locationId] Error', { message, status, error })
    return NextResponse.json({ error: message }, { status })
  }
}
