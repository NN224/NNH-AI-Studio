"use server"

import { createClient } from "@/lib/supabase/server"
import { getValidAccessToken, buildLocationResourceName, GMB_CONSTANTS } from "@/lib/gmb/helpers"
import type { LocationData, ReviewData, QuestionData } from "@/lib/gmb/sync-types"
import { runSyncTransactionWithRetry } from "@/lib/supabase/transactions"
import { CacheBucket, refreshCache } from "@/lib/cache/cache-manager"

const GBP_LOC_BASE = GMB_CONSTANTS.GBP_LOC_BASE
const REVIEWS_BASE = GMB_CONSTANTS.GMB_V4_BASE
const QANDA_BASE = GMB_CONSTANTS.QANDA_BASE

function mapStarRating(value?: string | number | null) {
  if (typeof value === "number") {
    return value
  }

  const starMap: Record<string, number> = {
    STAR_ONE: 1,
    STAR_TWO: 2,
    STAR_THREE: 3,
    STAR_FOUR: 4,
    STAR_FIVE: 5,
    STAR_ZERO: 0,
  }

  if (value && typeof value === "string" && starMap[value.toUpperCase()]) {
    return starMap[value.toUpperCase()]
  }

  if (typeof value === "string") {
    const match = value.match(/(\d)/)
    if (match) {
      return Number(match[1])
    }
  }

  return 0
}

