"use server"

import { createClient } from "@/lib/supabase/server"

export async function getDashboardStats() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    console.error("Authentication error:", authError)
    throw new Error("Not authenticated")
  }

  // Fetch locations with error handling
  const { data: locations, error: locationsError } = await supabase
    .from("gmb_locations")
    .select("*")
    .eq("user_id", user.id)

  if (locationsError) {
    console.error("Failed to fetch locations:", locationsError)
    throw new Error(`Database error: ${locationsError.message}`)
  }

  // Fetch reviews with error handling
  const { data: reviews, error: reviewsError } = await supabase
    .from("gmb_reviews")
    .select("*")
    .eq("user_id", user.id)

  if (reviewsError) {
    console.error("Failed to fetch reviews:", reviewsError)
    throw new Error(`Database error: ${reviewsError.message}`)
  }

  const totalLocations = locations?.length || 0
  const totalReviews = reviews?.length || 0
  const averageRating =
    reviews && reviews.length > 0 
      ? (reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length).toFixed(1)
      : "0.0"

  const respondedReviews = reviews?.filter((r) => r.status === "responded").length || 0
  const responseRate = totalReviews > 0 ? Math.round((respondedReviews / totalReviews) * 100) : 0

  return {
    totalLocations,
    totalReviews,
    averageRating,
    responseRate,
  }
}

export async function getActivityLogs(limit: number = 10) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { activities: [], error: "Not authenticated" }
  }

  const { data, error } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    return { activities: [], error: error.message }
  }

  return { activities: data || [], error: null }
}

export async function getMonthlyStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { data: [], error: "Not authenticated" }
  }

  // Get reviews from last 6 months
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const { data: reviews, error } = await supabase
    .from("gmb_reviews")
    .select("rating, created_at")
    .eq("user_id", user.id)
    .gte("created_at", sixMonthsAgo.toISOString())
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Failed to fetch monthly stats:", error)
    return { data: [], error: error.message }
  }

  // Group reviews by month
  const monthlyData: Record<string, { total: number; sum: number; count: number }> = {}
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  
  reviews?.forEach((review) => {
    const date = new Date(review.created_at)
    const monthKey = `${months[date.getMonth()]} ${date.getFullYear()}`
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { total: 0, sum: 0, count: 0 }
    }
    
    monthlyData[monthKey].count += 1
    monthlyData[monthKey].sum += review.rating || 0
  })

  // Convert to chart format
  const chartData = Object.entries(monthlyData)
    .map(([month, data]) => ({
      month: month.split(' ')[0], // Get just the month name
      rating: data.count > 0 ? Number((data.sum / data.count).toFixed(1)) : 0,
      reviews: data.count
    }))
    .slice(-6) // Last 6 months only

  // If no data, return empty array instead of mock data
  if (chartData.length === 0) {
    return { 
      data: [], 
      error: null,
      message: "No reviews found in the last 6 months"
    }
  }

  return { data: chartData, error: null }
}
