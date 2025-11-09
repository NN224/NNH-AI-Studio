import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { errorResponse, successResponse } from "@/lib/utils/api-response"
import { getValidAccessToken, GMB_CONSTANTS } from "@/lib/gmb/helpers"

export const dynamic = "force-dynamic"

const BUSINESS_INFORMATION_BASE = GMB_CONSTANTS.BUSINESS_INFORMATION_BASE

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse("UNAUTHORIZED", "Authentication required", 401)
    }

    const searchParams = request.nextUrl.searchParams
    const categoryName = searchParams.get("categoryName")
    const regionCode = searchParams.get("regionCode") || searchParams.get("country") || undefined
    const languageCode = searchParams.get("languageCode") || undefined

    if (!categoryName) {
      return errorResponse("BAD_REQUEST", "categoryName is required", 400)
    }

    const { data: account, error: accountError } = await supabase
      .from("gmb_accounts")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (accountError) {
      console.error("[Attributes API] Failed to load Google account:", accountError)
      return errorResponse("DATABASE_ERROR", "Failed to load Google account", 500, accountError)
    }

    if (!account) {
      return successResponse({
        attributeDefinitions: [],
        message: "No active Google account connected",
      })
    }

    const accessToken = await getValidAccessToken(supabase, account.id)

    const url = new URL(`${BUSINESS_INFORMATION_BASE}/categories/${categoryName}`)
    url.searchParams.set("readMask", "attributeDefinitions")
    if (regionCode) {
      url.searchParams.set("regionCode", regionCode)
    }
    if (languageCode) {
      url.searchParams.set("languageCode", languageCode)
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "")
      let errorData: any = {}
      try {
        errorData = errorText ? JSON.parse(errorText) : {}
      } catch {
        errorData = { message: errorText }
      }

      if (response.status === 404) {
        return successResponse({
          attributeDefinitions: [],
          message: "No attribute definitions found for provided category",
        })
      }

      if (response.status === 401) {
        return errorResponse(
          "AUTH_EXPIRED",
          "Authentication expired. Please reconnect your Google account.",
          401,
          errorData
        )
      }

      return errorResponse(
        "GOOGLE_API_ERROR",
        errorData.error?.message || errorData.message || "Failed to fetch attribute definitions",
        response.status,
        errorData
      )
    }

    const data = await response.json()
    const attributeDefinitions = Array.isArray(data.attributeDefinitions)
      ? data.attributeDefinitions
      : []

    return successResponse({
      attributeDefinitions,
      category: data.displayName || categoryName,
      regionCode: regionCode || null,
      languageCode: languageCode || null,
    })
  } catch (error: any) {
    console.error("[Attributes API] Error:", {
      message: error?.message || "Unknown error",
      stack: error?.stack,
      error,
    })

    return errorResponse(
      "INTERNAL_ERROR",
      error?.message || "Failed to fetch attribute definitions",
      500
    )
  }
}