function resolveLocationResource(accountResource: string, googleLocationId: string) {
  if (!googleLocationId) return null
  if (googleLocationId.startsWith("accounts/")) {
    return googleLocationId
  }

  return buildLocationResourceName(accountResource.replace(/^accounts\//, ""), googleLocationId)
}

function formatAddress(address?: Record<string, any> | null) {
  if (!address) return null
  const segments = [
    Array.isArray(address.addressLines) ? address.addressLines.join(", ") : "",
    address.locality,
    address.administrativeArea,
    address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .join(", ")

  return segments || null
}

export async function fetchLocationsDataForSync(
  accountResource: string,
  gmbAccountId: string,
  userId: string,
  accessToken: string
): Promise<LocationData[]> {
  const locations: LocationData[] = []
  let nextPageToken: string | undefined
  const nowIso = new Date().toISOString()

  console.time("[GMB Sync v2] fetchLocations")

  do {
    const url = new URL(`${GBP_LOC_BASE}/${accountResource}/locations`)
    url.searchParams.set(
      "readMask",
      "name,title,storefrontAddress,phoneNumbers,websiteUri,categories,profile,regularHours,specialHours,moreHours,serviceItems,openInfo,metadata,latlng,labels"
    )
    url.searchParams.set("pageSize", "100")
    url.searchParams.set("alt", "json")
    if (nextPageToken) {
      url.searchParams.set("pageToken", nextPageToken)
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData?.error?.message || "Failed to fetch locations from Google")
    }

    const payload = await response.json()
    const googleLocations = payload.locations || []

    for (const rawLocation of googleLocations) {
      const googleLocationId = rawLocation.name
      if (!googleLocationId) continue

      const normalized = googleLocationId.replace(/[^a-zA-Z0-9]/g, "_")
      const address = formatAddress(rawLocation.storefrontAddress)
      const phone = rawLocation.phoneNumbers?.primaryPhone || rawLocation.phoneNumbers?.additionalPhones?.[0] || null
      const category = rawLocation.categories?.primaryCategory?.displayName || null
      const rating = rawLocation.metadata?.starRating ?? rawLocation.profile?.overallStarRating ?? null
      const reviewCount = rawLocation.metadata?.totalReviewCount ?? rawLocation.profile?.reviewCount ?? null
      const latitude = rawLocation.latlng?.latitude ?? null
      const longitude = rawLocation.latlng?.longitude ?? null
      const profileCompleteness = rawLocation.metadata?.profileCompleteness ?? null
      const isActive = rawLocation.openInfo?.status !== "CLOSED_PERMANENTLY"
      const status = rawLocation.openInfo?.status || rawLocation.metadata?.status || null

      locations.push({
        gmb_account_id: gmbAccountId,
        user_id: userId,
        location_id: googleLocationId,
        normalized_location_id: normalized,
        location_name: rawLocation.title || "Untitled Location",
        address,
        phone,
        website: rawLocation.websiteUri || null,
        category,
        rating,
        review_count: reviewCount,
        latitude,
        longitude,
        profile_completeness: profileCompleteness,
        is_active: isActive,
        status,
        metadata: rawLocation,
        last_synced_at: nowIso,
      })
    }

    nextPageToken = payload.nextPageToken
  } while (nextPageToken)

  console.timeEnd("[GMB Sync v2] fetchLocations")
  return locations
}

export async function fetchReviewsDataForSync(
  locations: LocationData[],
  accountResource: string,
  gmbAccountId: string,
  userId: string,
  accessToken: string
): Promise<ReviewData[]> {
  const reviews: ReviewData[] = []
  console.time("[GMB Sync v2] fetchReviews")

  for (const location of locations) {
    const locationResource = resolveLocationResource(accountResource, location.location_id)
    if (!locationResource) continue

    let nextPageToken: string | undefined
    do {
      const url = new URL(`${REVIEWS_BASE}/${locationResource}/reviews`)
      url.searchParams.set("pageSize", "50")
      if (nextPageToken) {
        url.searchParams.set("pageToken", nextPageToken)
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.warn("[GMB Sync v2] Reviews fetch failed", {
          location: location.location_id,
          error: errorData,
        })
        break
      }

      const payload = await response.json()
      const googleReviews = payload.reviews || []

      for (const review of googleReviews) {
        const reviewId = review.reviewId || review.name?.split("/").pop()
        if (!reviewId) continue

        reviews.push({
          user_id: userId,
          location_id: undefined,
          google_location_id: location.location_id,
          gmb_account_id: gmbAccountId,
          review_id: reviewId,
          reviewer_name: review.reviewer?.displayName || "Anonymous",
          reviewer_display_name: review.reviewer?.displayName || null,
          reviewer_photo: review.reviewer?.profilePhotoUrl || null,
          rating: mapStarRating(review.starRating),
          review_text: review.comment || null,
          review_date: review.createTime || new Date().toISOString(),
          reply_text: review.reviewReply?.comment || null,
          reply_date: review.reviewReply?.updateTime || null,
          has_reply: Boolean(review.reviewReply),
          status: review.reviewReply ? "responded" : "pending",
          sentiment: review.commentSummary?.positiveRatio
            ? review.commentSummary.positiveRatio > 0.5
              ? "positive"
              : "neutral"
            : null,
          google_name: review.name || null,
          review_url: null,
        })
      }

      nextPageToken = payload.nextPageToken
    } while (nextPageToken)
  }

  console.timeEnd("[GMB Sync v2] fetchReviews")
  return reviews
}

export async function fetchQuestionsDataForSync(
  locations: LocationData[],
  accountResource: string,
  gmbAccountId: string,
  userId: string,
  accessToken: string
): Promise<QuestionData[]> {
  const questions: QuestionData[] = []
  console.time("[GMB Sync v2] fetchQuestions")

  for (const location of locations) {
    const locationResource = resolveLocationResource(accountResource, location.location_id)
    if (!locationResource) continue

    const endpoint = `${QANDA_BASE}/${locationResource}/questions`
    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.warn("[GMB Sync v2] Questions fetch failed", {
        location: location.location_id,
        error: errorData,
      })
      continue
    }

    const payload = await response.json()
    const googleQuestions = payload.questions || []

    for (const question of googleQuestions) {
      const questionId = question.name?.split("/").pop()
      if (!questionId) continue

      const topAnswer = question.topAnswers?.[0] || null
      const status = topAnswer?.text ? "answered" : "unanswered"

      questions.push({
        user_id: userId,
        location_id: undefined,
        google_location_id: location.location_id,
        gmb_account_id: gmbAccountId,
        question_id: questionId,
        author_name: question.author?.displayName || "Anonymous",
        author_display_name: question.author?.displayName || null,
        author_profile_photo_url: question.author?.profilePhotoUrl || null,
        author_type: question.author?.type || "CUSTOMER",
        question_text: question.text || "",
        question_date: question.createTime || new Date().toISOString(),
        answer_text: topAnswer?.text || null,
        answer_date: topAnswer?.updateTime || null,
        answer_author: topAnswer?.author?.displayName || null,
        answer_id: topAnswer?.name?.split("/").pop() || null,
        upvote_count: question.upvoteCount || 0,
        total_answer_count: question.totalAnswerCount || 0,
        status,
        google_resource_name: question.name || null,
      })
    }
  }

  console.timeEnd("[GMB Sync v2] fetchQuestions")
  return questions
}

export async function performTransactionalSync(accountId: string, includeQuestions = true) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error("Not authenticated")
  }

  const { data: account, error: accountError } = await supabase
    .from("gmb_accounts")
    .select("id, user_id, account_id")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .single()

  if (accountError || !account) {
    throw new Error("GMB account not found")
  }

  const accessToken = await getValidAccessToken(supabase, accountId)

  const locations = await fetchLocationsDataForSync(account.account_id, accountId, user.id, accessToken)
  const reviews = await fetchReviewsDataForSync(locations, account.account_id, accountId, user.id, accessToken)
  const questions = includeQuestions
    ? await fetchQuestionsDataForSync(locations, account.account_id, accountId, user.id, accessToken)
    : []

  const transactionResult = await runSyncTransactionWithRetry(
    supabase,
    {
      accountId,
      locations,
      reviews,
      questions,
    },
    3
  )

  await refreshCache(CacheBucket.DASHBOARD_OVERVIEW, user.id)

  return {
    success: true,
    ...transactionResult,
  }
}

